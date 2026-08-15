import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../scripts/bench.js', import.meta.url));

test('TASK-017/018/019：24 briefs 基准 — 全过、DNA 全合法、Diversity ≥0.70', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-test-'));
  execFileSync(process.execPath, [SCRIPT, '--seed', '2026', '--out', dir], { stdio: 'pipe' });
  const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
  assert.equal(report.total, 24);
  assert.equal(report.invalid, 0);
  assert.ok(report.passRate >= 0.9, 'pass 率 ' + report.passRate);
  assert.ok(report.diversity >= 0.7, 'Diversity ' + report.diversity);
  assert.ok(report.avgAiNess < 30, 'AI-ness ' + report.avgAiNess);
  assert.ok(report.dod.everyPosterHasDna && report.dod.dnaValid && report.dod.antiAiBelow30 && report.dod.diversityTarget);
  // 多样性：预设使用数应覆盖绝大多数 brief
  const layoutDim = report.dimStats.find((d) => d.dim === 'layout');
  const colorDim = report.dimStats.find((d) => d.dim === 'color');
  const typeDim = report.dimStats.find((d) => d.dim === 'type');
  assert.ok(layoutDim && colorDim && typeDim, '新公式维度应齐全');
  assert.ok(colorDim.unique >= 6, '色彩多样性 ' + colorDim.unique);
});

test('TASK-017：bench 支持 --limit（快速子集）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-test2-'));
  execFileSync(process.execPath, [SCRIPT, '--limit', '4', '--seed', '1', '--out', dir], { stdio: 'pipe' });
  const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
  assert.equal(report.total, 4);
});
