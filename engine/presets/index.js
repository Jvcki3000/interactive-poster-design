/**
 * presets — 风格预设（Style Presets）
 *
 * 同一份内容，套用不同预设即可产出不同视觉风格的海报。
 * 预设只提供 style 默认值，spec 中显式给出的字段优先生效。
 */
export const presets = {
  swiss: {
    name: 'Swiss 瑞士国际主义',
    colors: {
      bg: '#f2f0ea',
      surface: '#ffffff',
      ink: '#111111',
      accent: '#e30613',
      accent2: '#111111',
      muted: '#6b6860',
    },
    typography: {
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      scaleRatio: 1.2,
    },
    layout: { margin: 88, gridColumns: 12, mode: 'classic' },
  },
  editorial: {
    name: 'Editorial 杂志编辑',
    colors: {
      bg: '#faf6ef',
      surface: '#ffffff',
      ink: '#1a1512',
      accent: '#b3422f',
      accent2: '#2f6d5e',
      muted: '#7a7267',
    },
    typography: {
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
      bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      scaleRatio: 1.3,
    },
    layout: { margin: 72, gridColumns: 8, mode: 'split' },
  },
  minimal: {
    name: 'Minimal 极简',
    colors: {
      bg: '#ffffff',
      surface: '#f2f2f2',
      ink: '#111111',
      accent: '#111111',
      accent2: '#888888',
      muted: '#999999',
    },
    typography: {
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      scaleRatio: 1.35,
    },
    layout: { margin: 120, gridColumns: 12, mode: 'minimal' },
  },
  experimental: {
    name: 'Experimental 实验',
    colors: {
      bg: '#12001a',
      surface: '#1d0a2b',
      ink: '#f9f2ff',
      accent: '#ff2bd6',
      accent2: '#7dfc00',
      muted: '#9a8faa',
    },
    typography: {
      fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      bodyFont: "'Helvetica Neue', Arial, sans-serif",
      scaleRatio: 1.4,
    },
    layout: { margin: 56, gridColumns: 12, mode: 'dynamic' },
  },
  cyberpunk: {
    name: 'Cyberpunk 赛博朋克',
    colors: {
      bg: '#050510',
      surface: '#0c0c24',
      ink: '#e8f6ff',
      accent: '#00f0ff',
      accent2: '#ff003c',
      muted: '#6e7f96',
    },
    typography: {
      fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      bodyFont: "'Helvetica Neue', Arial, sans-serif",
      scaleRatio: 1.28,
    },
    layout: { margin: 64, gridColumns: 12, mode: 'hero' },
  },
};

/**
 * 把预设合并进 spec.style（预设为默认值，spec 显式值优先生效）。
 * @param {object} spec
 * @param {string} name 预设名
 * @returns {object} 新的 spec（不修改入参）
 */
export function applyPreset(spec, name) {
  const p = presets[name];
  if (!p) {
    throw new Error(`未知预设 "${name}"，可选: ${Object.keys(presets).join(', ')}`);
  }
  const merged = JSON.parse(JSON.stringify(spec));
  merged.style = merged.style ?? {};
  merged.style.colors = { ...p.colors, ...(merged.style.colors ?? {}) };
  merged.style.typography = { ...p.typography, ...(merged.style.typography ?? {}) };
  merged.style.layout = { ...p.layout, ...(merged.style.layout ?? {}) };
  merged.style.imagery = { ...(p.imagery ?? {}), ...(merged.style.imagery ?? {}) };
  return merged;
}

export function listPresets() {
  return Object.entries(presets).map(([key, p]) => ({ key, ...p }));
}

export default { presets, applyPreset, listPresets };