/**
 * iterate — 自动迭代（V0.3 设计循环）
 * 用法：node scripts/iterate.js <spec.json> [--preset 风格] [--max 5] [--out out/iterated]
 *
 * 循环：render → critic 评分 → 未达标则按规则自动修复 → 再渲染，
 * 直到 PASS 或达到最大迭代次数，输出最终 index.html 与评分报告。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { render } from '../renderer/html/index.js';
import { capturePoster } from '../renderer/screenshot/capture.js';
import { evaluate } from '../engine/critic/index.js';
import { applyPreset } from '../engine/presets/index.js';
import { mixHex, contrast, hueOf } from '../engine/color/palette.js';

const args = process.argv.slice(2);
const specPath = args.find((a) => a && !a.startsWith('--'));
const flagVal = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const maxIter = Math.max(1, Number(flagVal('max') ?? 3));
const outDir = resolve(flagVal('out') ?? 'out/iterated');
const presetName = flagVal('preset');

if (!specPath) {
  console.error('用法: node scripts/iterate.js <spec.json> [--preset 风格] [--max 5] [--out out/iterated]');
  process.exit(1);
}

let spec = JSON.parse(readFileSync(specPath, 'utf8').replace(/^\uFEFF/, ''));
if (presetName) {
  try {
    spec = applyPreset(spec, presetName);
    console.log('✔ 已套用预设:', presetName);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

/** 根据 critic 建议应用简单自动修复；返回是否有改动 */
function applyFixes(s, report) {
  const scores = report.scores;
  const suggestions = report.suggestions.join(' ');
  const style = (s.style = s.style ?? {});
  const colors = (style.colors = style.colors ?? {});
  const typo = (style.typography = style.typography ?? {});
  const layout = (style.layout = style.layout ?? {});
  let changed = false;

  if (scores.contrast.score < 7) {
    // 逐步加深背景 / 提亮前景，直到 ink/bg 对比度 ≥4.5
    const ink = colors.ink ?? '#f4f2ff';
    const bg = colors.bg ?? '#0a0a12';
    for (let step = 0; step < 10 && contrast(colors.ink ?? ink, colors.bg ?? bg) < 4.5; step++) {
      const darkGain = contrast(colors.ink ?? ink, mixHex(colors.bg ?? bg, '#000000', 0.2));
      const lightGain = contrast(mixHex(colors.ink ?? ink, '#ffffff', 0.2), colors.bg ?? bg);
      if (darkGain >= lightGain) {
        colors.bg = mixHex(colors.bg ?? bg, '#000000', 0.2);
      } else {
        colors.ink = mixHex(colors.ink ?? ink, '#ffffff', 0.2);
      }
      changed = true;
    }
    // 强调色与背景对比度 ≥3
    for (let step = 0; step < 10 && contrast(colors.accent ?? '#00e5ff', colors.bg ?? bg) < 3; step++) {
      colors.accent = mixHex(colors.accent ?? '#00e5ff', '#ffffff', 0.2);
      changed = true;
    }
  }

  if (suggestions.includes('标题') && (scores.typography.score < 8 || scores.balance.score < 7)) {
    const cur = Number(typo.titleScale ?? 2.2);
    if (cur > 1.2) {
      typo.titleScale = Math.max(1.2, Math.round((cur - 0.2) * 100) / 100);
      changed = true;
    }
  }

  if (scores.readability.score < 8) {
    const base = Number(typo.baseSize ?? 16);
    if (base < 24) {
      typo.baseSize = base + 2;
      changed = true;
    }
  }

  if (suggestions.includes('边距')) {
    if (Number(layout.margin ?? 64) < 80) {
      layout.margin = 80;
      changed = true;
    }
  }

  if (scores.typography.score < 8 && !typo.fontFamily) {
    typo.fontFamily = "'Helvetica Neue', Arial, sans-serif";
    changed = true;
  }

  // ---- Anti-AI 修复：AI-ness ≥25 时降低 AI 味 ----
  if (report.aiNess && !report.aiNess.pass) {
    const signals = report.aiNess.signals.join(' ');
    if (signals.includes('紫/粉')) {
      colors.accent = mixHex(colors.accent ?? '#00e5ff', '#e85d3f', 0.55); // 紫粉 → 陶土暖色
      changed = true;
    }
    if (signals.includes('霓虹')) {
      colors.accent2 = mixHex(colors.accent2 ?? '#ff2bd6', '#000000', 0.55); // 压暗品红
      changed = true;
    }
    if (signals.includes('堆叠')) {
      s.animation = s.animation ?? {};
      if (s.interactions?.cursor) { delete s.interactions.cursor; changed = true; }
      if (s.interactions?.title?.click) { delete s.interactions.title.click; changed = true; }
      if (s.animation.particles) { delete s.animation.particles; changed = true; }
    }
    if (signals.includes('居中')) {
      style.layout = style.layout ?? {};
      style.layout.mode = 'split';
      changed = true;
    }
    if (signals.includes('层级')) {
      typo.titleScale = Math.min(3, Math.round((Number(typo.titleScale ?? 2.2) + 0.3) * 100) / 100);
      changed = true;
    }
    if (signals.includes('Duotone')) {
      if (style.imagery?.image) { style.imagery.image.duotone = false; changed = true; }
    }
    if (signals.includes('粒子') && signals.includes('无语义')) {
      s.animation = s.animation ?? {};
      delete s.animation.particles;
      changed = true;
    }
  }

  return changed;
}

const log = [];
let html = '';
let report = null;
let finalSpec = spec;
mkdirSync(outDir, { recursive: true });

for (let i = 0; i <= maxIter; i++) {
  finalSpec = spec;
  html = render(spec);
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  try { await capturePoster(join(outDir, 'index.html'), join(outDir, 'qa-' + i + '.png'), { width: 900, ratio: (spec.canvas.height || 1600) / (spec.canvas.width || 1200) }); } catch (e) { console.error('⚠ 截图 QA 失败（不影响迭代）:', e.message); }
  report = evaluate(spec, html);
  log.push(`[iter ${i}] overall=${report.overall}  pass=${report.pass ? 'YES' : 'NO '}`);
  if (report.pass || i === maxIter) break;
  const changed = applyFixes(spec, report);
  if (!changed) {
    log.push(`[iter ${i}] 无可用自动修复，停止`);
    break;
  }
}

const outFile = resolve(outDir, 'index.html');
writeFileSync(outFile, html, 'utf8');

console.log('\n— 迭代过程 —');
log.forEach((l) => console.log('  ' + l));
console.log('\n— Design Critic 最终报告 —');
for (const [k, v] of Object.entries(report.scores)) {
  console.log(`  ${k.padEnd(18)} ${String(v.score).padStart(3)}/10`);
}
console.log(`  总分: ${report.overall}/10  ${report.pass ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'}`);
  if (report.aiNess) console.log('  AI-ness: ' + report.aiNess.score + '/100  ' + (report.aiNess.pass ? '✅ <25' : '❌ ≥25'));
  if (report.aiNess && report.aiNess.signals.length) {
    console.log('  AI 信号:');
    report.aiNess.signals.forEach((s) => console.log('    - ' + s));
  }
console.log('✔ 已生成 ' + outFile);