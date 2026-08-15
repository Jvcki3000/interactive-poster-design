// dna — Design DNA 校验 + 兼容规则检查（零依赖，读取同目录 schema/compatibility）
import { readFileSync } from 'node:fs';
import { dnaAestheticRisk } from '../color/anti-ai.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA = JSON.parse(readFileSync(join(HERE, '..', '..', 'schema', 'design-vocabulary.schema.json'), 'utf8'));
export const COMPAT = JSON.parse(readFileSync(join(HERE, '..', '..', 'schema', 'compatibility.json'), 'utf8'));

/** 取 DNA 对象（支持裸 DNA 或 {design_vocabulary: {...}} 两种形态） */
export function unwrap(dna) {
  if (dna && typeof dna === 'object' && dna.design_vocabulary && typeof dna.design_vocabulary === 'object') return dna.design_vocabulary;
  return dna;
}

/** 从 schema 提取属性约束（不完整 JSON Schema，覆盖本 schema 用到的子集） */
function schemaFor() {
  const root = SCHEMA.properties && SCHEMA.properties.design_vocabulary;
  return (root && root.properties) || {};
}

function validateNode(value, schema, path, errors) {
  if (!schema) return;
  if (value === null || value === undefined) return; // 可选字段
  // 枚举优先（本 schema 的枚举字段常不带 type）
  if (Array.isArray(schema.enum)) {
    if (typeof value === 'string' && !schema.enum.includes(value)) {
      errors.push(path + ': "' + value + '" 不在枚举 [' + schema.enum.slice(0, 8).join(', ') + (schema.enum.length > 8 ? ', …' : '') + ']');
    }
    return;
  }
  const t = schema.type;
  if (t === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) { errors.push(path + ': 期望 object'); return; }
    const props = schema.properties || {};
    for (const k of Object.keys(value)) if (props[k]) validateNode(value[k], props[k], path + '.' + k, errors);
    return;
  }
  if (t === 'number' || t === 'integer') {
    if (typeof value !== 'number' || Number.isNaN(value)) { errors.push(path + ': 期望数字'); return; }
    if (t === 'integer' && !Number.isInteger(value)) errors.push(path + ': 期望整数');
    if (schema.minimum != null && value < schema.minimum) errors.push(path + ': ' + value + ' 小于最小值 ' + schema.minimum);
    if (schema.maximum != null && value > schema.maximum) errors.push(path + ': ' + value + ' 大于最大值 ' + schema.maximum);
    return;
  }
  if (t === 'boolean') { if (typeof value !== 'boolean') errors.push(path + ': 期望布尔'); return; }
  if (t === 'string') {
    if (typeof value !== 'string') { errors.push(path + ': 期望字符串'); return; }
    if (schema.pattern) { try { if (!new RegExp(schema.pattern).test(value)) errors.push(path + ': "' + value + '" 不符合格式 ' + schema.pattern); } catch (e) { /* ignore */ } }
    return;
  }
  if (t === 'array') {
    if (!Array.isArray(value)) { errors.push(path + ': 期望数组'); return; }
    const items = schema.items || {};
    if (items.enum) value.forEach((v, i) => { if (!items.enum.includes(v)) errors.push(path + '[' + i + ']: "' + v + '" 不在枚举'); });
    else if (items.type === 'string') value.forEach((v, i) => { if (typeof v !== 'string') errors.push(path + '[' + i + ']: 期望字符串'); else if (items.pattern) { try { if (!new RegExp(items.pattern).test(v)) errors.push(path + '[' + i + ']: "' + v + '" 不符合格式 ' + items.pattern); } catch (e) { /* ignore */ } } });
    return;
  }
}

/** 校验 Design DNA，返回 { ok, errors, counts } */
export function validateDna(dna) {
  const d = unwrap(dna);
  const errors = [];
  const schema = schemaFor();
  if (!d || typeof d !== 'object') { return { ok: false, errors: ['design_vocabulary 必须是对象'], counts: {} }; }
  const movements = d.design_movements;
  if (!Array.isArray(movements) || movements.length === 0) errors.push('design_vocabulary.design_movements: 至少选择一个设计运动（如 swiss_international）');
  for (const k of Object.keys(d)) if (schema[k]) validateNode(d[k], schema[k], 'design_vocabulary.' + k, errors);
  return { ok: errors.length === 0, errors, counts: { fields: Object.keys(d).length, movements: Array.isArray(movements) ? movements.length : 0 } };
}

function getPath(d, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
}

function matchList(actual, want) {
  if (actual == null) return null; // 未提供 → 不判定
  if (Array.isArray(actual)) {
    // 实际是数组字段（如 alignment / elements）：全部命中允许值才算满足
    if (!Array.isArray(want)) return actual.includes(want);
    return actual.every((v) => want.includes(v));
  }
  if (Array.isArray(want)) {
    if (want.length === 2 && typeof want[0] === 'number' && typeof want[1] === 'number') {
      return actual >= want[0] && actual <= want[1];
    }
    return want.includes(actual);
  }
  if (typeof want === 'boolean') return actual === want;
  if (typeof want === 'number') return actual === want;
  return false;
}

function whenMatches(d, when) {
  if (!when || typeof when !== 'object') return true;
  return Object.entries(when).every(([path, want]) => {
    if (path === 'design_movements') {
      const movements = (d && Array.isArray(d.design_movements)) ? d.design_movements : [];
      return (Array.isArray(want) ? want : [want]).some((m) => movements.includes(m));
    }
    const v = getPath(d, path);
    if (v == null) return false;
    const ok = matchList(v, want);
    return ok === true;
  });
}

/** 兼容规则检查：返回 { matched: [{id, prefer:[...], avoid:[...]}], aiRisk } */
export function checkCompatibility(dna) {
  const d = unwrap(dna);
  const rules = (COMPAT.rules || []).filter((r) => whenMatches(d, r.when));
  const matched = rules.map((r) => {
    const prefer = [];
    const avoid = [];
    if (r.prefer) for (const [p, want] of Object.entries(r.prefer)) {
      const v = getPath(d, p);
      const ok = matchList(v, want);
      if (ok !== null) prefer.push({ path: p, value: v, want, satisfied: ok });
    }
    if (r.avoid) for (const [p, want] of Object.entries(r.avoid)) {
      const v = getPath(d, p);
      const bad = matchList(v, want);
      if (bad !== null) avoid.push({ path: p, value: v, want, violated: bad });
    }
    return { id: r.id, prefer, avoid, violatedCount: avoid.filter((x) => x.violated).length };
  });
  return { matched, totalRules: COMPAT.rules ? COMPAT.rules.length : 0, aiRisk: aiRiskScore(d) };
}

function hexHue(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return null;
  let h;
  if (max === r) h = 60 * ((g - b) / (max - min));
  else if (max === g) h = 60 * (2 + (b - r) / (max - min));
  else h = 60 * (4 + (r - g) / (max - min));
  return h < 0 ? h + 360 : h;
}

/** 反 AI 审美风险 0..1（紫/青/粉、渐变、粒子、噪点、居中构图等） */
/** 反 AI 审美风险 0..1（规则源已统一到 anti-ai，见 dnaAestheticRisk） */
export function aiRiskScore(dna) {
  return dnaAestheticRisk(dna);
}

/** 输出一份可填写的 DNA 模板（示例结构） */
export function templateDna() {
  return {
    design_vocabulary: {
      design_movements: ['swiss_international'],
      composition: { structure: 'asymmetric', orientation: 'portrait', focal_point: 'upper_left', visual_axis: 'diagonal', balance: 'dynamic', symmetry: 0.2, edge_tension: 0.7, cropping: 'moderate', layering: 'shallow', overlap: 0.3, alignment: ['left_edge'] },
      grid: { type: '12_column', columns: 12, rows: 8, gutter: 'medium', margin: 'tight', baseline_grid: true, alignment_mode: 'mixed', grid_visibility: 0, break_grid: 0.4 },
      visual_hierarchy: { primary: 'title', secondary: 'date', tertiary: 'graphic', reading_direction: 'top_to_bottom', hierarchy_strength: 0.8, scale_contrast: 0.75, weight_contrast: 0.6 },
      typography: { category: 'neo_grotesk', width: 'condensed', weight: 'bold', contrast: 'low', case: 'uppercase', tracking: 'tight', leading: 'tight', scale: 'large', alignment: 'left', orientation: 'horizontal', distortion: 0.1, cropping: 0.2, layering: 'isolated', variable_font: false },
      color: { strategy: 'black_and_accent', temperature: 'neutral', saturation: 0.4, contrast: 0.85, brightness: 0.4, dominant_ratio: 0.8, accent_ratio: 0.08, accent_count: 1, gradient: false, palette: ['#111111', '#E8E5DC', '#FF3B30'] },
      imagery: { source: 'typography_only', scale: 'medium', treatment: 'raw', contrast: 'medium', depth: 'flat', color_treatment: 'monochrome' },
      graphic_language: { elements: ['line', 'number'], shape_language: 'geometric', line_weight: 'medium', corner_style: 'sharp', repetition: 0.3, pattern: 'none', symbolism: 'functional' },
      texture: { presence: 0.1, type: ['paper'], scale: 'fine', contrast: 0.2, uniformity: 0.9 },
      depth: { mode: 'flat', layers: 2, perspective: 0, parallax: 0, blur_depth: 0, foreground_ratio: 0.3 },
      motion: { enabled: false, style: 'static', intensity: 0, speed: 'medium', direction: 'none', loop: false, easing: 'ease_in_out', elements: [] },
      interaction: { enabled: true, primary: 'hover', secondary: ['click'], intensity: 0.3, responsiveness: 0.7, discoverability: 0.6 },
      density: { overall: 0.4, text: 0.4, image: 0.1, graphic: 0.3, information: 0.4 },
      negative_space: { amount: 0.6, distribution: 'asymmetric', location: 'upper_left', tension: 0.4 },
      materiality: { medium: 'digital', physicality: 0.2, imperfection: 0.1, surface: 'matte', printing_process: 'none' },
      branding: { logo_prominence: 0.3, brand_color_strictness: 0.6, system_consistency: 0.7 },
      design_tension: { order_vs_chaos: 0.4, precision_vs_imperfection: 0.3, minimalism_vs_density: 0.3, static_vs_dynamic: 0.3, legibility_vs_expression: 0.5, digital_vs_physical: 0.2 },
      constraints: { avoid: ['gradient'], must_include: ['title'], max_gradients: 0, max_accent_colors: 2, max_interaction_layers: 2 },
    },
  };
}

export default { validateDna, checkCompatibility, aiRiskScore, templateDna, unwrap, SCHEMA, COMPAT };
