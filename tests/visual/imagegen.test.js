import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('imagegen bridge：无 OPENAI_API_KEY 时输出 AI 合成方案（不静默失败）', () => {
  const res = spawnSync(process.execPath, ['scripts/imagegen.js', 'a test prompt'], { encoding: 'utf-8' });
  assert.match(res.stdout, /AI 合成/);
  assert.match(res.stdout, /(OPENAI_API_KEY|未找到 imagegen)/);
  assert.match(res.stdout, /分割抠图/);
});

test('protagonist --generate：无 key 时给出上传/合成替代方案', () => {
  const res = spawnSync(process.execPath, ['scripts/protagonist.js', '--generate', 'a hero', '--title', 'T', '--out', 'out/__gen_test__'], { encoding: 'utf-8' });
  assert.match(res.stdout, /AI 合成替代/);
  assert.match(res.stdout, /OPENAI_API_KEY/);
});
