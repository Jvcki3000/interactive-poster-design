import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpretMood, interpretFeedback, applyDelta, createFirstTimeSession } from '../../engine/intent/index.js';
import { getDnaPreset } from '../../engine/design-dna/dna-presets.js';
import { validateDna } from '../../engine/design-dna/dna.js';

test('UX：Mood → DNA delta 映射', () => {
  const loud = interpretMood(['LOUD']);
  assert.ok((loud['density.overall'] || 0) > 0, 'LOUD 应提高密度');
  assert.ok((loud['color.contrast'] || 0) > 0);
  const sparse = interpretMood(['SPARSE']);
  assert.ok(sparse['negative_space.amount'] > 0);
  assert.ok(sparse['density.overall'] < 0);
  const physical = interpretMood(['PHYSICAL']);
  assert.ok(physical['materiality.physicality'] > 0 && physical['texture.presence'] > 0);
});

test('UX：applyDelta 后 DNA 仍合法且数值被叠加', () => {
  const base = getDnaPreset('swiss-international');
  const before = base.design_vocabulary.density.overall;
  const m = applyDelta(base, interpretMood(['LOUD']));
  assert.equal(validateDna(m).ok, true, validateDna(m).errors.join('; '));
  assert.notEqual(m.design_vocabulary.density.overall, before, '密度应变化');
});

test('UX：自然语言反馈 → 定向变异', () => {
  const r1 = interpretFeedback('the title is too small');
  assert.equal(r1.delta['_typography.scale'], 'oversized', JSON.stringify(r1));
  const r2 = interpretFeedback('it feels too much like a tech startup');
  assert.ok(r2.delta['design_tension.digital_vs_physical'] < 0, JSON.stringify(r2));
  const r3 = interpretFeedback('make it more physical');
  assert.ok(r3.delta['materiality.physicality'] > 0);
});

test('UX：FirstTimeSession 数据模型（意图与 DNA 分离）', () => {
  const s = createFirstTimeSession({ description: 'x', category: 'music', title: 'T' });
  assert.equal(s.is_first_time, true);
  assert.equal(s.brief.title, 'T');
  assert.ok(Array.isArray(s.directions) && Array.isArray(s.poster_versions));
  assert.equal(s.current_design_dna, null);
});

test('UX CLI：explore → 3 方向（合法 DNA）', () => {
  const script = fileURLToPath(new URL('../../scripts/explore.js', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'explore-test-'));
  execFileSync(process.execPath, [script, 'underground music festival', '--moods', 'RAW,LOUD', '--seed', '5', '--out', dir], { stdio: 'pipe' });
  for (let i = 0; i < 3; i++) {
    const dna = JSON.parse(readFileSync(join(dir, 'd' + i, 'dna.json'), 'utf8'));
    assert.equal(validateDna(dna).ok, true, 'd' + i + ' 应合法');
  }
});

test('UX CLI：refine → 反馈变成定向 DNA 变异', () => {
  const script = fileURLToPath(new URL('../../scripts/refine.js', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'refine-test-'));
  const dnaIn = join(dir, 'in.json');
  writeFileSync(dnaIn, JSON.stringify(getDnaPreset('neo-editorial')), 'utf8');
  const out = join(dir, 'out.json');
  execFileSync(process.execPath, [script, dnaIn, 'the title is too small', '--out', out], { stdio: 'pipe' });
  const mutated = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(validateDna(mutated).ok, true);
  assert.equal(mutated.design_vocabulary.typography.scale, 'oversized');
});
