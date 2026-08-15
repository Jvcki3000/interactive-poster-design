import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';

const base = {
  canvas: { width: 1200, height: 1600 },
  content: {
    title: 'FX',
    subtitle: 'S',
    date: '1 JAN',
    location: 'X',
    cta: 'GO',
    metadata: { brand: 'B', tag: 'T' },
  },
  style: {},
};

test('交互词汇：glitch / explode / cursorRing / repel 按 spec 生效', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.imagery = { ball: { depth: 0.4 } };
  spec.interactions = {
    title: { type: 'hover', effect: 'glitch', click: 'explode' },
    cursor: { type: 'ring' },
    ball: { repel: 0.5 },
  };
  const html = render(spec);
  assert.match(html, /data-effect="glitch"/);
  assert.match(html, /data-click="explode"/);
  assert.match(html, /id="cursorRing"/);
  assert.match(html, /data-repel="0\.5"/);
  assert.match(html, /fx-glitch/);
  assert.match(html, /exploding/);
});

test('默认标题效果仍为 distort 且无环/炸裂', () => {
  const html = render(base);
  assert.match(html, /data-effect="distort"/);
  assert.ok(!html.includes('id="cursorRing"'));
  assert.ok(!html.includes('data-click="explode"'));
});