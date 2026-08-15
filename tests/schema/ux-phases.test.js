import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDnaPreset } from '../../engine/design-dna/dna-presets.js';
import { validateDna } from '../../engine/design-dna/dna.js';

test('Phase D：evolve → 版本历史（v1/v2，可回退，DNA 合法）', () => {
  const ws = mkdtempSync(join(tmpdir(), 'evolve-test-'));
  const base = join(ws, 'base.json');
  writeFileSync(base, JSON.stringify(getDnaPreset('neo-editorial')), 'utf8');
  const script = fileURLToPath(new URL('../../scripts/evolve.js', import.meta.url));
  execFileSync(process.execPath, [script, base, 'make it more physical', '--seed', '3', '--render', '--out', ws], { stdio: 'pipe' });
  assert.ok(existsSync(join(ws, 'v1', 'dna.json')));
  assert.ok(existsSync(join(ws, 'v1', 'meta.json')));
  assert.ok(existsSync(join(ws, 'v1', 'index.html')));
  const versions = JSON.parse(readFileSync(join(ws, 'versions.json'), 'utf8'));
  assert.equal(versions.length, 1);
  // 第二次演化 → v2
  execFileSync(process.execPath, [script, join(ws, 'v1', 'dna.json'), 'more contrast', '--out', ws], { stdio: 'pipe' });
  const versions2 = JSON.parse(readFileSync(join(ws, 'versions.json'), 'utf8'));
  assert.equal(versions2.length, 2);
  const v2 = JSON.parse(readFileSync(join(ws, 'v2', 'dna.json'), 'utf8'));
  assert.equal(validateDna(v2).ok, true);
});

test('Phase E：surprise → 随机主题 3 方向', () => {
  const dir = mkdtempSync(join(tmpdir(), 'surprise-test-'));
  const script = fileURLToPath(new URL('../../scripts/surprise.js', import.meta.url));
  execFileSync(process.execPath, [script, '--seed', '42', '--out', dir], { stdio: 'pipe' });
  for (let i = 0; i < 3; i++) {
    const dna = JSON.parse(readFileSync(join(dir, 'd' + i, 'dna.json'), 'utf8'));
    assert.equal(validateDna(dna).ok, true, 'd' + i);
  }
});

test('Phase E：lab（高级）→ 指定 preset + mood + 完整输出', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-test-'));
  const script = fileURLToPath(new URL('../../scripts/lab.js', import.meta.url));
  execFileSync(process.execPath, [script, 'underground music festival', '--preset', 'techno-rave', '--moods', 'LOUD', '--show-dna', '--render', '--out', dir], { stdio: 'pipe' });
  const dna = JSON.parse(readFileSync(join(dir, 'dna.json'), 'utf8'));
  assert.equal(validateDna(dna).ok, true);
  assert.equal(dna.design_vocabulary.color.strategy, 'fluorescent'); // techno-rave 默认 + LOUD 不改配色
  assert.ok(existsSync(join(dir, 'index.html')));
});
