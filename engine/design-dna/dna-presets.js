// dna-presets — Design DNA 预设库：列表 / 合并 / 挑选 / 变异（零依赖）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DNA_PRESETS = JSON.parse(readFileSync(join(HERE, '..', '..', 'presets', 'design-presets.json'), 'utf8'));

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
function mergeDeep(base, over) {
  const out = clone(base);
  for (const [k, v] of Object.entries(over || {})) {
    if (isObj(v) && isObj(out[k])) out[k] = mergeDeep(out[k], v);
    else out[k] = clone(v);
  }
  return out;
}

/** 预设列表：{key, name, description, tags, movements} */
export function listDnaPresets() {
  return (DNA_PRESETS.presets || []).map((p) => ({
    key: p.key, name: p.name, description: p.description, tags: p.tags || [],
    movements: (p.dna && p.dna.design_movements) || [],
  }));
}

export function getDnaPreset(key) {
  const p = (DNA_PRESETS.presets || []).find((x) => x.key === key);
  if (!p) return null;
  const dna = mergeDeep(DNA_PRESETS.defaults || {}, p.dna || {});
  return { key: p.key, name: p.name, description: p.description, tags: p.tags || [], design_vocabulary: dna };
}

/** 按用户描述/关键词挑选预设：返回 [{key,name,score}] 降序 */
export function pickDnaPreset(query) {
  const q = String(query || '').toLowerCase().trim();
  const tokens = q.split(/[\s,，。、/]+/).filter(Boolean);
  const scored = listDnaPresets().map((p) => {
    const hay = [p.key, p.name, p.description, ...(p.tags || []), ...p.movements].join(' ').toLowerCase();
    let score = 0;
    if (q && hay.includes(q)) score += 3;
    for (const t of tokens) { if (hay.includes(t)) score += 1; if (p.tags.some((tg) => tg.includes(t))) score += 1; }
    // 关键词同义词加分
    const syn = { swiss: ['swiss', '瑞士'], japan: ['japan', '日式', '实验'], brutal: ['brutal', '粗野', '暴力'], luxury: ['luxury', '奢华', '时尚', 'fashion'], music: ['music', '音乐', '演出', '乐队', '派对'], minimal: ['minimal', '极简', '简洁'], data: ['data', '数据', '信息'], film: ['film', '电影', 'cinema', '影展'], print: ['print', '印刷', 'risograph', '孔版'], neon: ['neon', '霓虹', '夜', '电子'] };
    for (const [k, words] of Object.entries(syn)) if (words.some((w) => q.includes(w)) && (p.key.includes(k) || (p.tags || []).some((t) => t.includes(k)))) score += 2;
    return { key: p.key, name: p.name, score };
  });
  return scored.sort((a, b) => b.score - a.score).filter((x) => x.score > 0);
}

/** 按用户需求变异：opts {color, orientation, density, movements, interaction, seed} */
export function mutateDna(dna, opts = {}) {
  const d = unwrapPreset(dna);
  const out = clone(d);
  // 先按 seed 抖动（确定性），再应用显式选项——用户指定优先
  if (opts.seed != null && !isNaN(Number(opts.seed))) { const rnd = mulberry32(Number(opts.seed)); jitterNumeric(out, rnd); jitterStructure(out, rnd); }
  if (opts.movements) out.design_movements = opts.movements;
  if (opts.color && out.color) {
    out.color.strategy = opts.color;
    if (!Array.isArray(out.color.palette) || out.color.palette.length === 0) out.color.palette = DNA_PRESETS.defaults.color.palette;
  }
  if (opts.orientation && out.composition) out.composition.orientation = opts.orientation;
  if (opts.density != null && out.density) {
    const v = Math.max(0, Math.min(1, Number(opts.density)));
    out.density.overall = v;
    out.density.text = v;
    if (out.negative_space) out.negative_space.amount = Math.round((1 - v) * 100) / 100;
  }
  if (opts.interaction === 'static' || opts.interaction === 'none') {
    if (out.motion) { out.motion.enabled = false; out.motion.style = 'static'; out.motion.intensity = 0; }
    if (out.interaction) { out.interaction.enabled = false; out.interaction.primary = 'none'; out.interaction.intensity = 0; }
  } else if (opts.interaction === 'showcase' || opts.interaction === 'motion') {
    if (out.motion) { out.motion.enabled = true; out.motion.style = out.motion.style === 'static' ? 'kinetic' : out.motion.style; out.motion.intensity = Math.max(out.motion.intensity, 0.5); }
    if (out.interaction) { out.interaction.enabled = true; out.interaction.primary = 'hover'; out.interaction.intensity = Math.max(out.interaction.intensity, 0.4); }
  }
  return { design_vocabulary: out };
}

function unwrapPreset(dna) {
  if (dna && dna.design_vocabulary && isObj(dna.design_vocabulary)) return dna.design_vocabulary;
  return dna;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function jitterNumeric(o, rnd) {
  for (const [k, v] of Object.entries(o)) {
    // 只抖动 0..1 语义的浮点字段；整数（列数/层数/计数）与布尔/字符串不动
    if (typeof v === 'number' && !Number.isInteger(v) && v >= 0 && v <= 1) {
      const delta = (rnd() - 0.5) * 0.12;
      o[k] = Math.round(Math.max(0.02, Math.min(0.98, v + delta)) * 100) / 100;
    } else if (isObj(v)) jitterNumeric(v, rnd);
  }
}

// TASK-005：受控结构变异——同预设+不同 seed 必须能产生不同布局（不是只换色/数值）
const STRUCT_POOL = {
  composition: ['split', 'centered', 'broken_grid', 'diagonal', 'stacked', 'radial', 'symmetrical', 'collage'], // 覆盖 split/minimal/hero/dynamic/classic 5 种 mode
  grid: ['12_column', '8_column', '6_column', 'baseline', 'modular', 'broken'],
  type: ['neo_grotesk', 'serif', 'monospace', 'grotesk', 'display_serif', 'condensed'],
  color: ['black_and_accent', 'duotone', 'monochrome', 'high_contrast', 'neutral', 'earth', 'tritone', 'white_and_accent'],
};
function jitterStructure(d, rnd) {
  // 保证同预设+不同 seed 能产生多种布局：构图结构高概率换，且优先换到不同 layout mode
  const MODE = { split: 'split', centered: 'minimal', symmetrical: 'minimal', broken_grid: 'hero', edge_aligned: 'hero', collage: 'hero', diagonal: 'dynamic', radial: 'dynamic', modular: 'hero', full_bleed: 'hero', stacked: 'classic', asymmetric: 'hero', frame_within_frame: 'classic', floating: 'minimal' };
  if (d.composition && rnd() < 0.55) {
    const curMode = MODE[d.composition.structure] || 'hero';
    const pool = STRUCT_POOL.composition.filter((s) => MODE[s] !== curMode);
    if (pool.length) d.composition.structure = pool[Math.floor(rnd() * pool.length)];
  }
  if (d.grid && rnd() < 0.35) {
    const pool = STRUCT_POOL.grid.filter((g) => g !== d.grid.type);
    d.grid.type = pool[Math.floor(rnd() * pool.length)];
  }
  if (d.typography && rnd() < 0.35) {
    const pool = STRUCT_POOL.type.filter((t) => t !== d.typography.category);
    d.typography.category = pool[Math.floor(rnd() * pool.length)];
  }
  if (d.color && rnd() < 0.35) {
    const pool = STRUCT_POOL.color.filter((c) => c !== d.color.strategy);
    d.color.strategy = pool[Math.floor(rnd() * pool.length)];
  }
  if (d.motion && rnd() < 0.25) { d.motion.enabled = !d.motion.enabled; if (!d.motion.enabled) d.motion.style = 'static'; }
  if (d.interaction && rnd() < 0.3) {
    const pool = ['hover', 'click', 'scroll', 'none'];
    d.interaction.primary = pool[Math.floor(rnd() * pool.length)];
    if (d.interaction.primary === 'none') d.interaction.enabled = false; else d.interaction.enabled = true;
  }
  if (d.imagery && rnd() < 0.3) {
    const pool = ['photography', 'illustration', 'typography_only', 'collage', 'diagram', 'abstract'];
    d.imagery.source = pool[Math.floor(rnd() * pool.length)];
  }
  if (d.graphic_language && rnd() < 0.35) {
    const sets = [['number', 'grid'], ['barcode', 'coordinate'], ['annotation', 'diagram'], ['line', 'frame'], ['grid', 'number', 'frame']];
    d.graphic_language.elements = sets[Math.floor(rnd() * sets.length)].slice();
  }
  return d;
}

export default { listDnaPresets, getDnaPreset, pickDnaPreset, mutateDna, DNA_PRESETS };
