import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const engineRoot = fileURLToPath(new URL('../..', import.meta.url));
const node = process.execPath;
const brief = join(engineRoot, 'scripts', 'brief.js');
const outDir = join(engineRoot, 'out', 'brief-test');

test('brief 无参数打印问题清单', () => {
  const res = spawnSync(node, [brief], { cwd: engineRoot, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /需求引导/);
  assert.match(res.stdout, /风格 Style/);
  assert.match(res.stdout, /交互 Interaction/);
  assert.match(res.stdout, /配色 Color/);
});

test('brief 答案 → spec 可渲染（showcase 含炫技交互）', () => {
  const res = spawnSync(node, [brief, '--style', 'cyberpunk', '--color', 'high-contrast', '--interaction', 'showcase', '--title', 'NEON RUSH', '--out', outDir + '-s'], { cwd: engineRoot, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const spec = JSON.parse(readFileSync(outDir + '-s/spec.json', 'utf8'));
  assert.equal(spec.interactions.title.effect, 'glitch');
  assert.equal(spec.interactions.cursor.type, 'ring');
  assert.equal(spec.interactions.poster.max, 7);
  assert.ok(spec.animation.particles);
  assert.equal(spec.style.colors.bg, '#0b0b0e'); // high-contrast 策略
});

test('brief hotspots → 零按钮且有热点', () => {
  const res = spawnSync(node, [brief, '--style', 'editorial', '--color', 'warm-neutral', '--interaction', 'hotspots', '--title', 'AURORA', '--image', 'photo.jpg', '--out', outDir + '-h'], { cwd: engineRoot, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const spec = JSON.parse(readFileSync(outDir + '-h/spec.json', 'utf8'));
  assert.equal(spec.content.cta, '');
  assert.ok(spec.content.hotspots.length >= 2);
  assert.ok(spec.style.imagery.image.src === 'photo.jpg');
});