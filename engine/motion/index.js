/**
 * animation — 动画系统
 *
 * 职责：提供可声明式的动画能力，让 AI 只需输出"动画规则"而非手写 JS。
 * 计划能力（V0.1 起逐步实现）：
 * - ease：常用缓动函数（ease-in / ease-out / ease-in-out / spring...）
 * - tween：数值/样式过渡
 * - keyframes：关键帧动画
 * - timeline：时间线编排（标题逐字出现、图片 zoom 等）
 */
export const eases = {
  linear: (t) => t,
  // TODO: easeIn / easeOut / easeInOut / spring ...
};

export function tween({ from, to, duration, ease, onUpdate }) {
  // TODO(V0.1): 实现数值/样式过渡
  throw new Error('tween() 尚未实现');
}

export function timeline(segments) {
  // TODO(V0.1): 按时间线顺序/并行执行动画段
  throw new Error('timeline() 尚未实现');
}

export default { eases, tween, timeline };
