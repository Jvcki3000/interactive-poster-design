/**
 * render — CLI
 * 用法：node scripts/render.js <spec.json> [--out out/] [--preset swiss] [--critic] [--palette palette.json]
 *
 * - 读取 Design Spec（JSON），调用 renderer.render() 输出 index.html
 * - --preset <name>：套用风格预设（swiss/editorial/minimal/experimental/cyberpunk）
 * - --palette <json>：用参考图主色板覆盖配色（见 scripts/palette.py 生成）
 * - --critic：渲染后运行 Design Critic 并打印评分报告
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '../renderer/html/index.js';
import { applyPreset } from '../engine/presets/index.js';
import { applyPalette } from '../engine/color/palette.js';
import { evaluate } from '../engine/critic/index.js';

const args = process.argv.slice(2);
const specPath = args.find((a) => a && !a.startsWith('--'));
const flag = (name) => args.indexOf('--' + name);
const flagVal = (name) => (flag(name) >= 0 ? args[flag(name) + 1] : undefined);
const outDir = resolve(flagVal('out') ?? 'out');
const presetName = flagVal('preset');
const palettePath = flagVal('palette');
const wantCritic = args.includes('--critic');

if (!specPath) {
  console.error('用法: node scripts/render.js <spec.json> [--out out/] [--preset 风格] [--palette palette.json] [--critic]');
  process.exit(1);
}

function loadJson(p, label) {
  try {
    return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    console.error(`${label}解析失败:`, p, '-', e.message);
    process.exit(1);
  }
}

let spec = loadJson(specPath, 'spec');
if (presetName) {
  try {
    spec = applyPreset(spec, presetName);
    console.log('✔ 已套用预设:', presetName);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
if (palettePath) {
  const { palette } = loadJson(palettePath, 'palette');
  spec = applyPalette(spec, palette);
  console.log('✔ 已套用参考图色板:', palette.map((p) => p.hex).join(' '));
}

let html;
try {
  html = render(spec);
} catch (e) {
  console.error('渲染失败:', e.message);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, 'index.html');
writeFileSync(outFile, html, 'utf8');
console.log('✔ 已生成 ' + outFile + '  (' + html.length + ' bytes)');

if (wantCritic) {
  const rep = evaluate(spec, html);
  console.log('\n— Design Critic 自检报告 —');
  for (const [k, v] of Object.entries(rep.scores)) {
    console.log(`  ${k.padEnd(18)} ${String(v.score).padStart(3)}/10`);
  }
  console.log(`  总分: ${rep.overall}/10  ${rep.pass ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'}`);
  console.log('\n— Anti-AI Design Critic —');
  console.log('  AI-ness: ' + rep.aiNess.score + '/100  ' + (rep.aiNess.pass ? '✅ <25 通过' : '❌ ≥25 需调整'));
  if (rep.aiNess.signals.length) {
    console.log('  信号:');
    rep.aiNess.signals.forEach((s) => console.log('    - ' + s));
  }
  if (rep.suggestions.length) {
    console.log('  建议:');
    rep.suggestions.forEach((s) => console.log('    - ' + s));
  }
  if (!rep.pass) process.exitCode = 1;
}