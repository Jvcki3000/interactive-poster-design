import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paletteToColors, applyPalette, mixHex, contrast } from '../../engine/color/palette.js';

test('paletteToColors：最暗→bg，最亮→ink', () => {
  const colors = paletteToColors([
    { hex: '#222222' },
    { hex: '#dddddd' },
    { hex: '#00aaee' },
    { hex: '#555555' },
  ]);
  assert.equal(colors.bg, '#222222');
  assert.equal(colors.ink, '#dddddd');
  assert.ok(colors.accent);
});

test('空 palette 报错', () => {
  assert.throws(() => paletteToColors([]), /palette 为空/);
});

test('mixHex 与 contrast', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.ok(contrast('#ffffff', '#000000') >= 21);
  assert.ok(contrast('#ffffff', '#ffffff') === 1);
});

test('applyPalette 合并进 spec.style.colors', () => {
  const spec = { canvas: { width: 1200, height: 1600 }, content: { title: 'X' }, style: {} };
  const merged = applyPalette(spec, [{ hex: '#101010' }, { hex: '#f0f0f0' }, { hex: '#cc3355' }]);
  assert.equal(merged.style.colors.bg, '#101010');
  assert.equal(merged.style.colors.ink, '#f0f0f0');
});