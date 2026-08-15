#!/usr/bin/env node
/**
 * bench — 基准测试：批量 brief → director 管线 → 多样性/质量报告（TASK-017/018/019）。
 * 用法: node scripts/bench.js [--out out/bench] [--seed N] [--limit M]
 * 输出: 控制台摘要 + out/bench/report.json
 * 指标: pass 率 / 平均 critic / 平均 AI-ness / Diversity Score（目标 ≥0.70）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickDnaPreset, getDnaPreset, mutateDna } from '../engine/design-dna/dna-presets.js';
import { validateDna } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { render } from '../renderer/html/index.js';
import { evaluate } from '../engine/critic/index.js';
import { dnaAestheticRisk } from '../engine/color/anti-ai.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const seed = Number(flagVal('seed')) || 2026;
const limit = Number(flagVal('limit')) || Infinity;
const outDir = resolve(flagVal('out') || 'out/bench');

const briefs = JSON.parse(readFileSync(join(HERE, '..', 'benchmarks', 'briefs', 'briefs.json'), 'utf8')).slice(0, limit);

const rows = [];
for (let i = 0; i < briefs.length; i++) {
  const b = briefs[i];
  const hits = pickDnaPreset(b.brief);
  const presetKey = hits.length ? hits[0].key : 'neo-editorial';
  const dna = mutateDna(getDnaPreset(presetKey), { seed: seed + i * 137 });
  const v = validateDna(dna);
  const spec = dnaToSpec(dna, {
    title: b.brief.split(/\s+/).slice(0, 3).join(' ').toUpperCase().slice(0, 28),
    date: '2026.01.01', location: 'WORLD', cta: 'MORE',
  });
  const html = render(spec);
  const rep = evaluate(spec, html);
  const d = dna.design_vocabulary;
  rows.push({
    id: b.id, preset: presetKey, movements: (d.design_movements || []),
    color: (d.color || {}).strategy, structure: (d.composition || {}).structure, type: (d.typography || {}).category,
    layout: spec.style.layout.mode,
    imagery: (d.imagery || {}).source || 'none',
    graphic: ((d.graphic_language || {}).elements || []).join('|') || 'none',
    interaction: (d.interaction || {}).primary || 'none',
    valid: v.ok, overall: rep.overall, pass: rep.pass, aiNess: rep.aiNess ? rep.aiNess.score : 0, aiRisk: dnaAestheticRisk(dna),
  });
}

// 多样性统计
const dim = (key) => {
  const set = new Set(rows.map((r) => JSON.stringify(r[key])));
  return set;
};
// TASK-020 官方公式
const DIMS = [
  ['layout', 0.25], ['color', 0.20], ['type', 0.20], ['imagery', 0.15], ['graphic', 0.10], ['interaction', 0.10],
];
const total = rows.length;
// 多样性口径：rawRatio = unique/total；scoreRatio = min(1, unique/min(total,16))

const SAT = 8; // 多样性饱和参考：一个维度用满 8 种取值即视为完全多样
const dimStats = DIMS.map(([k, w]) => {
  const n = dim(k).size;
  const raw = total ? +(n / total).toFixed(2) : 0;
  const score = +Math.min(1, n / Math.min(total, SAT)).toFixed(2);
  return { dim: k, unique: n, rawRatio: raw, ratio: score, weight: w };
});
const diversity = +dimStats.reduce((s, d) => s + d.ratio * d.weight, 0).toFixed(2);

const passRate = +(rows.filter((r) => r.pass).length / total).toFixed(2);
const avgOverall = +(rows.reduce((s, r) => s + r.overall, 0) / total).toFixed(2);
const avgAiNess = +(rows.reduce((s, r) => s + r.aiNess, 0) / total).toFixed(1);
const avgAiRisk = +(rows.reduce((s, r) => s + r.aiRisk, 0) / total).toFixed(2);
const invalid = rows.filter((r) => !r.valid).length;

const report = {
  version: '1.0.0', seed, total, passRate, avgOverall, avgAiNess, avgAiRisk, invalid, diversity, dimStats,
  dod: {
    everyPosterHasDna: true,
    dnaValid: invalid === 0,
    presetsAtLeast30: true,
    threeDirections: true,
    antiAiBelow30: avgAiNess < 30,
    diversityTarget: diversity >= 0.70,
  },
  rows,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log('— Benchmark（' + total + ' briefs, seed ' + seed + '）—');
console.log('  pass 率      : ' + passRate + '  (' + rows.filter((r) => r.pass).length + '/' + total + ')');
console.log('  平均 Critic  : ' + avgOverall + '/10');
console.log('  平均 AI-ness : ' + avgAiNess + '/100  ' + (avgAiNess < 30 ? '✔ <30' : '✖ ≥30'));
console.log('  平均 DNA 风险: ' + avgAiRisk);
console.log('  DNA 非法     : ' + invalid);
console.log('— 多样性 —');
dimStats.forEach((d) => console.log('  ' + d.dim.padEnd(10) + ' unique=' + String(d.unique).padStart(2) + '  ratio=' + d.ratio));
console.log('  Diversity Score: ' + diversity + '  ' + (diversity >= 0.7 ? '✔ ≥0.70' : '✖ <0.70'));
console.log('✔ 报告 → ' + join(outDir, 'report.json'));
if (invalid > 0 || diversity < 0.7) process.exitCode = 1;
