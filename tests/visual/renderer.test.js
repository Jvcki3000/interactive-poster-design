import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../../renderer/html/index.js';

const spec = JSON.parse(
  readFileSync(new URL('../../examples/event-poster/spec.json', import.meta.url), 'utf8'),
);

test('缺 canvas 时报错', () => {
  assert.throws(() => render({ content: { title: 'x' } }), /canvas/);
});

test('缺 content.title 时报错', () => {
  assert.throws(() => render({ canvas: { width: 1200, height: 1600 }, content: {} }), /title/);
});

test('渲染出完整 HTML 骨架', () => {
  const html = render(spec);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /id="poster"/);
  assert.match(html, /NIGHT OF SOUND/);
  assert.match(html, /<script>/);
});

test('spec 驱动的交互标记存在', () => {
  const html = render(spec);
  assert.match(html, /data-depth="0\.18"/);
  assert.match(html, /id="cursorLight"/);
  assert.match(html, /id="details"/);
});