// design-dna — Design DNA 中枢：create / validate / serialize / load / toSpec（DNA → 渲染 spec）
import { validateDna, unwrap, aiRiskScore } from './dna.js';
import { guardColors } from '../color/anti-ai.js';
import { elementsToGraphics } from '../graphics/index.js';
import { imageryToSpec } from '../imagery/index.js';
import { TREATMENT_SPEC } from '../materials/index.js';

const ORIENT_CANVAS = {
  portrait: { width: 1080, height: 1620 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1200, height: 1200 },
  custom: { width: 1200, height: 1600 },
};

const STRUCTURE_MODE = {
  split: 'split', centered: 'minimal', symmetrical: 'minimal',
  asymmetric: 'hero', broken_grid: 'hero', edge_aligned: 'hero',
  collage: 'hero', diagonal: 'dynamic', radial: 'dynamic',
  modular: 'hero', full_bleed: 'hero', stacked: 'classic',
  frame_within_frame: 'classic', floating: 'minimal',
};

const TYPE_FONT = {
  grotesk: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  neo_grotesk: "'Helvetica Neue', Arial, sans-serif",
  humanist_sans: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  geometric_sans: "'Futura', 'Century Gothic', Arial, sans-serif",
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  display_serif: "'Playfair Display', Georgia, serif",
  slab_serif: "'Roboto Slab', Georgia, serif",
  monospace: "'Courier New', monospace",
  blackletter: "'UnifrakturMaguntia', Georgia, serif",
  handwritten: "'Comic Sans MS', 'Segoe Print', cursive",
  condensed: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  experimental: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
  variable: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
  mixed: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
};
const TYPE_WEIGHT = { thin: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, black: 900, variable: 800 };

const MOTION_ANIM = {
  static: {},
  subtle: { title: { reveal: 'chars', stagger: 0.06 } },
  organic: { title: { reveal: 'chars', stagger: 0.05 }, scroll: { reveal: true } },
  mechanical: { title: { reveal: 'chars', stagger: 0.04 }, scroll: { reveal: true } },
  kinetic: { title: { reveal: 'chars', stagger: 0.03 }, scroll: { reveal: true } },
  glitch: { title: { reveal: 'chars', stagger: 0.05 } },
  elastic: { title: { reveal: 'chars', stagger: 0.05 } },
  fluid: { title: { reveal: 'chars', stagger: 0.06 } },
  cinematic: { title: { reveal: 'chars', stagger: 0.08 }, scroll: { reveal: true } },
  chaotic: { title: { reveal: 'chars', stagger: 0.03 } },
};
const MOTION_TITLE_FX = { glitch: 'glitch', chaotic: 'distort' };

const INTERACTION_MAP = {
  none: {},
  hover: { glow: { type: 'cursorLight', blend: 'screen' }, title: { type: 'hover', effect: 'color-shift' } },
  click: { title: { type: 'click', effect: 'explode' } },
  scroll: { scroll: { reveal: true } },
  drag: { title: { type: 'hover', effect: 'color-shift' } },
  audio: { glow: { type: 'cursorLight', blend: 'screen' } },
  cursor: { glow: { type: 'cursorLight', blend: 'screen' } },
  touch: { glow: { type: 'cursorLight', blend: 'screen' } },
  keyboard: {},
  time: {},
  location: {},
};

function pick(palette, i) { return palette && palette[i] ? palette[i] : null; }
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** DNA → 渲染 spec（Design Spec 契约） */
export function dnaToSpec(dna, opts = {}) {
  const d = unwrap(dna) || {};
  // TASK-010：Anti-AI Color Guard — 风险 >0.6 自动换安全配色
  if (!opts.skipColorGuard) {
    const g = guardColors(d, opts.colorGuardThreshold ?? 0.6);
    if (g.changed) opts.__colorGuarded = { risk: g.risk, before: g.before, after: g.after };
  }
  const composition = d.composition || {};
  const typography = d.typography || {};
  const color = d.color || {};
  const grid = d.grid || {};
  const density = d.density || {};
  const negativeSpace = d.negative_space || {};
  const motion = d.motion || {};
  const interaction = d.interaction || {};
  const depth = d.depth || {};
  const materiality = d.materiality || {};
  const movements = Array.isArray(d.design_movements) ? d.design_movements : [];

  const orient = composition.orientation || 'portrait';
  const canvas = opts.canvas || ORIENT_CANVAS[orient] || ORIENT_CANVAS.portrait;

  // 配色：palette → {bg, surface, ink, accent, accent2, muted}
  const palette = Array.isArray(color.palette) && color.palette.length ? color.palette : ['#111111', '#F4F1EA', '#E63329'];
  const sorted = palette.slice().sort((a, b) => luminance(a) - luminance(b));
  const bg = opts.bg || sorted[0];
  const ink = opts.ink || sorted[sorted.length - 1];
  const accent = opts.accent || (palette.length > 2 ? palette[2] : sorted[sorted.length - 1]);
  const accent2 = palette.length > 3 ? palette[3] : accent;
  const surface = palette.length > 1 ? palette[1] : bg;
  const muted = opts.muted || mixHex(ink, bg, 0.55);
  const colors = { bg, surface, ink, accent, accent2, muted };

  const layoutMode = STRUCTURE_MODE[composition.structure] || 'classic';
  const densityVal = density.overall ?? 0.5;
  const margin = Math.round(64 - (densityVal - 0.5) * 40); // 0.5→64px，1→24px
  const cols = grid.type === '8_column' ? 8 : grid.type === '6_column' ? 6 : grid.type === '4_column' ? 4 : 12;

  const fontFamily = TYPE_FONT[typography.category] || TYPE_FONT.neo_grotesk;
  const titleScale = { micro: 1.2, small: 1.5, medium: 1.8, large: 2.2, oversized: 2.7, extreme: 3.2 }[typography.scale] || 2.2;

  const motionStyle = motion.enabled === false ? 'static' : (motion.style || 'static');
  const anim = MOTION_ANIM[motionStyle] || {};
  if (MOTION_TITLE_FX[motionStyle] && anim.title) anim.title.effect = MOTION_TITLE_FX[motionStyle];

  const interactionKey = interaction.enabled === false ? 'none' : (interaction.primary || 'none');
  const interactions = {};
  Object.assign(interactions, INTERACTION_MAP[interactionKey] || {});
  if (depth.mode && ['layered', 'perspective', '3d', 'photographic', 'surreal'].includes(depth.mode)) {
    interactions.background = { type: 'parallax', depth: 0.15 };
  }
  // P12：交互强度 → morph / typography_expand / spotlight（语义化，不默认加）
  const iIntensity = Number(interaction.intensity) || 0;
  const iDisc = Number(interaction.discoverability) || 0;
  if (iIntensity >= 0.8) interactions.title = { type: 'hover', effect: 'morph' };
  else if (iIntensity >= 0.5 && interactions.title && interactions.title.effect === 'color-shift') interactions.title.effect = 'expand';
  if (iDisc > 0.7 || interactionKey === 'cursor' || interactionKey === 'touch') interactions.spotlight = {};

  // TASK-014：语义图形（仅 semantic/functional，decorative 默认不渲染）
  const graphicsList = elementsToGraphics(d.graphic_language || {}, d.composition || {});

  const fx = {};
  if (materiality.medium && materiality.medium !== 'digital' && materiality.medium !== 'film') fx.grain = 0.5;
  if (color.gradient) fx.glow = 1.4;
  if (densityVal > 0.75) fx.grain = Math.max(fx.grain || 0, 0.4);

  return {
    canvas: { width: canvas.width, height: canvas.height, unit: 'px', responsive: true },
    content: {
      title: opts.title || 'UNTITLED',
      subtitle: opts.subtitle || '',
      date: opts.date || '',
      location: opts.location || '',
      price: opts.price || '',
      cta: opts.cta || '',
      metadata: { brand: opts.brand || '', tag: opts.tag || (movements.length ? movements[0].toUpperCase() : '') },
    },
    style: {
      colors,
      typography: {
        fontFamily,
        bodyFont: "'Helvetica Neue', Arial, sans-serif",
        scaleRatio: 1.25,
        titleScale,
        titleCase: typography.case === 'uppercase' ? 'uppercase' : undefined,
        // P8 Typography-as-Image：方向/裁切/变形/重叠
        titleVertical: typography.orientation === 'vertical' ? true : undefined,
        titleRotate: typography.orientation === 'rotated' ? 6 : typography.orientation === 'mixed' ? -4 : (typography.distortion ? Math.round(typography.distortion * 10 - 4) : undefined),
        titleCrop: typography.cropping ? Math.min(0.7, typography.cropping * 0.5) : undefined,
        titleOverlap: typography.layering === 'overlap' ? true : undefined,
      },
      layout: { gridColumns: cols, gutter: 24, margin, mode: layoutMode, gridType: grid.type && grid.type !== 'radial' ? grid.type : 'custom', breakGrid: grid.break_grid ?? 0, gridVisible: grid.grid_visibility ?? 0.5 },
      ...(Object.keys(fx).length ? { fx } : {}),
      ...(materiality.medium ? { materiality: { medium: materiality.medium, imperfection: materiality.imperfection ?? 0.5, grain: materiality.physicality ?? 0.4 } } : {}),
      ...(graphicsList.length ? { graphics: graphicsList } : {}),
      ...(opts.image ? { imagery: { image: { src: opts.image, ...imageryToSpec(d.imagery || {}), ...(opts.treatment ? (TREATMENT_SPEC[opts.treatment] || {}) : {}) } } } : {}),
    },
    animation: { ...anim, ...(motionStyle !== 'static' ? { motionStyle } : {}) },
    interactions,
    assets: opts.assets || [],
  };
}

export function mixHex(a, b, t) {
  const pa = /^#?([0-9a-f]{6})$/i.exec(String(a || ''));
  const pb = /^#?([0-9a-f]{6})$/i.exec(String(b || ''));
  if (!pa || !pb) return a || '#888';
  const na = parseInt(pa[1], 16), nb = parseInt(pb[1], 16);
  const mix = (x, y) => Math.round(x + (y - x) * t);
  const r = mix((na >> 16) & 255, (nb >> 16) & 255);
  const g = mix((na >> 8) & 255, (nb >> 8) & 255);
  const bl = mix(na & 255, nb & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

/** DesignDNA 类：创建 / 校验 / 序列化 / 加载 / 传给渲染器 */
export class DesignDNA {
  constructor(value) { this.dna = unwrap(value) || {}; }
  static create(source = {}) { return new DesignDNA(source); }
  get movements() { return this.dna.design_movements || []; }
  validate() { return validateDna({ design_vocabulary: this.dna }); }
  risk() { return aiRiskScore(this.dna); }
  serialize() { return JSON.stringify({ design_vocabulary: this.dna }, null, 2); }
  static load(json) {
    const obj = JSON.parse(json);
    return new DesignDNA(obj);
  }
  toSpec(opts = {}) { return dnaToSpec(this.dna, opts); }
}

export default { DesignDNA, dnaToSpec, mixHex };
