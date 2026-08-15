/**
 * imagegen — 把 imagegen 技能接入 poster 流程
 * 用法:
 *   node scripts/imagegen.js <prompt> [--out 输出.png] [--size 1024x1024] [--quality low|medium|high|auto]
 *
 * 环境检查：优先内置 image_gen 工具（需 Codex 环境支持）；否则用 imagegen CLI（需 OPENAI_API_KEY）。
 * 都不满足时输出可用方案（AI 合成替代 / 配置 key），不静默失败。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const prompt = args.find((a) => a && !a.startsWith('--'));
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const out = flagVal('out');
const size = flagVal('size') || '1024x1024';
const quality = flagVal('quality') || 'high';

function findPython() {
  const candidates = [
    process.env.POSTER_ENGINE_PYTHON,
    'C:/Users/foshanwuyanzu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
    'python',
    'py',
  ].filter(Boolean);
  return candidates[0];
}
function findImageGen() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.IMAGE_GEN_DIR,
    join(home, '.codex', 'skills', '.system', 'imagegen'),
    'C:/Users/foshanwuyanzu/.codex/skills/.system/imagegen',
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(join(c, 'scripts', 'image_gen.py'))) return c;
  }
  return null;
}

if (!prompt) {
  console.error('用法: node scripts/imagegen.js <prompt> [--out 输出.png] [--size 1024x1024] [--quality high]');
  process.exit(1);
}
const imgDir = findImageGen();
const hasKey = !!process.env.OPENAI_API_KEY;
if (!imgDir) {
  console.log('未找到 imagegen 技能目录（IMAGE_GEN_DIR 或 ~/.codex/skills/.system/imagegen）');
  console.log('当前仍可用 AI 合成：代码合成(HTML/SVG/Canvas) / 分割抠图(protagonist) / 上传或联网找素材');
  process.exit(0);
}
if (!hasKey) {
  console.log('');
  console.log('⚠️  当前环境无法直接生成图片：');
  console.log('  - 内置 image_gen 工具：本会话未暴露');
  console.log('  - OPENAI_API_KEY：未设置');
  console.log('');
  console.log('可用方案：');
  console.log('  ① 在支持 image_gen 的 Codex 环境直接生成（无需 key）');
  console.log('  ② 设置 OPENAI_API_KEY 后重试本命令（走 imagegen CLI）');
  console.log('  ③ AI 合成替代（当前可用）：');
  console.log('     - 代码合成：HTML/SVG/Canvas 程序化视觉与动画');
  console.log('     - 图像处理：分割抠图（poster.js protagonist）/ 滤镜 / 取色 / 裁剪');
  console.log('     - 素材三源：用户上传照片 / 联网找 CC 参考图');
  process.exit(0);
}
console.log('② 使用 imagegen CLI（OPENAI_API_KEY 已设置）生成…');
const res = spawnSync(findPython(), [
  join(imgDir, 'scripts', 'image_gen.py'), 'generate',
  '--prompt', prompt, '--size', size, '--quality', quality,
  ...(out ? ['--out', out] : []),
], { stdio: 'inherit' });
process.exit(res.status ?? 1);
