// graphics — 语义图形系统（TASK-014）：把 graphic_language.elements 渲染成有语义的 SVG，而不是随机装饰。
// 默认：只有 semantic/functional 元素进渲染；decorative 默认不产生（除非显式要求）。
function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(v, d = 0) { return Number(v).toFixed(d); }

function text(g, x, y, str, size, fill, extra = '') {
  return '<text x="' + fmt(x, 2) + '" y="' + fmt(y, 2) + '" font-size="' + fmt(size, 2) + '" fill="' + fill + '" font-family="Arial Black, Helvetica, sans-serif" ' + extra + '>' + escapeHtml(str) + '</text>';
}

function drawGrid(g) {
  const x = g.x, y = g.y, w = g.w || 30, h = g.h || 30;
  const cols = 4, rows = 4, stroke = g.stroke || '#666';
  let out = '';
  for (let i = 1; i < cols; i++) out += '<line x1="' + fmt(x + (w * i) / cols) + '" y1="' + fmt(y) + '" x2="' + fmt(x + (w * i) / cols) + '" y2="' + fmt(y + h) + '" stroke="' + stroke + '" stroke-width="' + (g.weight || 0.3) + '"/>';
  for (let j = 1; j < rows; j++) out += '<line x1="' + fmt(x) + '" y1="' + fmt(y + (h * j) / rows) + '" x2="' + fmt(x + w) + '" y2="' + fmt(y + (h * j) / rows) + '" stroke="' + stroke + '" stroke-width="' + (g.weight || 0.3) + '"/>';
  out += '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(w) + '" height="' + fmt(h) + '" fill="none" stroke="' + stroke + '" stroke-width="' + (g.weight || 0.3) + '"/>';
  return out;
}

function drawNumber(g) {
  const x = g.x, y = g.y + (g.size || 18) * 0.8;
  return text(g, x, y, g.text || '01', g.size || 18, g.fill || 'var(--accent)', 'font-weight="900" letter-spacing="0.1em"');
}

function drawBarcode(g) {
  const x = g.x, y = g.y, w = g.w || 20, h = g.h || 10;
  const n = 24, stroke = g.stroke || 'var(--ink)';
  let out = '';
  for (let i = 0; i < n; i++) {
    const bw = (w / n) * (i % 3 === 0 ? 2.2 : i % 4 === 1 ? 1 : 1.4);
    out += '<rect x="' + fmt(x + (w / n) * i) + '" y="' + fmt(y) + '" width="' + fmt(bw) + '" height="' + fmt(h) + '" fill="' + stroke + '"/>';
  }
  return out;
}

function drawCoordinate(g) {
  const x = g.x, y = g.y, w = g.w || 24, h = g.h || 16;
  const stroke = g.stroke || 'var(--ink)';
  let out = '';
  out += '<line x1="' + fmt(x) + '" y1="' + fmt(y) + '" x2="' + fmt(x + w) + '" y2="' + fmt(y) + '" stroke="' + stroke + '" stroke-width="' + (g.weight || 0.3) + '"/>';
  out += '<line x1="' + fmt(x) + '" y1="' + fmt(y) + '" x2="' + fmt(x) + '" y2="' + fmt(y + h) + '" stroke="' + stroke + '" stroke-width="' + (g.weight || 0.3) + '"/>';
  for (let i = 1; i <= 4; i++) out += '<line x1="' + fmt(x + (w * i) / 5) + '" y1="' + fmt(y - 0.6) + '" x2="' + fmt(x + (w * i) / 5) + '" y2="' + fmt(y + 0.6) + '" stroke="' + stroke + '" stroke-width="0.3"/>';
  for (let j = 1; j <= 3; j++) out += '<line x1="' + fmt(x - 0.6) + '" y1="' + fmt(y + (h * j) / 4) + '" x2="' + fmt(x + 0.6) + '" y2="' + fmt(y + (h * j) / 4) + '" stroke="' + stroke + '" stroke-width="0.3"/>';
  out += text(g, x + w * 0.6, y + h + 2.5, (g.text || 'X 01 02 03 04').slice(0, 14), 2.2, g.fill || 'var(--muted)', 'letter-spacing="0.2em"');
  return out;
}

function drawAnnotation(g) {
  const x = g.x, y = g.y, w = g.w || 18, h = g.h || 10;
  const stroke = g.stroke || 'var(--accent)';
  let out = '';
  out += '<circle cx="' + fmt(x) + '" cy="' + fmt(y) + '" r="0.8" fill="' + stroke + '"/>';
  out += '<line x1="' + fmt(x) + '" y1="' + fmt(y) + '" x2="' + fmt(x + w) + '" y2="' + fmt(y + h) + '" stroke="' + stroke + '" stroke-width="0.3"/>';
  out += text(g, x + w, y + h + 2, g.text || 'NOTE 01', 2.4, g.fill || 'var(--ink)', 'letter-spacing="0.15em"');
  return out;
}

function drawDiagram(g) {
  const x = g.x, y = g.y, w = g.w || 24, h = g.h || 14;
  const stroke = g.stroke || 'var(--accent)';
  const bars = [0.4, 0.7, 0.5, 0.9, 0.65];
  let out = '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(w) + '" height="' + fmt(h) + '" fill="none" stroke="' + stroke + '" stroke-width="0.3"/>';
  const bw = w / bars.length;
  bars.forEach((v, i) => {
    const bh = v * h;
    out += '<rect x="' + fmt(x + i * bw + 0.6) + '" y="' + fmt(y + h - bh) + '" width="' + fmt(bw - 1.2) + '" height="' + fmt(bh) + '" fill="' + stroke + '" opacity="0.75"/>';
  });
  return out;
}

const DRAWS = { grid: drawGrid, number: drawNumber, barcode: drawBarcode, coordinate: drawCoordinate, annotation: drawAnnotation, diagram: drawDiagram, chart: drawDiagram };

/** 生成语义图形 SVG（viewBox 0-100，% 定位）。graphics: [{type,x,y,w,h,text,size,stroke,fill,weight,symbolism}] */
export function buildGraphicsSvg(graphics = []) {
  const parts = graphics.map((g) => {
    const fn = DRAWS[g.type];
    if (!fn) return '';
    try { return fn(g); } catch (e) { return ''; }
  }).filter(Boolean);
  if (!parts.length) return '';
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' + parts.join('') + '</svg>';
}

/** 从 DNA 的 graphic_language 生成 spec.graphics（仅 semantic/functional，decorative 默认剔除） */
export function elementsToGraphics(graphicLanguage = {}, composition = {}) {
  const els = Array.isArray(graphicLanguage.elements) ? graphicLanguage.elements : [];
  const symbolism = graphicLanguage.symbolism || 'semantic';
  if (symbolism === 'decorative') return []; // 默认 decorative 不渲染
  const pos = { x: 8, y: 88, w: 24, h: 12 };
  const out = [];
  if (els.includes('number')) out.push({ type: 'number', x: pos.x, y: pos.y, text: '01', size: 16, symbolism: 'semantic' });
  if (els.includes('grid')) out.push({ type: 'grid', x: 6, y: 70, w: 20, h: 18, symbolism: 'functional' });
  if (els.includes('barcode')) out.push({ type: 'barcode', x: 8, y: 8, w: 18, h: 7, symbolism: 'functional' });
  if (els.includes('coordinate')) out.push({ type: 'coordinate', x: 74, y: 82, w: 18, h: 12, symbolism: 'functional' });
  if (els.includes('annotation')) out.push({ type: 'annotation', x: 46, y: 30, w: 18, h: 10, text: 'NOTE', symbolism: 'semantic' });
  if (els.includes('chart') || els.includes('diagram')) out.push({ type: 'diagram', x: 70, y: 60, w: 22, h: 12, symbolism: 'functional' });
  return out;
}

export default { buildGraphicsSvg, elementsToGraphics };
