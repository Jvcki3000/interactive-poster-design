import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, resolveSize } from '../../engine/design-dna/vocab.js';
import { buildPlan } from '../../engine/design-plan/index.js';

test('尺寸预设：A4 / 16:9 / 9:16 / 自定义', () => {
  assert.equal(SIZES.a4.width, 794);
  assert.equal(SIZES.a4.height, 1123);
  assert.deepEqual(resolveSize('9:16'), { width: 1080, height: 1920, preset: '9:16', name: '9:16' });
  assert.equal(resolveSize('A4').preset, 'a4');
  const c = resolveSize('1200x1600');
  assert.equal(c.width, 1200);
  assert.equal(c.preset, null);
  assert.equal(resolveSize('bad'), null);
});

test('设计方案：9 个维度齐全', () => {
  const spec = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'T', subtitle: 'S', date: '1 JAN', location: 'X', cta: 'GO', metadata: { brand: 'B', tag: 'T' } },
    style: {
      layout: { mode: 'hero', margin: 64, gridColumns: 12 },
      typography: { fontFamily: "'Arial Black', Arial, sans-serif", scaleRatio: 1.25, titleScale: 2.4 },
      colors: { bg: '#0a0a0a', ink: '#f5f5f5', accent: '#e30613', accent2: '#888', surface: '#161616', muted: '#777' },
    },
    interactions: { title: { type: 'hover', effect: 'glitch' }, cursor: { type: 'ring' } },
  };
  const plan = buildPlan(spec);
  assert.equal(Object.keys(plan.dimensions).length, 9);
  for (const k of ['Visual Direction', 'Typography', 'Color System', 'Composition', 'Image Treatment', 'Grid', 'Hierarchy', 'Negative Space', 'Texture']) {
    assert.ok(k in plan.dimensions, k);
  }
  assert.match(plan.md, /# 设计方案 · T/);
  assert.match(plan.md, /九维设计语言/);
  assert.ok(plan.dimensions['Color System'].value.includes('#e30613'));
  assert.ok(plan.interactions.includes('标题悬停:glitch'));
});

test('设计方案：sans-serif 不被误判为衬线', () => {
  const spec = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'T' },
    style: { typography: { fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif" } },
  };
  const plan = buildPlan(spec);
  assert.match(plan.dimensions.Typography.value, /condensed|grotesque/i);
  assert.ok(!plan.dimensions.Typography.value.includes('Serif 衬线'));
});

test('设计方案可带参考图指纹', () => {
  const spec = { canvas: { width: 1200, height: 1600 }, content: { title: 'X' }, style: {} };
  const plan = buildPlan(spec, { fingerprint: { palette: [{ hex: '#111' }], is_dark: true, temperature: 'cold', layout: { guess: 'hero' } } });
  assert.match(plan.md, /参考图分析/);
});