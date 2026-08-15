import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardColors, dnaAestheticRisk } from '../../engine/color/anti-ai.js';
import { elementsToGraphics, buildGraphicsSvg } from '../../engine/graphics/index.js';
import { dnaToSpec } from '../../engine/design-dna/index.js';
import { getDnaPreset } from '../../engine/design-dna/dna-presets.js';
import { render } from '../../renderer/html/index.js';

test('TASK-010：风险>0.6 的 DNA 自动换安全色板', () => {
  const dna = { design_vocabulary: { color: { gradient: true, palette: ['#7c3aed', '#06b6d4', '#ec4899'] }, graphic_language: { elements: ['particles', 'line'] } } };
  assert.ok(dnaAestheticRisk(dna) > 0.6, '前置风险应高');
  const g = guardColors(dna);
  assert.equal(g.changed, true);
  const after = g.dna.design_vocabulary.color;
  assert.equal(after.gradient, false);
  assert.ok(dnaAestheticRisk(g.dna) < 0.2, '换色后风险应低，got ' + dnaAestheticRisk(g.dna));
  // 粒子被移除
  assert.ok(!g.dna.design_vocabulary.graphic_language.elements.includes('particles'));
});

test('TASK-010：低风险 DNA 不动', () => {
  const dna = { design_vocabulary: { color: { gradient: false, palette: ['#111111', '#F4F1EA', '#E63329'] } } };
  const g = guardColors(dna);
  assert.equal(g.changed, false);
});

test('TASK-014：语义图形 — semantic/functional 生成，decorative 默认剔除', () => {
  const gl = { elements: ['number', 'grid', 'barcode', 'coordinate'], symbolism: 'semantic' };
  const gs = elementsToGraphics(gl, {});
  assert.ok(gs.some((g) => g.type === 'number'));
  assert.ok(gs.some((g) => g.type === 'grid'));
  const deco = elementsToGraphics({ elements: ['circle'], symbolism: 'decorative' }, {});
  assert.equal(deco.length, 0, 'decorative 默认不渲染');
});

test('TASK-014：buildGraphicsSvg 产出 SVG', () => {
  const svg = buildGraphicsSvg([{ type: 'barcode', x: 8, y: 8, w: 18, h: 7 }, { type: 'number', x: 10, y: 80, text: '01', size: 14 }]);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('<rect'));
  assert.ok(svg.includes('<text'));
});

test('TASK-015：材质层渲染 — DNA materiality(xerox) → spec.materiality → HTML 材质层', () => {
  const dna = getDnaPreset('photocopy-punk');
  const spec = dnaToSpec(dna, { title: 'X' });
  assert.ok(spec.style.materiality, '应有 materiality');
  assert.ok(spec.style.graphics && spec.style.graphics.length, '应有语义图形');
  const html = render(spec);
  assert.ok(html.includes('materiality-photocopied') || html.includes('materiality-xerox'), '应有材质层');
  assert.ok(html.includes('class="layer graphics"'), '应有图形层');
  assert.ok(html.includes('<svg'), '图形层应含 SVG');
});

test('P7：网格类型渲染 — baseline/broken/modular + breakGrid 叠加层', () => {
  const base = { canvas: { width: 1080, height: 1620 }, content: { title: 'G', metadata: { brand: 'B', tag: 'T' } }, style: {} };
  const baseline = JSON.parse(JSON.stringify(base)); baseline.style.layout = { mode: 'hero', gridType: 'baseline' };
  const hb = render(baseline);
  assert.ok(hb.includes('class="layer grid-lines"'), '应有网格层');
  assert.ok(hb.includes('--grid-vis'), '应有可见度变量');
  const broken = JSON.parse(JSON.stringify(base)); broken.style.layout = { mode: 'hero', gridType: 'broken', breakGrid: 0.6 };
  const hk = render(broken);
  assert.ok(hk.includes('grid-broken'), 'breakGrid 应叠加 broken 层');
  // DNA grid 映射
  const spec = dnaToSpec(getDnaPreset('swiss-international'), { title: 'X' });
  assert.equal(spec.style.layout.gridType, '12_column');
  assert.ok(spec.style.layout.breakGrid >= 0);
});

test('P8：Typography-as-Image — 旋转/纵向/裁切/重叠/超大', () => {
  const base = { canvas: { width: 1080, height: 1620 }, content: { title: 'T', metadata: { brand: 'B' } }, style: {} };
  const cases = [['data-rotate', { titleRotate: 8 }], ['data-vertical', { titleVertical: true }], ['data-crop', { titleCrop: 0.5 }], ['data-overlap', { titleOverlap: true }]];
  for (const [attr, t] of cases) {
    const sp = JSON.parse(JSON.stringify(base)); sp.style.typography = t;
    assert.ok(render(sp).includes(attr), attr + ' 应渲染');
  }
  const big = JSON.parse(JSON.stringify(base)); big.style.typography = { titleOversize: 1.4 };
  assert.ok(render(big).includes('font-size:'), '超大标题应内联字号');
});

test('P11：Motion 独立动效 — 类名 + 关键帧；静态无类', () => {
  const base = { canvas: { width: 1080, height: 1620 }, content: { title: 'M', metadata: { brand: 'B' } }, style: {}, animation: {} };
  const kin = JSON.parse(JSON.stringify(base)); kin.animation.motionStyle = 'kinetic';
  const hk = render(kin);
  assert.ok(hk.includes('class="poster motion-kinetic"'));
  assert.ok(hk.includes('@keyframes mkTitle'));
  const st = JSON.parse(JSON.stringify(base)); st.animation.motionStyle = 'static';
  assert.ok(!render(st).includes('motion-static'), 'static 不加类');
  // DNA 映射：rave→kinetic，museum→无
  assert.equal(dnaToSpec(getDnaPreset('techno-rave'), { title: 'X' }).animation.motionStyle, 'kinetic');
  assert.equal(dnaToSpec(getDnaPreset('museum-minimal'), { title: 'X' }).animation.motionStyle, undefined);
});

test('P12：Interaction — spotlight 层 + morph/expand 效果 + DNA 强度映射', () => {
  const base = { canvas: { width: 1080, height: 1620 }, content: { title: 'I', metadata: { brand: 'B' } }, style: {}, interactions: {} };
  const sp = JSON.parse(JSON.stringify(base)); sp.interactions = { spotlight: {} };
  assert.ok(render(sp).includes('id="spotlight"'));
  for (const fx of ['morph', 'expand']) {
    const s2 = JSON.parse(JSON.stringify(base)); s2.interactions.title = { type: 'hover', effect: fx };
    const h = render(s2);
    assert.ok(h.includes('data-effect="' + fx + '"'));
    assert.ok(h.includes('fx-' + fx));
  }
  const rave = dnaToSpec(getDnaPreset('techno-rave'), { title: 'X' });
  assert.equal(rave.interactions.title && rave.interactions.title.effect, 'morph');
  assert.ok(rave.interactions.spotlight, '高 discoverability 应有 spotlight');
});
