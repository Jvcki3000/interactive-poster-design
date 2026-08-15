import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listStrategies, generatePalette } from '../../engine/color/strategy.js';
import { contrast } from '../../engine/color/palette.js';

test('21 种色彩策略', () => {
  assert.equal(listStrategies().length, 21);
});

test('每种策略生成 6 个角色色且为合法 hex', () => {
  for (const s of listStrategies()) {
    const { colors } = generatePalette(s.key, 42);
    const keys = ['bg', 'surface', 'ink', 'accent', 'accent2', 'muted'];
    for (const k of keys) {
      assert.match(colors[k], /^#[0-9a-f]{6}$/i, `${s.key}.${k}`);
    }
  }
});

test('同 seed 可复现，不同 seed 不同', () => {
  const a = generatePalette('high-contrast', 7);
  const b = generatePalette('high-contrast', 7);
  const c = generatePalette('high-contrast', 8);
  assert.deepEqual(a.colors, b.colors);
  assert.notDeepEqual(a.colors, c.colors);
});

test('对比度修正：正文/背景 ≥4.5，强调/背景 ≥3', () => {
  for (const s of listStrategies()) {
    const { colors } = generatePalette(s.key, 123);
    assert.ok(contrast(colors.ink, colors.bg) >= 4.5, s.key + ' ink/bg');
    assert.ok(contrast(colors.accent, colors.bg) >= 3, s.key + ' accent/bg');
  }
});

test('未知策略报错', () => {
  assert.throws(() => generatePalette('nope', 1), /未知色彩策略/);
});