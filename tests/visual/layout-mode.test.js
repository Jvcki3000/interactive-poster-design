import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';

const base = {
  canvas: { width: 1200, height: 1600 },
  content: {
    title: 'MODE TEST',
    subtitle: 'SUB',
    date: '1 JAN',
    location: 'X',
    cta: 'GO',
    metadata: { brand: 'B', tag: 'T', lineup: 'L', time: '2', note: 'N' },
  },
  style: {},
};

const MODES = ['classic', 'minimal', 'hero', 'split', 'dynamic'];

test('默认排版为 classic', () => {
  assert.match(render(base), /class="content mode-classic"/);
});

test('每种排版模式都渲染且带对应 class', () => {
  for (const mode of MODES) {
    const spec = JSON.parse(JSON.stringify(base));
    spec.style.layout = { mode };
    const html = render(spec);
    assert.match(html, new RegExp(`class="content mode-${mode}"`), mode);
    assert.ok(!/<div class="content">/.test(html), mode + ' 未替换默认 class');
  }
});

test('非法排版回退 classic', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.layout = { mode: 'nope' };
  assert.match(render(spec), /mode-classic/);
});

test('不同排版产生不同 CSS 规则', () => {
  const htmlSplit = render({ ...base, style: { layout: { mode: 'split' } } });
  const htmlHero = render({ ...base, style: { layout: { mode: 'hero' } } });
  assert.match(htmlSplit, /mode-split/);
  assert.match(htmlHero, /mode-hero/);
  assert.notEqual(htmlSplit, htmlHero);
});