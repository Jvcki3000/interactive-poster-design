import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';

const base = {
  canvas: { width: 1200, height: 1600 },
  content: {
    title: 'AURORA',
    subtitle: 'S',
    location: 'X',
    metadata: { brand: 'B', tag: 'T' },
    hotspots: [
      { x: 30, y: 40, r: 9, label: 'THE SUBJECT', detail: 'detail text' },
    ],
  },
  style: {
    imagery: { image: { src: 'photo.jpg', duotone: true, scrim: true, zoom: true } },
  },
};

test('图片层 + 热点渲染，且无按钮', () => {
  const html = render(base);
  assert.match(html, /class="layer image"/);
  assert.match(html, /background-image:url\('photo\.jpg'\)/);
  assert.match(html, /class="hotspot"/);
  assert.match(html, /id="hotspotPopover"/);
  assert.match(html, /data-label="THE SUBJECT"/);
  assert.ok(!html.includes('id="cta"'), '不应有 CTA');
  assert.ok(!html.includes('id="date"'), '不应有日期按钮');
});

test('指定 cta 时才渲染按钮', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.content.cta = 'BUY';
  const html = render(spec);
  assert.match(html, /id="cta"/);
  const spec2 = JSON.parse(JSON.stringify(base));
  const html2 = render(spec2);
  assert.ok(!html2.includes('id="cta"'));
});
test('热点 mode:hover：椭圆区域 + 人物高光 + 浮动信息卡', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery.image.src = 'char.jpg';
  spec.content.hotspots = [
    { x: 50, y: 38, rx: 16, ry: 26, mode: 'hover', label: 'THE HERO', meta: 'PROFILE', detail: 'd', sections: [{ heading: 'Name', text: 'X' }] },
    { x: 20, y: 80, r: 8, mode: 'click', label: 'SCENE', detail: 'click me' },
  ];
  const html = render(spec);
  assert.match(html, /data-mode="hover"/);
  assert.match(html, /--hrx:16%;--hry:26%/);
  assert.match(html, /class="hs-glow"/);
  assert.match(html, /id="hpFloat"/);
  assert.match(html, /char-hover/);
  assert.match(html, /function showFloat/);
  assert.match(html, /function hideFloat/);
  assert.match(html, /data-mode="click"/);
});

test('无 hover 热点时不渲染浮动卡', () => {
  const html = render(base);
  assert.ok(!html.includes('id="hpFloat"'));
});

test('imagery.image.silhouette：渲染 person-glow 剪影高亮 + 掩膜命中逻辑', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery.image = { src: 'photo.png', silhouette: 'cut.png' };
  spec.content.hotspots = [{ x: 50, y: 50, rx: 20, ry: 30, mode: 'hover', label: 'H', detail: 'd', mask: 'm.png' }];
  const html = render(spec);
  assert.match(html, /class="layer person-glow"/);
  assert.match(html, /cut\.png/);
  assert.match(html, /hasSilhouette/);
  assert.match(html, /function hitMask/);
  assert.match(html, /function loadMask/);
  assert.match(html, /function findHit/);
  assert.match(html, /data-mask="m\.png"/);
  assert.match(html, /person-glow \{/);
  assert.match(html, /char-hover \.person-glow/);
});

test('多人物：每个 hover 热点带独立掩膜 data-mask', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery.image = { src: 'photo.png', silhouette: 'cut.png' };
  spec.content.hotspots = [
    { x: 30, y: 50, rx: 20, ry: 30, mode: 'hover', label: 'A', detail: 'd', mask: 'a.png' },
    { x: 70, y: 50, rx: 20, ry: 30, mode: 'hover', label: 'B', detail: 'd', mask: 'b.png' },
  ];
  const html = render(spec);
  assert.match(html, /data-mask="a\.png"/);
  assert.match(html, /data-mask="b\.png"/);
  assert.match(html, /spotMasks|spots/);
});

test('热点 interaction:"highlight"：渲染 data-interaction，悬停只高亮不弹窗', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery.image = { src: 'photo.png', silhouette: 'cut.png' };
  spec.content.hotspots = [{ x: 50, y: 50, rx: 20, ry: 30, mode: 'hover', interaction: 'highlight', label: 'H', detail: 'd' }];
  const html = render(spec);
  assert.match(html, /data-interaction="highlight"/);
  assert.match(html, /getAttribute\('data-interaction'\) === 'highlight'/);
  assert.match(html, /floatCard\.classList\.remove\('open'\)/);
});

test('style.switchPhases：渲染风格切换按钮 + 相位规则 + 循环 JS', () => {
  const spec = {
    canvas: { width: 1080, height: 1620 },
    content: { title: 'SWITCH', metadata: { brand: 'B', tag: 'T' } },
    style: {
      colors: { bg: '#0a0a14', ink: '#f4f2ff', accent: '#ff2bd6' },
      typography: { fontFamily: 'Arial', bodyFont: 'Arial' },
      switchPhases: [
        { name: 'NEON', colors: { bg: '#0a0a14', ink: '#f4f2ff', accent: '#ff2bd6' } },
        { name: 'WARM', colors: { bg: '#241610', ink: '#f4ece0', accent: '#c9a86a' } },
      ],
    },
  };
  const html = render(spec);
  assert.match(html, /id="styleSwitch"/);
  assert.match(html, /class="style-switch"/);
  assert.match(html, /function ssApply/);
  assert.match(html, /STYLE \u00B7/);
  assert.match(html, /--bg: #241610/);
});

test('hotspot action link：渲染 data-action + hotspotAction（window.open）', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.content.hotspots = [{ x: 50, y: 50, rx: 10, ry: 10, mode: 'hover', label: 'L', detail: 'd', action: { type: 'link', url: 'https://example.com' } }];
  const html = render(spec);
  assert.match(html, /data-action="/);
  assert.match(html, /function hotspotAction/);
  assert.match(html, /window\.open\(a\.url/);
});

test('switchPhases[].image + hideStyleSwitch：零按钮图片级切换 + 点击主体 action:phase', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery = { image: { src: 'classic.jpg' } };
  spec.style.hideStyleSwitch = true;
  spec.style.layout = { mode: 'minimal', middleAlign: '32%' };
  spec.style.typography = { fontFamily: 'Georgia', titleBlend: 'screen' };
  spec.style.switchPhases = [
    { name: 'CLASSIC', image: 'classic.jpg', colors: { bg: '#1a120b', ink: '#f4ead8', accent: '#c9a86a' } },
    { name: 'CYBER', image: 'cyber.png', colors: { bg: '#05010d', ink: '#f4f2ff', accent: '#00e5ff' } },
  ];
  spec.content.hotspots = [{ x: 50, y: 46, rx: 35, ry: 38, mode: 'click', quiet: true, dot: false, label: '', detail: '', action: { type: 'phase' } }];
  const html = render(spec);
  assert.ok(!html.includes('id="styleSwitch"'), '零按钮：不渲染 STYLE 按钮');
  assert.match(html, /id="phaseChip"/);
  assert.match(html, /function ssSwapImage/);
  assert.match(html, /window.__ssCycle = function/);
  assert.match(html, /a.type === 'phase'/);
  assert.match(html, /data-action=\"{&quot;type&quot;:&quot;phase&quot;}\"/);
  assert.match(html, /data-quiet=\"1\"/);
  assert.ok(!html.includes('class="hs-dot"'), 'quiet 热点不渲染圆点');
  assert.match(html, /top: 32%/);
  assert.match(html, /mix-blend-mode: screen/);
  assert.match(html, /ssSwapImage\(i\)/);
});
