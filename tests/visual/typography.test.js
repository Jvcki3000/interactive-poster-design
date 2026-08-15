import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTypeScale, pxToCqw } from '../../engine/typography/index.js';

test('buildTypeScale 默认比例 1.25 / 基数 16', () => {
  const s = buildTypeScale();
  assert.equal(s.xs, 16);
  assert.equal(s.md, 25); // 16 * 1.25^2
  assert.ok(Math.abs(s.display - 48.83) < 0.01); // 16 * 1.25^5
});

test('buildTypeScale 自定义 ratio / base', () => {
  const s = buildTypeScale({ ratio: 2, base: 10 });
  assert.equal(s.xs, 10);
  assert.equal(s.lg, 80);
  assert.equal(s.xl, 160);
});

test('pxToCqw 换算', () => {
  assert.ok(Math.abs(pxToCqw(100, 1200) - 8.3333) < 0.001);
  assert.equal(pxToCqw(0, 1200), 0);
  assert.equal(pxToCqw(50, 0), 50); // 无画布宽度时原样返回
});