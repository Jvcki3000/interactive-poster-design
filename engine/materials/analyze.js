// materials/analyze — 调用 material_analyze.py（PIL）分析素材，供 materials/explore/director 共用
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));

export function findPython() {
  const cands = [process.env.POSTER_ENGINE_PYTHON, 'python', 'py', 'C:/Users/foshanwuyanzu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'].filter(Boolean);
  return cands[0];
}

/** 分析素材图片，返回分析 JSON 数组 */
export function analyzeImages(images, { python } = {}) {
  const py = python || findPython();
  const tmp = join(tmpdir(), 'mat-' + Date.now() + '.json');
  const res = spawnSync(py, [join(HERE, '..', '..', 'scripts', 'material_analyze.py'), ...images, '--out', tmp], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error('素材分析失败: ' + (res.stderr || res.stdout || ''));
  const out = JSON.parse(readFileSync(tmp, 'utf8'));
  try { writeFileSync(tmp, ''); } catch (e) { /* noop */ }
  return out;
}

export default { analyzeImages, findPython };
