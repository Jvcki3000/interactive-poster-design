/**
 * color-strategy — 色彩策略生成器（P0：Color Strategy）
 *
 * 不"想一个颜色"，而是先选择一种色彩策略，再按策略生成整套角色色。
 * 支持 12 种策略：monochrome / duotone / triadic / analogous / complementary /
 * muted / high-contrast / black-accent / warm-neutral / cold-neutral /
 * unexpected-accent / no-color。
 *
 * 生成后自动修正对比度：正文/背景 ≥4.5:1，强调色/背景 ≥3:1。
 */
import { contrast, mixHex } from './palette.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

function fixContrast(colors, target = 4.5) {
  let c = { ...colors };
  for (let i = 0; i < 12 && contrast(c.ink, c.bg) < target; i++) {
    const darkGain = contrast(c.ink, mixHex(c.bg, '#000000', 0.18));
    const lightGain = contrast(mixHex(c.ink, '#ffffff', 0.18), c.bg);
    if (darkGain >= lightGain) c.bg = mixHex(c.bg, '#000000', 0.18);
    else c.ink = mixHex(c.ink, '#ffffff', 0.18);
  }
  for (let i = 0; i < 10 && contrast(c.accent, c.bg) < 3; i++) {
    c.accent = mixHex(c.accent, '#ffffff', 0.2);
  }
  return c;
}

const STRATEGIES = {
  monochrome: {
    name: 'Monochrome',
    desc: '单一色相，靠明度变化建立层次',
    make: (h, r) => ({
      bg: hslToHex(h, 22, 10), surface: hslToHex(h, 18, 15),
      ink: hslToHex(h, 14, 90), accent: hslToHex(h, 28, 62),
      accent2: hslToHex(h, 18, 42), muted: hslToHex(h, 10, 52),
    }),
  },
  duotone: {
    name: 'Duotone',
    desc: '双色相：暗底 + 互补强调',
    make: (h, r) => ({
      bg: hslToHex(h, 30, 9), surface: hslToHex(h, 24, 14),
      ink: hslToHex(h, 18, 92), accent: hslToHex(h + 120, 65, 50),
      accent2: hslToHex(h + 120, 45, 34), muted: hslToHex(h, 12, 55),
    }),
  },
  triadic: {
    name: 'Triadic',
    desc: '三个均布色相（120° 间隔）',
    make: (h, r) => ({
      bg: hslToHex(h, 28, 10), surface: hslToHex(h, 22, 16),
      ink: hslToHex(h, 15, 90), accent: hslToHex(h + 120, 60, 48),
      accent2: hslToHex(h + 240, 55, 46), muted: hslToHex(h, 10, 54),
    }),
  },
  analogous: {
    name: 'Analogous',
    desc: '相邻色相（±30°），柔和过渡',
    make: (h, r) => ({
      bg: hslToHex(h, 26, 10), surface: hslToHex(h, 20, 15),
      ink: hslToHex(h + 10, 16, 90), accent: hslToHex(h + 25, 55, 46),
      accent2: hslToHex(h + 45, 45, 38), muted: hslToHex(h, 12, 52),
    }),
  },
  complementary: {
    name: 'Complementary',
    desc: '互补色相（180°），强对比',
    make: (h, r) => ({
      bg: hslToHex(h, 30, 10), surface: hslToHex(h, 24, 15),
      ink: hslToHex(h, 15, 90), accent: hslToHex(h + 180, 62, 48),
      accent2: hslToHex(h + 180, 45, 34), muted: hslToHex(h, 12, 54),
    }),
  },
  muted: {
    name: 'Muted',
    desc: '低饱和暖灰调，克制复古',
    make: (h, r) => ({
      bg: hslToHex(h, 10, 88), surface: hslToHex(h, 12, 95),
      ink: hslToHex(h, 14, 16), accent: hslToHex(h + 30, 24, 44),
      accent2: hslToHex(h, 16, 38), muted: hslToHex(h, 8, 52),
    }),
  },
  'high-contrast': {
    name: 'High Contrast',
    desc: '近黑底 + 近白字 + 饱和强调',
    make: (h, r) => ({
      bg: '#0b0b0e', surface: '#18181d',
      ink: '#f4f2ee', accent: hslToHex(h, 80, 55),
      accent2: hslToHex(h + 60, 70, 50), muted: '#8a8a92',
    }),
  },
  'black-accent': {
    name: 'Black + Accent',
    desc: '黑白基底 + 单一强调色',
    make: (h, r) => ({
      bg: '#0a0a0a', surface: '#161616',
      ink: '#f5f5f5', accent: hslToHex(h, 72, 50),
      accent2: '#8a8a8a', muted: '#7d7d7d',
    }),
  },
  'warm-neutral': {
    name: 'Warm Neutral',
    desc: '奶油/暖灰/陶土',
    make: (h, r) => ({
      bg: hslToHex(35, 35, 88), surface: hslToHex(35, 40, 96),
      ink: hslToHex(30, 25, 16), accent: hslToHex(20, 55, 42),
      accent2: hslToHex(40, 25, 34), muted: hslToHex(35, 12, 50),
    }),
  },
  'cold-neutral': {
    name: 'Cold Neutral',
    desc: '冷灰/白/冰蓝',
    make: (h, r) => ({
      bg: hslToHex(215, 18, 90), surface: hslToHex(215, 22, 97),
      ink: hslToHex(215, 25, 15), accent: hslToHex(200, 65, 40),
      accent2: hslToHex(230, 40, 46), muted: hslToHex(215, 12, 50),
    }),
  },
  tritone: {
    name: 'Tritone 三色',
    desc: '三色相：暗底 + 两个高对比强调色',
    make: (h, r) => ({
      bg: hslToHex((h + 20) % 360, 30, 10), surface: hslToHex((h + 20) % 360, 24, 16),
      ink: hslToHex((h + 20) % 360, 12, 92), accent: hslToHex(h, 70, 55),
      accent2: hslToHex((h + 160) % 360, 70, 55), muted: hslToHex((h + 20) % 360, 14, 55),
    }),
  },
  white_and_accent: {
    name: 'White + Accent 白底点缀',
    desc: '白底 + 深字 + 单一强调色，极简高级',
    make: (h, r) => ({
      bg: hslToHex(0, 0, 98), surface: hslToHex(0, 0, 92),
      ink: hslToHex(0, 0, 12), accent: hslToHex(h, 55, 42),
      accent2: hslToHex(h, 35, 60), muted: hslToHex(0, 0, 52),
    }),
  },
  neutral: {
    name: 'Neutral 中性',
    desc: '灰阶为主 + 暖调点缀，冷静克制',
    make: (h, r) => ({
      bg: hslToHex(0, 0, 8), surface: hslToHex(0, 0, 14),
      ink: hslToHex(0, 0, 90), accent: hslToHex(30, 28, 62),
      accent2: hslToHex(0, 0, 40), muted: hslToHex(0, 0, 52),
    }),
  },
  earth: {
    name: 'Earth 大地色',
    desc: '暖土色系：赭/棕/橄榄，自然亲和',
    make: (h, r) => ({
      bg: hslToHex(28, 34, 10), surface: hslToHex(28, 28, 16),
      ink: hslToHex(40, 30, 90), accent: hslToHex(22, 52, 44),
      accent2: hslToHex(80, 24, 40), muted: hslToHex(30, 18, 55),
    }),
  },
  split_complementary: {
    name: 'Split Complementary 分裂互补',
    desc: '主色 + 两侧互补色，调和又对比',
    make: (h, r) => ({
      bg: hslToHex((h + 150) % 360, 28, 10), surface: hslToHex((h + 150) % 360, 22, 16),
      ink: hslToHex((h + 150) % 360, 10, 90), accent: hslToHex(h, 60, 52),
      accent2: hslToHex((h + 210) % 360, 55, 50), muted: hslToHex((h + 150) % 360, 12, 54),
    }),
  },
  pastel: {
    name: 'Pastel 粉彩',
    desc: '高明度低饱和，柔和治愈',
    make: (h, r) => ({
      bg: hslToHex(h, 45, 94), surface: hslToHex(h, 38, 88),
      ink: hslToHex(h, 25, 30), accent: hslToHex(h, 55, 45),
      accent2: hslToHex((h + 60) % 360, 50, 55), muted: hslToHex(h, 20, 62),
    }),
  },
  fluorescent: {
    name: 'Fluorescent 荧光',
    desc: '超高饱和，夜店/音乐场景',
    make: (h, r) => ({
      bg: hslToHex(h, 40, 7), surface: hslToHex(h, 36, 13),
      ink: hslToHex(h, 25, 92), accent: hslToHex(h, 100, 55),
      accent2: hslToHex((h + 170) % 360, 100, 55), muted: hslToHex(h, 30, 45),
    }),
  },
  low_contrast: {
    name: 'Low Contrast 低对比',
    desc: '同色系微差，柔和安静',
    make: (h, r) => ({
      bg: hslToHex(h, 16, 12), surface: hslToHex(h, 14, 17),
      ink: hslToHex(h, 12, 78), accent: hslToHex(h, 20, 55),
      accent2: hslToHex(h, 16, 66), muted: hslToHex(h, 10, 48),
    }),
  },
  colorless: {
    name: 'Colorless 无色',
    desc: '纯黑白灰，最大克制',
    make: (h, r) => ({
      bg: hslToHex(0, 0, 6), surface: hslToHex(0, 0, 13),
      ink: hslToHex(0, 0, 92), accent: hslToHex(0, 0, 70),
      accent2: hslToHex(0, 0, 45), muted: hslToHex(0, 0, 52),
    }),
  },
  'unexpected-accent': {
    name: 'Unexpected Accent',
    desc: '中性基底 + 突兀亮色',
    make: (h, r) => ({
      bg: '#101014', surface: '#1a1a20',
      ink: '#ecebe6', accent: hslToHex(h, 90, 55),
      accent2: hslToHex(h + 40, 80, 48), muted: '#8b8b94',
    }),
  },
  'no-color': {
    name: 'No Color',
    desc: '纯黑白灰，靠层次与留白',
    make: (h, r) => ({
      bg: '#0d0d0d', surface: '#161616',
      ink: '#f2f2f2', accent: '#8a8a8a',
      accent2: '#555555', muted: '#777777',
    }),
  },
};

export function listStrategies() {
  return Object.entries(STRATEGIES).map(([key, s]) => ({ key, ...s }));
}

/**
 * 按策略生成配色。
 * @param {string} strategy 策略 key
 * @param {number} [seed] 随机种子（默认随机），同种子可复现
 * @param {number} [hue] 指定基色相（0-359），默认由种子决定
 */
export function generatePalette(strategy, seed = Date.now(), hue) {
  const s = STRATEGIES[strategy];
  if (!s) {
    throw new Error(`未知色彩策略 "${strategy}"，可选: ${Object.keys(STRATEGIES).join(', ')}`);
  }
  const rnd = mulberry32(seed);
  const baseHue = hue ?? Math.floor(rnd() * 360);
  return {
    strategy,
    strategyName: s.name,
    seed,
    colors: fixContrast(s.make(baseHue, rnd)),
  };
}

export default { listStrategies, generatePalette };