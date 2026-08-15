import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('protagonist --labels：从 labels.json 构建多人海报（免分割）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pl-'));
  try {
    const photo = join(dir, 'p.png');
    writeFileSync(photo, Buffer.from(TINY_PNG, 'base64'));
    const labels = { size: { w: 800, h: 1000 }, unionCutout: null, people: [
      { name: '小明', box: { x: 30, y: 50, rx: 20, ry: 25 }, mask: null },
      { name: '小红', box: { x: 70, y: 50, rx: 20, ry: 25 }, mask: null },
    ] };
    const lp = join(dir, 'labels.json');
    writeFileSync(lp, JSON.stringify(labels));
    const out = join(dir, 'out');
    const res = spawnSync(process.execPath, ['scripts/protagonist.js', photo, '--labels', lp, '--title', 'T', '--out', out], { encoding: 'utf-8' });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const spec = JSON.parse(readFileSync(join(out, 'spec.json'), 'utf8'));
    assert.equal(spec.content.hotspots.length, 2);
    assert.equal(spec.content.hotspots[0].label, '小明');
    assert.equal(spec.content.hotspots[1].label, '小红');
    assert.ok(existsSync(join(out, 'index.html')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
