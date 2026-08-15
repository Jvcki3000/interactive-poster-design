import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DesignDNA, dnaToSpec } from '../../engine/design-dna/index.js';
import { getDnaPreset } from '../../engine/design-dna/dna-presets.js';
import { render } from '../../renderer/html/index.js';

test('TASK-002：DesignDNA.create → validate 通过', () => {
  const dna = DesignDNA.create(getDnaPreset('swiss-international'));
  const v = dna.validate();
  assert.equal(v.ok, true, v.errors.join('; '));
  assert.ok(dna.movements.includes('swiss_international'));
});

test('TASK-002：serialize → load 往返一致', () => {
  const dna = DesignDNA.create(getDnaPreset('brutalist-editorial'));
  const loaded = DesignDNA.load(dna.serialize());
  assert.deepEqual(loaded.dna, dna.dna);
});

test('TASK-002：toSpec 产出合法渲染 spec（能直接 render）', () => {
  for (const key of ['swiss-international', 'japanese-experimental', 'luxury-fashion', 'techno-rave', 'museum-minimal']) {
    const spec = DesignDNA.create(getDnaPreset(key)).toSpec({ title: 'TEST', date: '2026.08.16' });
    assert.ok(spec.canvas.width > 0 && spec.canvas.height > 0, key + ' canvas');
    assert.ok(spec.content.title, key + ' title');
    const html = render(spec);
    assert.ok(html.includes('<!DOCTYPE html>'), key + ' html');
  }
});

test('TASK-002：toSpec 按 DNA 映射配色/排版/布局/交互', () => {
  const dna = getDnaPreset('luxury-fashion');
  const spec = dnaToSpec(dna, { title: 'X' });
  assert.match(spec.style.typography.fontFamily, /serif/i);           // serif
  assert.equal(spec.style.layout.mode, 'minimal');                     // centered → minimal
  assert.equal(spec.canvas.width, 1080); assert.equal(spec.canvas.height, 1620); // portrait
  assert.ok(spec.style.colors.ink && spec.style.colors.bg);            // 配色生成
  // 高密度预设 → 收紧 margin
  const dense = dnaToSpec(getDnaPreset('information-dense'), { title: 'X' });
  const airy = dnaToSpec(getDnaPreset('museum-minimal'), { title: 'X' });
  assert.ok(dense.style.layout.margin < airy.style.layout.margin);
});

test('TASK-002：风险评分与 motion 语义化', () => {
  const rave = dnaToSpec(getDnaPreset('techno-rave'), { title: 'X' });
  assert.ok(rave.interactions.glow || rave.animation.title, 'rave 应有交互/动画');
  const staticDna = dnaToSpec(getDnaPreset('book-cover-classic'), { title: 'X' });
  assert.deepEqual(staticDna.animation, {});  // 静态预设不加动画
  assert.deepEqual(staticDna.interactions, {});
});
