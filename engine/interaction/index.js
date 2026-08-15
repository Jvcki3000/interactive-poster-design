/**
 * interaction — 交互系统
 *
 * 职责：把"交互地图（Interaction Map）"转成实际 DOM 事件行为。
 * AI 只需声明：Title→hover→distortion、Portrait→mousemove→parallax……
 *
 * V0.1 计划能力：
 * - parallax：鼠标视差（多 Z 轴元素）
 * - hover：悬停动画（变形 / 磁吸按钮）
 * - click：点击展开 / 触发动画
 * - cursorLight：光标跟随光晕
 * - scroll：滚动动画
 */
export function attachInteractions(rootEl, interactionMap) {
  // TODO(V0.1): 根据 interactionMap 绑定事件
  // { title: { type: 'hover', effect: 'distortion' }, ... }
  throw new Error('attachInteractions() 尚未实现');
}

export default { attachInteractions };
