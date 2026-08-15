import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDna } from '../../engine/design-dna/dna.js';

const SCRIPT = fileURLToPath(new URL('../../scripts/directions.js', import.meta.url));

test('TASK-006：brief → 3 个不同预设方向，均可渲染、DNA 合法', () => {
  const dir = mkdtempSync(join(tmpdir(), 'directions-test-'));
  execFileSync(process.execPath, [SCRIPT, 'underground electronic music festival', '--count', '3', '--seed', '7', '--render', '--out', dir], { stdio: 'pipe' });
  const keys = [];
  for (let i = 0; i < 3; i++) {
    const d = join(dir, 'd' + i);
    assert.ok(existsSync(join(d, 'index.html')), 'd' + i + ' 应渲染');
    assert.ok(existsSync(join(d, 'dna.json')), 'd' + i + ' 应有 dna');
    assert.ok(existsSync(join(d, 'spec.json')), 'd' + i + ' 应有 spec');
    const dna = JSON.parse(readFileSync(join(d, 'dna.json'), 'utf8'));
    assert.equal(validateDna(dna).ok, true, 'd' + i + ' DNA 应合法');
    keys.push(dna.design_vocabulary.design_movements.join(','));
  }
  const set = new Set(keys);
  assert.ok(set.size >= 2, '方向应来自不同预设（movements 应不同）: ' + JSON.stringify([...set]));
});

test('TASK-006：兼容旧用法——传入 spec.json 仍可生成 3 方向', () => {
  const specPath = fileURLToPath(new URL('../../examples/event-poster/spec.json', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'directions-test2-'));
  execFileSync(process.execPath, [SCRIPT, specPath, '--count', '3', '--seed', '1', '--out', dir], { stdio: 'pipe' });
  for (let i = 0; i < 3; i++) assert.ok(existsSync(join(dir, 'd' + i, 'dna.json')));
});
