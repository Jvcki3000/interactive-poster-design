// anti-ai — 反 AI 审美检测（统一规则源）：spec 级 + DNA 级
// critic 与 design-vocabulary/dna.js 共用本模块，避免两套规则漂移。
import { buildTypeScale, pxToCqw } from '../typography/index.js';
import { hueOf, satOf } from './palette.js';

const DEFAULT_COLORS = {
  bg: '#0a0a12', surface: '#15152a', ink: '#f4f2ff',
  accent: '#00e5ff', accent2: '#ff2bd6', muted: '#8a87a8',
};

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

/**
 * spec 级 AI-ness（0-100，越高越"AI 味"；<25 允许输出）。
 * 信号：通用紫粉配色 / 霓虹青+品红 / 装饰堆叠 / 居中构图 / 层次不足 / Duotone+紫粉 / 无语义粒子。
 */
export function detectSpecAi(spec) {
  const { style = {}, animation = {}, interactions = {} } = spec;
  const C = { ...DEFAULT_COLORS, ...(style.colors ?? {}) };
  const signals = [];
  let score = 0;
  const add = (n, msg) => { score += n; signals.push(msg); };

  const accentHue = hueOf(C.accent);
  const accentSat = satOf(C.accent);
  if (accentHue !== null && accentSat > 0.5 && accentHue >= 250 && accentHue <= 330) {
    add(20, '强调色为典型 AI 紫/粉色相（hue ' + Math.round(accentHue) + '°）');
  }
  const accent2Hue = hueOf(C.accent2);
  const cyan = accentHue !== null && accentHue >= 175 && accentHue <= 200;
  const magenta = accent2Hue !== null && accent2Hue >= 300 && satOf(C.accent2) > 0.4;
  if (cyan && magenta) add(15, '霓虹青 + 品红组合，常见 AI 审美');

  const fx = [];
  if (animation?.particles) fx.push('粒子');
  if (animation?.glow || interactions?.glow) fx.push('光晕');
  if (interactions?.cursor?.type === 'ring') fx.push('光标环');
  if (interactions?.title?.click === 'explode') fx.push('点击炸裂');
  if (interactions?.poster?.type === 'tilt3d') fx.push('3D 倾斜');
  if (fx.length >= 3) add(15, '装饰/动效堆叠过多（' + fx.join('+') + '）');
  else if (fx.length >= 2) add(8, '装饰效果偏多（' + fx.join('+') + '）');

  const mode = style?.layout?.mode ?? 'classic';
  if (mode === 'minimal' || mode === 'centered') add(10, '居中构图，容易落入 AI 平均审美');

  const ts = buildTypeScale({ ratio: style?.typography?.scaleRatio ?? 1.25, base: style?.typography?.baseSize ?? 16 });
  const titleFactor = Number(style?.typography?.titleScale ?? 2.2);
  const titleCqw = pxToCqw(ts.display * titleFactor, 1200);
  const subCqw = pxToCqw(ts.md, 1200);
  if (titleCqw / Math.max(subCqw, 0.1) < 1.8) add(10, '标题/副标题层级不足');

  if (style?.imagery?.image?.duotone && accentHue !== null && accentHue >= 250 && accentHue <= 330) {
    add(10, 'Duotone + 紫粉强调，AI 修图感');
  }
  if (animation?.particles && !style?.imagery?.ball && !style?.imagery?.image) {
    add(5, '粒子装饰与内容无语义关联');
  }

  return { score: Math.min(100, score), signals, pass: score < 25 };
}

/**
 * DNA 级反 AI 风险（0..1）。与 compatibility.json 的 ai_aesthetic_guardrail 同源语义：
 * 霓虹紫/青/粉、渐变、粒子、噪点、居中+居中排、glitch/kinetic、圆角+居中。
 */
export function dnaAestheticRisk(dna) {
  const d = (dna && typeof dna === 'object' && dna.design_vocabulary && typeof dna.design_vocabulary === 'object') ? dna.design_vocabulary : dna;
  if (!d) return 0;
  let risk = 0;
  const color = d.color || {};
  const palette = Array.isArray(color.palette) ? color.palette : [];
  if (palette.length) {
    const neon = palette.filter((h) => { const hue = hexHue(h); return hue != null && ((hue >= 170 && hue <= 215) || (hue >= 260 && hue <= 335)); });
    risk += 0.35 * (neon.length / palette.length);
  }
  if (color.gradient === true) risk += 0.2;
  if (typeof color.ai_aesthetic_risk === 'number') risk = risk * 0.5 + color.ai_aesthetic_risk * 0.5;
  const gl = d.graphic_language || {};
  if (Array.isArray(gl.elements)) { if (gl.elements.includes('particles')) risk += 0.15; if (gl.elements.includes('noise')) risk += 0.05; }
  const comp = d.composition || {};
  if (comp.structure === 'centered' && Array.isArray(comp.alignment) && comp.alignment.includes('center')) risk += 0.1;
  const motion = d.motion || {};
  if (motion.enabled && (motion.style === 'glitch' || motion.style === 'kinetic')) risk += 0.05;
  if (gl.corner_style === 'rounded' && comp.structure === 'centered') risk += 0.05;
  return Math.min(1, Math.round(risk * 100) / 100);
}

/** 统一入口：spec（+ 可选 DNA）→ AI-ness（0-100 规格） */
export function detectAntiAI({ spec, dna }) {
  const specRes = detectSpecAi(spec || {});
  const signals = specRes.signals.slice();
  let score = specRes.score;
  if (dna) {
    const r = dnaAestheticRisk(dna);
    if (r > 0) {
      score += Math.round(r * 40); // DNA 风险映射到 0-40 附加分
      signals.push('DNA 反 AI 风险 ' + r.toFixed(2) + '（霓虹/渐变/粒子/居中）');
    }
  }
  return { score: Math.min(100, score), signals, pass: score < 25 };
}


/** TASK-010：Anti-AI Color Guard — 若 DNA 风险 > 0.6 自动换安全配色。
 * 安全色板：黑 + 中性纸色 + 单一低饱和强调（非紫/青/粉）。
 * 返回 { dna, changed, before, after }
 */
const SAFE_PALETTES = [
  ['#111111', '#F4F1EA', '#E63329'],
  ['#0F1210', '#EEEDE6', '#D9A441'],
  ['#141210', '#F0ECE2', '#3E6B4F'],
  ['#0B0E14', '#E8E6DF', '#C05B3C'],
];
export function guardColors(dna, threshold = 0.6) {
  const d = (dna && typeof dna === 'object' && dna.design_vocabulary && typeof dna.design_vocabulary === 'object') ? dna.design_vocabulary : dna;
  if (!d || !d.color) return { dna, changed: false };
  const risk = dnaAestheticRisk(d);
  if (risk <= threshold) return { dna, changed: false, risk };
  const before = JSON.stringify(d.color.palette || []);
  // 选一个与当前主色亮度接近的安全色板
  const curLum = paletteLuminance(d.color.palette);
  let pick = SAFE_PALETTES[0];
  let best = 1;
  for (const p of SAFE_PALETTES) {
    const diff = Math.abs(paletteLuminance(p) - curLum);
    if (diff < best) { best = diff; pick = p; }
  }
  const after = pick;
  d.color.palette = after;
  d.color.gradient = false;
  d.color.ai_aesthetic_risk = 0.1;
  // 去掉粒子/噪点装饰以压低风险
  if (d.graphic_language && Array.isArray(d.graphic_language.elements)) {
    d.graphic_language.elements = d.graphic_language.elements.filter((e) => e !== 'particles' && e !== 'noise');
  }
  return { dna: { design_vocabulary: d }, changed: true, risk, before: JSON.parse(before), after };
}

function paletteLuminance(palette) {
  const arr = Array.isArray(palette) && palette.length ? palette : ['#111111', '#F4F1EA'];
  const lum = arr.map((h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h)); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; });
  return lum.reduce((a, b) => a + b, 0) / lum.length;
}

export default { detectSpecAi, dnaAestheticRisk, detectAntiAI, guardColors };
