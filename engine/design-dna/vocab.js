/**
 * design-vocabulary — 统一 Design Vocabulary（P0：Design Vocabulary 完整落地）
 *
 * 把散落在 renderer / presets / color-strategy / directions 的原语收敛成一张词表：
 *   排版 layout × 字体 typography × 色彩 color × 交互 interaction × 图形 graphic
 * 并提供一个"组合引擎" compose()：选好原语 → 直接生成可渲染的 Design Spec。
 *
 * 使用：
 *   import { listVocabulary, compose, validateCombo } from './vocab.js'
 *   node scripts/vocab.js list|compose|validate
 */
import { presets, applyPreset } from '../presets/index.js';
import { listStrategies, generatePalette } from '../color/strategy.js';

// ---- 排版原语 ----
export const LAYOUT = {
  classic: { name: 'Classic 纵向三段', hint: '通用：上品牌 / 中标题 / 下信息' },
  hero: { name: 'Hero 底部大标题', hint: '电影 / 品牌，上部留白' },
  split: { name: 'Split 左右分栏', hint: '杂志编辑，左 meta / 右大标题' },
  minimal: { name: 'Minimal 全居中', hint: '极简大留白' },
  dynamic: { name: 'Dynamic 斜切动感', hint: '运动 / 潮流，标题斜切' },
};
export const LAYOUT_KEYS = Object.keys(LAYOUT);

// ---- 字体原语 ----
export const TYPOGRAPHY = {
  grotesque: {
    name: 'Grotesque 无衬线',
    hint: '瑞士 / 现代',
    stack: { fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif", scaleRatio: 1.2, titleScale: 2.4 },
  },
  condensed: {
    name: 'Condensed 窄体',
    hint: '运动 / 海报冲击力',
    stack: { fontFamily: "'Arial Narrow', 'Impact', 'Arial Black', Arial, sans-serif", bodyFont: "'Helvetica Neue', Arial, sans-serif", scaleRatio: 1.25, titleScale: 2.6 },
  },
  serif: {
    name: 'Serif 衬线',
    hint: '杂志 / 复古 / 奢侈',
    stack: { fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif", bodyFont: "'Helvetica Neue', Arial, sans-serif", scaleRatio: 1.3, titleScale: 2.2 },
  },
  mono: {
    name: 'Mono 等宽',
    hint: '实验 / 技术',
    stack: { fontFamily: "'Courier New', 'IBM Plex Mono', monospace", bodyFont: "'Courier New', monospace", scaleRatio: 1.15, titleScale: 2.0 },
  },
};
export const TYPOGRAPHY_KEYS = Object.keys(TYPOGRAPHY);

// ---- 色彩策略（来自 color-strategy，统一引用）----
export const COLOR = Object.fromEntries(listStrategies().map((s) => [s.key, { name: s.name, hint: s.desc }]));
export const COLOR_KEYS = Object.keys(COLOR);

// ---- 交互原语 ----
// ---- 天气相位默认值（weather:live）----
export const DEFAULT_WEATHER_PHASES = [
  { match: { group: ['clear'], isDay: true }, name: 'SUNNY', label: 'CLEAR DAY', colors: { bg: '#cfe9f5', surface: '#ffffff', ink: '#12324a', accent: '#1b6fb5', accent2: '#f5a623', muted: '#4a7186' }, fx: { grain: 0.1, glow: 0.6, contrast: 1.15, brightness: 1.03, saturate: 1.15, shadow: 0.3 } },
  { match: { group: ['clear'], isDay: false }, name: 'STARRY', label: 'CLEAR NIGHT', colors: { bg: '#0a1226', surface: '#16233f', ink: '#e8f0ff', accent: '#7db8ff', accent2: '#ffd76e', muted: '#8fa3c0' }, fx: { grain: 0.2, glow: 0.8, stars: 1, contrast: 1.1, brightness: 0.95, saturate: 1.05, shadow: 0.8 } },
  { match: { group: ['rain', 'drizzle', 'storm'] }, name: 'RAINY', label: 'RAIN / STORM', colors: { bg: '#26323e', surface: '#344450', ink: '#e8f1f7', accent: '#6fa8cc', accent2: '#8fb7d1', muted: '#9db3c2' }, fx: { grain: 0.3, glow: 0.6, rain: 1, blur: 0.1, contrast: 1.1, brightness: 0.9, saturate: 0.85, shadow: 0.75 } },
  { name: 'NEUTRAL', label: 'OFFLINE FALLBACK', colors: { bg: '#101820', surface: '#1c2730', ink: '#e6eef4', accent: '#6f8fa8', accent2: '#b58a4a', muted: '#7d8b96' }, fx: { grain: 0.3, glow: 0.6, contrast: 1, brightness: 1, saturate: 1, shadow: 0.6 } },
];

// ---- 时间相位默认值（time:cycle）----
export const DEFAULT_TIME_PHASES = [
  { hour: 8, label: '08:00', name: 'DAWN', colors: { bg: '#f4f1ea', surface: '#ffffff', ink: '#1c1a16', accent: '#3b6ea5', accent2: '#c9821e', muted: '#6a6257' }, fx: { grain: 0.08, glow: 0.5, contrast: 1, brightness: 1.02, saturate: 0.95, shadow: 0.25 } },
  { hour: 14, label: '14:00', name: 'NOON', colors: { bg: '#ede7d9', surface: '#ffffff', ink: '#141210', accent: '#1e3a5f', accent2: '#c0392b', muted: '#5f5648' }, fx: { grain: 0.2, glow: 0.7, contrast: 1.35, brightness: 1, saturate: 1.18, shadow: 0.9 } },
  { hour: 20, label: '20:00', name: 'NEON', colors: { bg: '#0a0a14', surface: '#15152a', ink: '#f4f2ff', accent: '#ff2bd6', accent2: '#00e5ff', muted: '#8a87a8' }, fx: { grain: 0.3, glow: 2.4, contrast: 1.1, brightness: 0.95, saturate: 1.25, shadow: 0.7 } },
  { hour: 2, label: '02:00', name: 'NIGHT', colors: { bg: '#050507', surface: '#0c0c10', ink: '#c9c7c0', accent: '#7c7a8a', accent2: '#4a4a55', muted: '#5a5a63' }, fx: { grain: 0.65, glow: 0.25, blur: 0.5, contrast: 0.95, brightness: 0.72, saturate: 0.5, shadow: 0.95 } },
];

export const INTERACTION = {
  'hover:distort': { category: 'hover', name: '悬停变形', spec: 'interactions.title.effect=distort', apply: (s) => { s.interactions.title = { ...s.interactions.title, type: 'hover', effect: 'distort' }; } },
  'hover:glitch': { category: 'hover', name: '悬停故障', spec: 'interactions.title.effect=glitch', apply: (s) => { s.interactions.title = { ...s.interactions.title, type: 'hover', effect: 'glitch' }; } },
  'hover:color-shift': { category: 'hover', name: '悬停变色', spec: 'interactions.title.effect=color-shift', apply: (s) => { s.interactions.title = { ...s.interactions.title, type: 'hover', effect: 'color-shift' }; } },
  'hover:scale': { category: 'hover', name: '悬停放大', spec: 'interactions.title.effect=scale', apply: (s) => { s.interactions.title = { ...s.interactions.title, type: 'hover', effect: 'scale' }; } },
  'click:explode': { category: 'click', name: '标题炸裂', spec: 'interactions.title.click=explode', apply: (s) => { s.interactions.title = { ...s.interactions.title, click: 'explode' }; } },
  'click:expand': { category: 'click', name: '详情展开', spec: 'interactions.date.click=expand', apply: (s) => { s.interactions.date = { type: 'click', action: 'expand' }; } },
  'cursor:ring': { category: 'cursor', name: '光标环', spec: 'interactions.cursor.type=ring', apply: (s) => { s.interactions.cursor = { type: 'ring' }; } },
  'cursor:magnetic': { category: 'cursor', name: '磁吸', spec: 'interactions.cta.hover=magnetic', apply: (s) => { s.interactions.cta = { type: 'hover', effect: 'magnetic' }; } },
  'cursor:repel': { category: 'cursor', name: '斥力', spec: 'interactions.ball.repel', apply: (s) => { s.interactions.ball = { ...s.interactions.ball, repel: 0.4 }; s.style.imagery = s.style.imagery ?? {}; s.style.imagery.ball = s.style.imagery.ball ?? { depth: 0.4 }; } },
  'cursor:parallax': { category: 'cursor', name: '视差', spec: 'interactions.background.parallax', apply: (s) => { s.interactions.background = { type: 'parallax', depth: 0.15 }; } },
  'cursor:light': { category: 'cursor', name: '光标光晕', spec: 'interactions.glow.cursorLight', apply: (s) => { s.interactions.glow = { type: 'cursorLight', blend: 'screen' }; } },
  'cursor:tilt3d': { category: 'cursor', name: '3D 倾斜', spec: 'interactions.poster.tilt3d', apply: (s, o) => { s.interactions.poster = { type: 'tilt3d', max: o?.tilt ?? 6 }; } },
  'scroll:reveal': { category: 'scroll', name: '滚动显现', spec: 'animation.scroll.reveal', apply: (s) => { s.animation.scroll = { reveal: true }; } },
  'env:particles': { category: 'env', name: '粒子', spec: 'animation.particles', apply: (s) => { s.animation.particles = { count: 26 }; } },
  'time:cycle': { category: 'time', name: '时间生命周期', spec: 'style.timePhases（4 相位）', apply: (s) => { s.style.timePhases = s.style.timePhases ?? DEFAULT_TIME_PHASES; } },
  'weather:live': { category: 'env', name: '实时天气', spec: 'style.weather（需 phases + defaultCity）', apply: (s) => { s.style.weather = s.style.weather ?? { defaultCity: 'Singapore', lat: 1.3521, lon: 103.8198, phases: DEFAULT_WEATHER_PHASES }; } },
};
export const INTERACTION_KEYS = Object.keys(INTERACTION);

// ---- 图形原语 ----
export const GRAPHIC = {
  ball: { name: 'CSS 图形（篮球等）', spec: 'style.imagery.ball', apply: (s) => { s.style.imagery = s.style.imagery ?? {}; s.style.imagery.ball = s.style.imagery.ball ?? { depth: 0.4 }; } },
  image: { name: '图片层', spec: 'style.imagery.image（需 src）', apply: (s) => { s.style.imagery = s.style.imagery ?? {}; s.style.imagery.image = s.style.imagery.image ?? { src: '图片路径', duotone: true, scrim: true, zoom: true }; } },
  hotspot: { name: '热点（零按钮）', spec: 'content.hotspots（需坐标）', apply: (s) => { s.content.hotspots = s.content.hotspots ?? [{ x: 50, y: 50, r: 30, label: 'HOTSPOT', detail: '点击查看' }]; } },
};
export const GRAPHIC_KEYS = Object.keys(GRAPHIC);
// ---- 尺寸预设（输入层）----
export const SIZES = {
  a4: { name: 'A4', width: 794, height: 1123, note: '210×297mm @96dpi' },
  a3: { name: 'A3', width: 1123, height: 1587, note: '297×420mm @96dpi' },
  '16:9': { name: '16:9', width: 1920, height: 1080, note: '横屏/网页' },
  '9:16': { name: '9:16', width: 1080, height: 1920, note: '竖屏/Story/海报' },
  '1:1': { name: '1:1', width: 1080, height: 1080, note: '方形/社交' },
  '3:4': { name: '3:4', width: 1080, height: 1440, note: '经典竖版' },
  '2:3': { name: '2:3', width: 1080, height: 1620, note: '电影海报' },
};
export const SIZE_KEYS = Object.keys(SIZES);

/** 解析尺寸输入：'A4' / '16:9' / '1200x1600' → {width, height}；非法返回 null */
export function resolveSize(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (SIZES[key]) return { width: SIZES[key].width, height: SIZES[key].height, preset: key, name: SIZES[key].name };
  const m = /^(\d+)\s*[xX*]\s*(\d+)$/.exec(String(input).trim());
  if (m) return { width: Number(m[1]), height: Number(m[2]), preset: null, name: String(input).trim() };
  return null;
}


/** 全量词表（含风格预设组合） */
export function listVocabulary() {
  const rows = [];
  for (const [key, v] of Object.entries(LAYOUT)) rows.push({ category: 'layout', key, name: v.name, hint: v.hint, spec: 'style.layout.mode=' + key });
  for (const [key, v] of Object.entries(TYPOGRAPHY)) rows.push({ category: 'typography', key, name: v.name, hint: v.hint, spec: 'style.typography.type=' + key });
  for (const [key, v] of Object.entries(COLOR)) rows.push({ category: 'color', key, name: v.name, hint: v.hint, spec: '--color ' + key });
  for (const [key, v] of Object.entries(INTERACTION)) rows.push({ category: 'interaction', key, name: v.name, hint: v.spec, spec: v.spec });
  for (const [key, v] of Object.entries(GRAPHIC)) rows.push({ category: 'graphic', key, name: v.name, hint: v.spec, spec: v.spec });
  for (const [key, v] of Object.entries(presets)) rows.push({ category: 'style', key, name: v.name, hint: '风格预设（组合）', spec: '--preset ' + key });
  return rows;
}

/** 组合引擎：选原语 → 生成可渲染的 Design Spec */
export function compose(lang = {}, opts = {}) {
  const spec = {
    canvas: { width: opts.width ?? 1200, height: opts.height ?? 1600, unit: 'px', responsive: true },
    content: {
      title: opts.title ?? 'POSTER',
      subtitle: opts.subtitle ?? '',
      date: opts.date ?? '',
      location: opts.location ?? '',
      price: opts.price ?? '',
      cta: opts.cta ?? '',
      metadata: { brand: opts.brand ?? 'POSTER', tag: opts.tag ?? 'INTERACTIVE', note: opts.note ?? '' },
      hotspots: [],
    },
    style: {},
    animation: {},
    interactions: {},
  };

  // 排版
  const layout = lang.layout ?? 'classic';
  if (!LAYOUT[layout]) throw new Error(`未知排版原语 "${layout}"，可选: ${LAYOUT_KEYS.join(', ')}`);
  spec.style.layout = { mode: layout };

  // 字体
  const type = lang.type ?? 'grotesque';
  if (!TYPOGRAPHY[type]) throw new Error(`未知字体原语 "${type}"，可选: ${TYPOGRAPHY_KEYS.join(', ')}`);
  spec.style.typography = { ...TYPOGRAPHY[type].stack, type };

  // 色彩策略
  if (lang.color) {
    if (!COLOR[lang.color]) throw new Error(`未知色彩策略 "${lang.color}"，可选: ${COLOR_KEYS.join(', ')}`);
    spec.style.colors = generatePalette(lang.color, opts.seed ?? 2026).colors;
  }

  // 风格预设（可选，覆盖排版/字体/配色）
  if (lang.style) {
    if (!presets[lang.style]) throw new Error(`未知风格预设 "${lang.style}"，可选: ${Object.keys(presets).join(', ')}`);
    return applyPreset(spec, lang.style);
  }

  // 交互原语
  for (const fx of lang.interactions ?? []) {
    const f = INTERACTION[fx];
    if (!f) throw new Error(`未知交互原语 "${fx}"，可选: ${INTERACTION_KEYS.join(', ')}`);
    f.apply(spec, opts);
  }
  // 图形原语
  for (const g of lang.graphics ?? []) {
    const gg = GRAPHIC[g];
    if (!gg) throw new Error(`未知图形原语 "${g}"，可选: ${GRAPHIC_KEYS.join(', ')}`);
    gg.apply(spec);
  }

  return spec;
}

/** 校验一个 spec 用到的词表原语是否合法 */
export function validateCombo(spec) {
  const issues = [];
  const layout = spec?.style?.layout?.mode ?? 'classic';
  if (!LAYOUT[layout]) issues.push(`未知排版模式 "${layout}"，可选: ${LAYOUT_KEYS.join(', ')}`);

  const t = spec?.style?.typography?.type;
  if (t && !TYPOGRAPHY[t]) issues.push(`未知字体原语 "${t}"，可选: ${TYPOGRAPHY_KEYS.join(', ')}`);

  const int = spec?.interactions ?? {};
  const HOVER = ['distort', 'glitch', 'color-shift', 'scale'];
  if (int.title?.effect && !HOVER.includes(int.title.effect)) issues.push(`未知标题悬停效果 "${int.title.effect}"，可选: ${HOVER.join('/')}`);
  if (int.title?.click && int.title.click !== 'explode') issues.push(`未知标题点击效果 "${int.title.click}"（可选 explode）`);
  if (int.cursor?.type && int.cursor.type !== 'ring') issues.push(`未知光标效果 "${int.cursor.type}"（可选 ring）`);
  if (int.poster?.type && int.poster.type !== 'tilt3d') issues.push(`未知海报效果 "${int.poster.type}"（可选 tilt3d）`);
  if (int.background?.type && int.background.type !== 'parallax') issues.push(`未知背景效果 "${int.background.type}"（可选 parallax）`);
  if (int.cta?.effect && int.cta.effect !== 'magnetic') issues.push(`未知 CTA 效果 "${int.cta.effect}"（可选 magnetic）`);
  if (int.ball?.repel !== undefined && typeof int.ball.repel !== 'number') issues.push('ball.repel 应为数字');

  const img = spec?.style?.imagery ?? {};
  if (img.ball !== undefined && (typeof img.ball !== 'object' || img.ball === null)) issues.push('imagery.ball 应为对象');
  if (img.image !== undefined && !img.image?.src) issues.push('imagery.image 需要 src');

  const tp = spec?.style?.timePhases;
  if (tp !== undefined && (!Array.isArray(tp) || tp.length < 2)) issues.push('style.timePhases 应为至少 2 个相位');
  if (Array.isArray(tp)) tp.forEach((ph, i) => { if (!ph || typeof ph.hour !== 'number') issues.push('timePhases[' + i + '] 缺少 hour'); });

  return { valid: issues.length === 0, issues };
}

export default { listVocabulary, compose, validateCombo, LAYOUT, TYPOGRAPHY, COLOR, INTERACTION, GRAPHIC };