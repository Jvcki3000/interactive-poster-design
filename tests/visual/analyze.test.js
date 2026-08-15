import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const engineRoot = fileURLToPath(new URL('../..', import.meta.url));
const py = process.env.POSTER_ENGINE_PYTHON || 'python';
const analyze = join(engineRoot, 'scripts', 'analyze_poster.py');
const synth = join(engineRoot, 'assets', 'reference', 'synth-poster.png');

test('参考海报分析：合成海报指纹（暗底/居中/高对比/大字带）', () => {
  const res = spawnSync(py, [analyze, synth, '--colors', '5'], { cwd: engineRoot, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const fp = JSON.parse(res.stdout);
  assert.equal(fp.is_dark, true);
  assert.equal(fp.layout.guess, 'centered');
  assert.equal(fp.contrast, 'high');
  assert.equal(fp.has_large_type, true);
  assert.ok(fp.palette.length >= 3);
  assert.match(fp.palette.map((p) => p.hex).join(' '), /#d50712/); // 红色强调
});

test('参考海报分析：暗底 + 红色强调 → 高对比/黑+强调方向', () => {
  const res = spawnSync(py, [analyze, synth], { cwd: engineRoot, encoding: 'utf8' });
  const fp = JSON.parse(res.stdout);
  assert.ok(['high-contrast', 'black-accent'].includes(fp.strategy_guess));
});