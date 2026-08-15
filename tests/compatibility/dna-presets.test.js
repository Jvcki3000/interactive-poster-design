import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listDnaPresets, getDnaPreset, pickDnaPreset, mutateDna } from '../../engine/design-dna/dna-presets.js';
import { validateDna, checkCompatibility } from '../../engine/design-dna/dna.js';

test('dna-presets：预设数量 >= 30', () => {
  const list = listDnaPresets();
  assert.ok(list.length >= 30, 'only ' + list.length);
});

test('dna-presets：每个预设合并后都是合法 DNA（schema 校验零错误）', () => {
  const list = listDnaPresets();
  const bad = [];
  for (const p of list) {
    const full = getDnaPreset(p.key);
    const v = validateDna(full);
    if (!v.ok) bad.push(p.key + ': ' + v.errors.join('; '));
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('dna-presets：每个预设都声明了 design_movements', () => {
  for (const p of listDnaPresets()) {
    assert.ok(p.movements.length >= 1, p.key + ' 缺 design_movements');
  }
});

test('dna-presets：pick 能按描述命中 swiss', () => {
  const hits = pickDnaPreset('瑞士 极简 网格');
  assert.ok(hits.some((h) => h.key === 'swiss-international'), JSON.stringify(hits.slice(0, 3)));
});

test('dna-presets：mutate 应用配色/方向/密度/交互', () => {
  const base = getDnaPreset('swiss-international');
  const m = mutateDna(base, { color: 'earth', orientation: 'landscape', density: 0.8, interaction: 'showcase', seed: 7 });
  const d = m.design_vocabulary;
  assert.equal(d.color.strategy, 'earth');
  assert.equal(d.composition.orientation, 'landscape');
  assert.equal(d.density.overall, 0.8);
  assert.equal(d.motion.enabled, true);
  assert.equal(d.interaction.primary, 'hover');
  assert.ok(validateDna(m).ok, validateDna(m).errors.join('; '));
});

test('dna-presets：mutate seed 使数值字段确定性抖动', () => {
  const a = mutateDna(getDnaPreset('brutalist-editorial'), { seed: 42 }).design_vocabulary;
  const b = mutateDna(getDnaPreset('brutalist-editorial'), { seed: 42 }).design_vocabulary;
  const c = mutateDna(getDnaPreset('brutalist-editorial'), { seed: 7 }).design_vocabulary;
  assert.deepEqual(a, b);          // 同种子 → 相同
  assert.notDeepEqual(a, c);       // 不同种子 → 不同
});

test('dna-presets：兼容规则字段条件命中（minimalism / high_motion）', () => {
  const base = getDnaPreset('museum-minimal');
  const c = checkCompatibility(base);
  assert.ok(c.matched.some((m) => m.id === 'minimalism'), 'minimalism 应命中（density 低）');
  const rave = mutateDna(getDnaPreset('techno-rave'), { interaction: 'showcase' });
  const c2 = checkCompatibility(rave);
  assert.ok(c2.matched.some((m) => m.id === 'high_motion'), 'high_motion 应命中（motion.enabled）');
});

test('TASK-004/005：预设两两结构指纹不重复（真正不同，而非换色）', () => {
  const list = listDnaPresets();
  const keys = ['composition.structure','composition.orientation','composition.balance','grid.type','typography.category','typography.scale','color.strategy','color.gradient','imagery.source','imagery.treatment','graphic_language.shape_language','graphic_language.symbolism','depth.mode','motion.style','interaction.primary','materiality.medium','materiality.printing_process'];
  const fp = new Set();
  const buckets = {};
  keys.forEach((k) => { buckets[k] = new Set(); });
  for (const p of list) {
    const full = getDnaPreset(p.key);
    const d = full.design_vocabulary;
    const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
    const sig = keys.map((k) => JSON.stringify(get(k))).join('|');
    assert.ok(!fp.has(sig), '预设结构指纹重复: ' + p.key);
    fp.add(sig);
    keys.forEach((k) => { const v = get(k); if (v !== undefined && v !== null) buckets[k].add(JSON.stringify(v)); });
  }
  // 关键维度必须存在明显多样性（>1 种取值）
  for (const k of ['composition.structure','typography.category','color.strategy','materiality.medium','motion.style']) {
    assert.ok(buckets[k].size >= 4, k + ' 取值过少: ' + buckets[k].size);
  }
});
