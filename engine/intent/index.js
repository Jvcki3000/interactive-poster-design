// intent — Intent Interpreter（首次使用 UX 的"翻译层"）：用户意图（Mood/自然语言）→ 定向 Design DNA 变异
// 用户永远不需要看到 DNA；本模块把"感觉词/一句话反馈"翻译成受控变异。
import { mutateDna, getDnaPreset } from '../design-dna/dna-presets.js';

function clone(o) { return JSON.parse(JSON.stringify(o)); }

// ---- Mood → DNA delta ----
const MOOD_MAP = {
  RAW: { 'materiality.imperfection': 0.3, 'design_tension.precision_vs_imperfection': 0.25, 'materiality.physicality': 0.15 },
  REFINED: { 'design_tension.precision_vs_imperfection': -0.2, 'negative_space.amount': 0.15 },
  LOUD: { 'visual_hierarchy.hierarchy_strength': 0.1, 'visual_hierarchy.scale_contrast': 0.15, 'density.overall': 0.2, 'density.text': 0.15, 'color.contrast': 0.15 },
  QUIET: { 'density.overall': -0.15, 'negative_space.amount': 0.2, 'color.contrast': -0.05 },
  DENSE: { 'density.overall': 0.25, 'density.text': 0.2 },
  SPARSE: { 'negative_space.amount': 0.25, 'density.overall': -0.25 },
  PLAYFUL: { 'design_tension.order_vs_chaos': 0.15, 'color.saturation': 0.1 },
  SERIOUS: { 'design_tension.order_vs_chaos': -0.15, 'design_tension.legibility_vs_expression': 0.15 },
  CHAOTIC: { 'design_tension.order_vs_chaos': 0.3, 'composition.edge_tension': 0.2 },
  PRECISE: { 'design_tension.order_vs_chaos': -0.25, 'design_tension.precision_vs_imperfection': -0.2 },
  DIGITAL: { 'design_tension.digital_vs_physical': -0.2, 'materiality.physicality': -0.1 },
  PHYSICAL: { 'design_tension.digital_vs_physical': 0.3, 'materiality.physicality': 0.25, 'texture.presence': 0.2, 'materiality.imperfection': 0.15 },
  EDITORIAL: { 'density.text': 0.2, 'visual_hierarchy.hierarchy_strength': 0.1, '_typography.category': 'mixed' },
  EXPERIMENTAL: { 'design_tension.order_vs_chaos': 0.2, 'typography.distortion': 0.2, 'design_tension.legibility_vs_expression': -0.15 },
  CINEMATIC: { 'texture.presence': 0.15, '_depth.mode': 'photographic', '_motion.style': 'cinematic', 'motion.enabled': true },
  INTIMATE: { 'negative_space.amount': 0.1, 'visual_hierarchy.scale_contrast': -0.05 },
};

// ---- 自然语言反馈 → DNA delta ----
const FEEDBACK_RULES = [
  { re: /(标题|title).{0,6}(太小|太小了|小|too small|smaller)/i, delta: { '_typography.scale': 'oversized', 'visual_hierarchy.scale_contrast': 0.15 }, note: '放大标题' },
  { re: /(标题|title).{0,6}(太大|太大|big|huge)/i, delta: { '_typography.scale': 'large', 'visual_hierarchy.scale_contrast': -0.1 }, note: '缩小标题' },
  { re: /(科技|创业|tech|startup|硅谷|silicon)/i, delta: { 'design_tension.digital_vs_physical': -0.3, 'materiality.physicality': 0.2, '_graphic_language.elements': ['line', 'frame'], '_graphic_language.symbolism': 'functional' }, note: '降低数字感/科技感' },
  { re: /(杂志|独立刊物|independent magazine|editorial|zine)/i, delta: { 'density.text': 0.15, '_typography.category': 'mixed', '_graphic_language.elements': ['line', 'frame', 'number'] }, note: '更像杂志编辑风' },
  { re: /(人物|主体|person|subject|figure).{0,8}(太抢眼|太突出|太dominant|dominant|too strong)/i, delta: { '_visual_hierarchy.primary': 'title', 'visual_hierarchy.scale_contrast': 0.1 }, note: '弱化主体、强化标题' },
  { re: /(更怪|再怪|怪一点|stranger|weird|strange|更意外|unexpected)/i, delta: { 'design_tension.order_vs_chaos': 0.2, 'typography.distortion': 0.15, 'color.saturation': 0.1 }, note: '增加意外/怪诞' },
  { re: /(更物理|更有质感|更印刷|physical|print|grain|质感)/i, delta: { 'design_tension.digital_vs_physical': 0.25, 'materiality.physicality': 0.2, 'texture.presence': 0.2, 'materiality.imperfection': 0.15 }, note: '更物理/印刷质感' },
  { re: /(更实验|更先锋|experimental|avant)/i, delta: { 'design_tension.order_vs_chaos': 0.2, 'typography.distortion': 0.2 }, note: '更实验' },
  { re: /(更多留白|留白|sparse|whitespace|呼吸感|干净一点)/i, delta: { 'negative_space.amount': 0.25, 'density.overall': -0.2 }, note: '更多留白' },
  { re: /(更高对比|对比|contrast|更强)/i, delta: { 'color.contrast': 0.15, 'visual_hierarchy.scale_contrast': 0.1 }, note: '提高对比' },
  { re: /(更电影|电影感|cinematic|film)/i, delta: { '_depth.mode': 'photographic', 'texture.presence': 0.15, '_motion.style': 'cinematic' }, note: '更电影感' },
  { re: /(更安静|安静|quieter|calm|柔和)/i, delta: { 'density.overall': -0.15, 'negative_space.amount': 0.2 }, note: '更安静' },
  { re: /(更大胆|更吵|loud|bold|更强|更有力)/i, delta: { 'visual_hierarchy.scale_contrast': 0.15, 'density.overall': 0.15, 'color.contrast': 0.1 }, note: '更有力/更大胆' },
  { re: /(更精致|精致|refined|elegant|高级)/i, delta: { 'design_tension.precision_vs_imperfection': -0.2, 'negative_space.amount': 0.15 }, note: '更精致' },
];

function clamp01(v) { return Math.max(0, Math.min(1, Math.round(v * 100) / 100)); }

/** 把 Mood 词（2-3 个）翻译成 DNA delta */
export function interpretMood(moods = []) {
  const delta = {};
  for (const m of moods) {
    const map = MOOD_MAP[String(m).toUpperCase()];
    if (!map) continue;
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'number') delta[k] = (delta[k] || 0) + v; // 保留负值（降低），最终由 applyDelta clamp 到 0..1
      else delta[k] = v; // 字符串/布尔 set
    }
  }
  return delta;
}

/** 把一句自然语言反馈翻译成 DNA delta（命中第一条规则） */
export function interpretFeedback(text = '') {
  const t = String(text || '');
  for (const r of FEEDBACK_RULES) {
    if (r.re.test(t)) return { delta: r.delta, note: r.note };
  }
  // 默认：轻微增加张力，避免无变化
  return { delta: { 'design_tension.order_vs_chaos': 0.1 }, note: '微调张力（未识别具体意图）' };
}

function setPath(d, path, value) {
  const parts = path.replace(/^_/, '').split('.');
  let o = d;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
    o = o[parts[i]];
  }
  const key = parts[parts.length - 1];
  const cur = o[key];
  if (typeof value === 'number' && typeof cur === 'number') o[key] = clamp01(cur + value);
  else o[key] = value;
  return d;
}

/** 把 delta 应用到 DNA（克隆后变异，数值叠加并夹取 0..1，字符串/布尔直接 set） */
export function applyDelta(dna, delta = {}) {
  const out = clone(dna && dna.design_vocabulary ? dna.design_vocabulary : dna);
  for (const [k, v] of Object.entries(delta)) setPath(out, k, v);
  return { design_vocabulary: out };
}

/** 首次会话数据模型（FIRST_TIME_UX §16）——用户意图与 Design DNA 分离存储 */
export function createFirstTimeSession(brief = {}) {
  return {
    session_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    is_first_time: true,
    brief: { description: brief.description || '', category: brief.category || '', title: brief.title || '', date: brief.date || '', location: brief.location || '' },
    mood: [],
    directions: [],
    selected_direction: null,
    refinements: [],
    current_design_dna: null,
    poster_versions: [],
    current_version: null,
  };
}

/** 给方向起概念名（而非技术名） */
const NAME_POOL = [
  ['Concrete Noise', 'Brutalist · Typography-led · High tension'],
  ['After Midnight', 'Cinematic · Photographic · Atmospheric'],
  ['Printed Chaos', 'Xerox · Experimental type · Physical texture'],
  ['Quiet Frame', 'Minimal · Editorial · Negative space'],
  ['Signal Bleed', 'Neon · Kinetic · Loud'],
  ['Raw Pulse', 'Underground · Xerox · Chaotic'],
  ['Cold Structure', 'Grid · Swiss · Precise'],
  ['Warm Gesture', 'Humanist · Organic · Intimate'],
];
export function conceptualName(i) { return NAME_POOL[i % NAME_POOL.length]; }

export default { interpretMood, interpretFeedback, applyDelta, createFirstTimeSession, conceptualName };
