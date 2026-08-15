/**
 * design-plan — 9 维度设计方案（补齐"设计分析 Agent"层）
 *
 * 把 spec（+ 参考图指纹）聚合成一份人类可读的「设计方案」：
 *   Visual Direction / Typography / Color System / Composition /
 *   Image Treatment / Grid / Hierarchy / Negative Space / Texture
 *
 * 用法：node scripts/plan.js <spec.json> [--fingerprint fp.json] [--out plan.md] [--json]
 */
import { buildTypeScale, pxToCqw } from '../typography/index.js';
import { contrast } from '../color/palette.js';
import { evaluate } from '../critic/index.js';
import { LAYOUT, TYPOGRAPHY } from '../design-dna/vocab.js';

const DEFAULT_COLORS = {
  bg: '#0a0a12', surface: '#15152a', ink: '#f4f2ff',
  accent: '#00e5ff', accent2: '#ff2bd6', muted: '#8a87a8',
};

function inferType(fontFamily) {
  const f = String(fontFamily ?? '').toLowerCase();
  if (f.includes('playfair') || f.includes('georgia') || f.includes('times') || f.includes('garamond') || f.includes('noto serif')) return 'serif';
  if (f.includes('courier') || f.includes('mono')) return 'mono';
  if (f.includes('narrow') || f.includes('impact') || f.includes('oswald') || f.includes('arial black')) return 'condensed';
  return 'grotesque';
}

function describeDirection(layout, interactions) {
  const parts = [];
  if (LAYOUT[layout]) parts.push(LAYOUT[layout].name);
  const fx = [];
  if (interactions?.title?.effect) fx.push('悬停:' + interactions.title.effect);
  if (interactions?.title?.click === 'explode') fx.push('点击炸裂');
  if (interactions?.cursor?.type === 'ring') fx.push('光标环');
  if (interactions?.poster?.type === 'tilt3d') fx.push('3D 倾斜');
  if (interactions?.ball?.repel) fx.push('斥力');
  if (interactions?.glow?.type === 'cursorLight') fx.push('光晕');
  if (fx.length) parts.push('交互: ' + fx.join('+'));
  return parts.join(' · ') || '经典方向';
}

function estNegativeSpace(spec) {
  const margin = Number(spec?.style?.layout?.margin ?? 64);
  const width = Number(spec?.canvas?.width ?? 1200);
  const mode = spec?.style?.layout?.mode ?? 'classic';
  const base = margin / width;
  if (mode === 'minimal') return Math.min(0.85, base + 0.35);
  if (mode === 'hero') return Math.min(0.8, base + 0.2);
  if (mode === 'split') return Math.min(0.7, base + 0.1);
  return Math.min(0.65, base);
}

/**
 * 生成 9 维度设计方案。
 * @param {object} spec Design Spec
 * @param {{fingerprint?: object}} [opts]
 * @returns {{dimensions: object, interactions: string[], aiNess: object, md: string}}
 */
export function buildPlan(spec, opts = {}) {
  const { style = {}, content = {}, canvas = {}, animation = {}, interactions = {} } = spec;
  const C = { ...DEFAULT_COLORS, ...(style.colors ?? {}) };
  const ts = buildTypeScale({
    ratio: style?.typography?.scaleRatio ?? 1.25,
    base: style?.typography?.baseSize ?? 16,
  });
  const titleFactor = Number(style?.typography?.titleScale ?? 2.2);
  const width = Number(canvas.width) || 1200;
  const layout = style?.layout?.mode ?? 'classic';
  const typePrim = style?.typography?.type ?? inferType(style?.typography?.fontFamily);
  const typeName = TYPOGRAPHY[typePrim] ? TYPOGRAPHY[typePrim].name : String(typePrim);

  const titleCqw = pxToCqw(ts.display * titleFactor, width);
  const subCqw = pxToCqw(ts.md, width);
  const metaCqw = pxToCqw(ts.sm, width);
  const hierarchyRatio = titleCqw / Math.max(subCqw, 0.1);
  const levels = [content.title, content.subtitle, content.location, content.date || content.cta].filter(Boolean).length;

  const dimensions = {
    'Visual Direction': {
      value: describeDirection(layout, interactions),
      note: `排版 ${layout} + 交互组合，场景导向`,
    },
    'Typography': {
      value: `${typeName}（${typePrim}）`,
      note: `font: ${String(style?.typography?.fontFamily ?? '').split(',')[0] || '默认'} · 比例 ${style?.typography?.scaleRatio ?? 1.25} · 标题约 ${Math.round(ts.display * titleFactor)}px`,
    },
    'Color System': {
      value: `${Object.keys(C).length} 色：bg ${C.bg} / ink ${C.ink} / accent ${C.accent}`,
      note: `正文/背景对比 ${contrast(C.ink, C.bg).toFixed(2)}:1 · 强调/背景 ${contrast(C.accent, C.bg).toFixed(2)}:1`,
    },
    'Composition': {
      value: LAYOUT[layout] ? LAYOUT[layout].name : layout,
      note: `margin ${Number(style?.layout?.margin ?? 64)}px · 三层骨架（品牌/标题/信息）`,
    },
    'Image Treatment': (() => {
      const img = style?.imagery?.image;
      if (img) return { value: '图片层 cover', note: `${img.src} · duotone:${!!img.duotone} · scrim:${!!img.scrim} · zoom:${!!img.zoom}` };
      if (style?.imagery?.ball) return { value: 'CSS 图形（ball）', note: `depth ${style.imagery.ball.depth ?? 0.4}，独立视差` };
      return { value: '纯程序化图形', note: '渐变 + 噪点，无位图' };
    })(),
    'Grid': {
      value: `${Number(style?.layout?.gridColumns ?? 12)} 列`,
      note: `画布 ${width}×${Number(canvas.height) || 1600} · 边距 ${Number(style?.layout?.margin ?? 64)}px`,
    },
    'Hierarchy': {
      value: `标题:副标题 ≈ ${hierarchyRatio.toFixed(2)}:1（${levels} 个层级）`,
      note: hierarchyRatio >= 2 ? '层级清晰' : '层级偏弱，建议加大标题或缩小副标题',
    },
    'Negative Space': {
      value: `约 ${Math.round(estNegativeSpace(spec) * 100)}%`,
      note: layout === 'minimal' || layout === 'hero' ? '大留白方向' : '中等留白',
    },
    'Texture': {
      value: '颗粒噪点（默认叠加）',
      note: 'FeTurbulence 噪点 + 渐变质感；尚未词表化（roadmap）',
    },
  };

  const interactionsList = [];
  if (style?.timePhases?.length >= 2) interactionsList.push('时间生命周期（' + style.timePhases.length + ' 相位）');
  if (style?.weather?.phases?.length >= 2) interactionsList.push('实时天气（' + style.weather.phases.length + ' 相位）');
  if (interactions?.background?.type === 'parallax') interactionsList.push('背景视差');
  if (interactions?.glow?.type === 'cursorLight') interactionsList.push('光标光晕');
  if (interactions?.title?.effect) interactionsList.push('标题悬停:' + interactions.title.effect);
  if (interactions?.title?.click === 'explode') interactionsList.push('标题点击炸裂');
  if (interactions?.date?.action === 'expand') interactionsList.push('日期点击展开');
  if (interactions?.cta?.effect === 'magnetic') interactionsList.push('CTA 磁吸');
  if (interactions?.cursor?.type === 'ring') interactionsList.push('光标环');
  if (interactions?.poster?.type === 'tilt3d') interactionsList.push('3D 倾斜');
  if (interactions?.ball?.repel) interactionsList.push('图形斥力');
  if (animation?.particles) interactionsList.push('粒子');
  if (animation?.scroll?.reveal) interactionsList.push('滚动显现');

  const aiNess = evaluate(spec).aiNess;

  const md = toMarkdown(spec, dimensions, interactionsList, aiNess, opts.fingerprint);
  return { dimensions, interactions: interactionsList, aiNess, md };
}

function toMarkdown(spec, dims, interactions, aiNess, fingerprint) {
  const title = spec?.content?.title ?? 'POSTER';
  const lines = [];
  lines.push(`# 设计方案 · ${title}`);
  lines.push('');
  lines.push(`> 画布 ${spec?.canvas?.width ?? 1200}×${spec?.canvas?.height ?? 1600}px · 自检 ${aiNess?.pass ? '✅' : '⚠️'}（AI-ness ${aiNess?.score ?? '?'}/100）`);
  lines.push('');
  if (fingerprint) {
    lines.push('## 参考图分析');
    lines.push(`- 主色 ${fingerprint.palette?.map((p) => p.hex).join(' ')} · 明暗 ${fingerprint.is_dark ? '深' : '浅'} · 色温 ${fingerprint.temperature} · 布局猜测 ${fingerprint.layout?.guess}`);
    lines.push('');
  }
  lines.push('## 九维设计语言');
  lines.push('');
  for (const [k, v] of Object.entries(dims)) {
    lines.push(`- **${k}**: ${v.value}`);
    lines.push(`  - ${v.note}`);
  }
  lines.push('');
  lines.push('## 交互');
  lines.push(interactions.length ? interactions.map((i) => `- ${i}`).join('\n') : '- 无（静态）');
  lines.push('');
  if (aiNess?.signals?.length) {
    lines.push('## AI 味提示');
    aiNess.signals.forEach((s) => lines.push(`- ⚠️ ${s}`));
    lines.push('');
  }
  lines.push('---');
  lines.push('*由 poster-engine design-plan 生成*');
  return lines.join('\n');
}

export default { buildPlan };