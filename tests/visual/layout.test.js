import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grid, stack } from '../../engine/layout/index.js';

test('grid 默认值', () => {
  const g = grid();
  assert.equal(g.columns, 12);
  assert.equal(g.margin, 64);
  assert.equal(g.content, 1200 - 64 * 2);
  assert.ok(Math.abs(g.col - (1200 - 128 - 24 * 11) / 12) < 1e-9);
});

test('grid 自定义', () => {
  const g = grid({ width: 800, columns: 6, gutter: 16, margin: 32 });
  assert.equal(g.content, 736);
  assert.ok(Math.abs(g.col - (736 - 16 * 5) / 6) < 1e-9);
});

test('stack 分配 Z 轴', () => {
  assert.deepEqual(stack(['bg', 'glow', 'content']), [
    { name: 'bg', z: 1 },
    { name: 'glow', z: 2 },
    { name: 'content', z: 3 },
  ]);
});