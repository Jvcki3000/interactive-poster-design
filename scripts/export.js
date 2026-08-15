#!/usr/bin/env node
/**
 * export — 渲染 HTML + 截图导出 PNG（CLI 薄壳；核心在 renderer/screenshot/capture.js）
 * 用法: node scripts/export.js <spec.json> --out poster.png [--width 1200]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { render } from '../renderer/html/index.js';
import { applyPreset } from '../engine/presets/index.js';
import { applyPalette } from '../engine/color/palette.js';
import { capturePoster, captureVariants } from '../renderer/screenshot/capture.js';

const args = process.argv.slice(2);
const specPath = args.find((a) => a && !a.startsWith('--'));
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
if (!specPath) { console.error('用法: node scripts/export.js <spec.json> --out poster.png [--width 1200]'); process.exit(1); }

let spec;
try { spec = JSON.parse(readFileSync(specPath, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.error('spec 解析失败:', e.message); process.exit(1); }
const presetName = flagVal('preset');
const palettePath = flagVal('palette');
if (presetName) { try { spec = applyPreset(spec, presetName); } catch (e) { console.error(e.message); process.exit(1); } }
if (palettePath) { const { palette } = JSON.parse(readFileSync(palettePath, 'utf8')); try { spec = applyPalette(spec, palette); } catch (e) { console.error(e.message); process.exit(1); } }

const html = render(spec);
const workDir = join(tmpdir(), 'poster-export-' + process.pid);
mkdirSync(workDir, { recursive: true });
const htmlPath = join(workDir, 'index.html');
writeFileSync(htmlPath, html, 'utf8');
const outPath = resolve(flagVal('out') || 'poster.png');
const ratio = spec.canvas && spec.canvas.height && spec.canvas.width ? spec.canvas.height / spec.canvas.width : 4 / 3;
if (args.includes('--variants')) {
  const outDir = dirname(outPath);
  mkdirSync(outDir, { recursive: true });
  captureVariants(htmlPath, outDir, { ratio }).then((paths) => {
    console.log('✔ 已导出变体:'); Object.entries(paths).forEach(([n, p]) => console.log('  ' + p));
  }).catch((e) => { console.error('导出失败:', e.message); process.exit(1); });
} else {
  capturePoster(htmlPath, outPath, { width: Number(flagVal('width')) || 1200, ratio })
    .then((r) => { console.log('✔ 已导出 ' + outPath + '（' + r.width + 'x' + r.height + '）'); })
    .catch((e) => { console.error('导出失败:', e.message); process.exit(1); });
}
