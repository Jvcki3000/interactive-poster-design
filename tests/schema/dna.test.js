import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDna, checkCompatibility, aiRiskScore, templateDna, unwrap } from '../../engine/design-dna/dna.js';

test('dna：模板是合法 DNA', () => {
  const v = validateDna(templateDna());
  assert.equal(v.ok, true, v.errors.join('; '));
});

test('dna：支持裸 DNA 与 {design_vocabulary} 两种形态', () => {
  const bare = templateDna().design_vocabulary;
  const wrapped = templateDna();
  assert.deepEqual(unwrap(bare), bare);
  assert.deepEqual(unwrap(wrapped), wrapped.design_vocabulary);
});

test('dna：非法枚举 / 越界数值 / 缺 design_movements 会被拦截', () => {
  const d = templateDna();
  d.design_vocabulary.typography.category = 'comic_sans';
  d.design_vocabulary.color.saturation = 5;
  d.design_vocabulary.design_movements = [];
  const v = validateDna(d);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('comic_sans')));
  assert.ok(v.errors.some((e) => e.includes('5 大于最大值')));
  assert.ok(v.errors.some((e) => e.includes('design_movements')));
});

test('compatibility：swiss_international 命中 swiss 规则', () => {
  const d = templateDna();
  d.design_vocabulary.design_movements = ['swiss_international'];
  const c = checkCompatibility(d);
  assert.ok(c.matched.some((m) => m.id === 'swiss'));
});

test('compatibility：avoid 违规被标记（swiss + gradient）', () => {
  const d = templateDna();
  d.design_vocabulary.design_movements = ['swiss_international'];
  d.design_vocabulary.color.gradient = true;
  const c = checkCompatibility(d);
  const swiss = c.matched.find((m) => m.id === 'swiss');
  assert.ok(swiss && swiss.avoid.some((x) => x.path === 'color.gradient' && x.violated));
});

test('aiRisk：霓虹色 + 渐变 + 粒子风险偏高；黑+点缀色风险低', () => {
  const bad = templateDna();
  bad.design_vocabulary.color = { strategy: 'complementary', gradient: true, palette: ['#7c3aed', '#06b6d4', '#ec4899'] };
  bad.design_vocabulary.graphic_language.elements = ['particles'];
  const badRisk = aiRiskScore(bad);
  assert.ok(badRisk >= 0.35, '霓虹组合 risk=' + badRisk);

  const good = templateDna();
  const goodRisk = aiRiskScore(good);
  assert.ok(goodRisk < 0.35, '黑+点缀色 risk=' + goodRisk);
});
