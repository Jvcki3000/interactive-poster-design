import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDna } from '../../engine/design-dna/dna.js';

const SCRIPT = fileURLToPath(new URL('../../scripts/director.js', import.meta.url));

function runDirector(brief, extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'director-test-'));
  execFileSync(process.execPath, [SCRIPT, brief, '--out', dir, ...extra], { stdio: 'pipe' });
  return dir;
}

test('TASK-003：地下电子音乐节 brief → 合法 DNA + 可渲染', () => {
  const dir = runDirector('Create a poster for an underground electronic music festival.', ['--render']);
  const dna = JSON.parse(readFileSync(join(dir, 'dna.json'), 'utf8'));
  const v = validateDna(dna);
  assert.equal(v.ok, true, v.errors.join('; '));
  const movements = dna.design_vocabulary.design_movements || [];
  assert.ok(movements.some((m) => /underground|music|techno|rave/.test(m)), JSON.stringify(movements));
  assert.ok(existsSync(join(dir, 'index.html')), '应渲染 index.html');
  assert.ok(existsSync(join(dir, 'spec.json')), '应输出 spec.json');
});

test('TASK-003：空泛输入兜底但仍产出合法 DNA', () => {
  const dir = runDirector('modern premium beautiful', []);
  const dna = JSON.parse(readFileSync(join(dir, 'dna.json'), 'utf8'));
  assert.equal(validateDna(dna).ok, true);
});

test('TASK-003：横版 + 互动关键词被启发式识别', () => {
  const dir = runDirector('横版 互动 科技展 海报', []);
  const dna = JSON.parse(readFileSync(join(dir, 'dna.json'), 'utf8')).design_vocabulary;
  assert.equal(dna.composition.orientation, 'landscape');
  assert.equal(dna.interaction.enabled, true);
});
