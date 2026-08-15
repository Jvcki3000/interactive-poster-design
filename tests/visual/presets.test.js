import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presets, applyPreset, listPresets } from '../../engine/presets/index.js';

test('预设数量与命名', () => {
  assert.deepEqual(Object.keys(presets).sort(), ['cyberpunk', 'editorial', 'experimental', 'minimal', 'swiss']);
  assert.equal(listPresets().length, 5);
});

test('未知预设报错', () => {
  assert.throws(() => applyPreset({}, 'nope'), /未知预设/);
});

test('预设提供默认值，spec 显式值优先生效', () => {
  const spec = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'X' },
    style: { colors: { accent: '#123456' } },
  };
  const merged = applyPreset(spec, 'swiss');
  assert.equal(merged.style.colors.accent, '#123456'); // spec 显式值保留
  assert.equal(merged.style.colors.bg, '#f2f0ea');     // 预设默认值生效
  assert.equal(merged.style.typography.scaleRatio, 1.2);
  assert.equal(spec.style.colors.accent, '#123456');   // 不修改入参
  assert.notEqual(spec.style.colors.bg, '#f2f0ea');
});