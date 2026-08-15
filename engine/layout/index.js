/**
 * layout — 版式模块（Node 侧计算，供 renderer 使用）
 */

/**
 * 栅格计算。
 * @param {{columns?: number, gutter?: number, margin?: number, width?: number}} opts
 * @returns {{columns:number, gutter:number, margin:number, col:number, content:number, width:number}}
 */
export function grid({ columns = 12, gutter = 24, margin = 64, width = 1200 } = {}) {
  const content = width - margin * 2;
  const col = (content - gutter * (columns - 1)) / columns;
  return { columns, gutter, margin, col, content, width };
}

/**
 * Z 轴分层：返回 [{ name, z }]，供视差 / 3D 使用。
 * @param {string[]} layers
 */
export function stack(layers = []) {
  return layers.map((name, i) => ({ name, z: i + 1 }));
}

export default { grid, stack };