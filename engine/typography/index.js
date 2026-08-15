/**
 * typography — 排版模块（Node 侧计算，供 renderer 使用）
 *
 * 原则：文字与排版永远程序化生成，保证 100% 准确。
 */
const KEYS = ['xs', 'sm', 'md', 'lg', 'xl', 'display'];

/**
 * 生成字号阶梯（modular scale）。
 * @param {{ratio?: number, base?: number}} opts
 * @returns {{xs:number, sm:number, md:number, lg:number, xl:number, display:number}} 单位 px
 */
export function buildTypeScale({ ratio = 1.25, base = 16 } = {}) {
  const sizes = {};
  KEYS.forEach((k, i) => {
    sizes[k] = Math.round(base * Math.pow(ratio, i) * 100) / 100;
  });
  return sizes;
}

/**
 * 把 px 转换为 cqw（container query width 单位）。
 * 海报以画布宽度为 100cqw，因此 1cqw = canvas.width / 100 px。
 * @param {number} px
 * @param {number} canvasWidth 画布宽度 px
 */
export function pxToCqw(px, canvasWidth) {
  if (!canvasWidth) return px;
  return Math.round((px / (canvasWidth / 100)) * 10000) / 10000;
}

/**
 * 简单文本溢出规避：按字符数估算换行（精确测量留给浏览器端 fitText）。
 * TODO(V0.2): 实现基于 canvas measureText 的精确适配。
 */
export function fitText() {
  throw new Error('fitText() 尚未实现（V0.2 计划）');
}

export default { buildTypeScale, pxToCqw, fitText };