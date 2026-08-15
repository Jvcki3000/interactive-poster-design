/**
 * palette — 参考图配色
 *
 * 把参考图提取出的主色板映射成 Design Spec 的角色色
 * （bg/surface/ink/accent/accent2/muted），实现「参考图 → 海报配色」。
 *
 * 提取主色板用 scripts/palette.py（基于 PIL，零 npm 依赖）。
 */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return { r: 255, g: 255, b: 255 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function hueOf(hex) {
  const { r, g, b } = hexToRgb(hex);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return null;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) % 360 + 360) % 360;
}

export function satOf(hex) {
  const { r, g, b } = hexToRgb(hex);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return (mx - mn) / 255;
}


/** 两个十六进制颜色按 t∈[0,1] 混合（t=0 取 a） */
export function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  });
}

/**
 * 主色板 → 角色色映射。
 * @param {Array<{hex: string}>} palette 按占比从高到低排序
 */
export function paletteToColors(palette) {
  if (!Array.isArray(palette) || palette.length === 0) {
    throw new Error('palette 为空，无法生成配色');
  }
  const hexes = palette.map((p) => String(p.hex));
  const lums = hexes.map(luminance);
  const order = hexes.map((_, i) => i).sort((a, b) => lums[a] - lums[b]); // 暗 → 亮
  const darkest = hexes[order[0]];
  const second = hexes[order[1]] ?? darkest;
  const lightest = hexes[order[order.length - 1]];
  const mid = hexes[order[Math.floor((order.length - 1) / 2)]];
  return {
    bg: darkest,
    surface: second,
    ink: lums[order[order.length - 1]] > 0.4 ? lightest : '#f4f2ff',
    accent: mid,
    accent2: hexes[order[order.length - 2]] ?? mid,
    muted: mixHex(lightest, darkest, 0.55),
  };
}

/** 把色板合并进 spec.style.colors（spec 显式颜色优先生效） */
export function applyPalette(spec, palette) {
  const merged = JSON.parse(JSON.stringify(spec));
  merged.style = merged.style ?? {};
  merged.style.colors = { ...paletteToColors(palette), ...(merged.style.colors ?? {}) };
  return merged;
}

export default { paletteToColors, applyPalette, mixHex, luminance, contrast };