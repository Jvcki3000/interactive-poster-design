import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDnaPreset, pickDnaPreset, mutateDna } from '../../engine/design-dna/dna-presets.js';
import { dnaToSpec } from '../../engine/design-dna/index.js';
import { readFileSync } from 'node:fs';
import { validateDna } from '../../engine/design-dna/dna.js';

// TASK-020 官方公式：0.25 Layout + 0.20 Color + 0.20 Typography + 0.15 Imagery + 0.10 Graphic + 0.10 Interaction
const DIMS = [
  ['layout', 0.25], ['color', 0.20], ['type', 0.20], ['imagery', 0.15], ['graphic', 0.10], ['interaction', 0.10],
];
export function diversityScore(rows, sat = 8) {
  const total = rows.length;
  const dims = DIMS.map(([k, w]) => {
    const set = new Set(rows.map((r) => JSON.stringify(r[k])));
    const n = set.size;
    return { dim: k, unique: n, ratio: +Math.min(1, n / Math.min(total, sat)).toFixed(2), weight: w };
  });
  return { score: +dims.reduce((s, d) => s + d.ratio * d.weight, 0).toFixed(2), dims };
}

function sample(brief, seed) {
  const hits = pickDnaPreset(brief);
  const presetKey = hits.length ? hits[0].key : 'neo-editorial';
  const dna = mutateDna(getDnaPreset(presetKey), { seed });
  const v = validateDna(dna);
  if (!v.ok) throw new Error(presetKey + ' seed ' + seed + ' 非法: ' + v.errors.join('; '));
  const spec = dnaToSpec(dna, { title: 'X', date: 'D', location: 'L', cta: 'C' });
  const dd = dna.design_vocabulary;
  return {
    layout: spec.style.layout.mode,
    color: (dd.color || {}).strategy,
    type: (dd.typography || {}).category,
    imagery: (dd.imagery || {}).source,
    graphic: ((dd.graphic_language || {}).elements || []).join('|'),
    interaction: (dd.interaction || {}).primary,
  };
}

test('TASK-019：同一 brief ×10 — 布局至少 3 种，且跨维度有意义变化', () => {
  const brief = 'Underground electronic music festival poster';
  const rows = [];
  for (let i = 1; i <= 10; i++) rows.push(sample(brief, i * 101 + 7));
  const layouts = new Set(rows.map((r) => r.layout));
  assert.ok(layouts.size >= 3, '布局多样性不足: ' + JSON.stringify([...layouts]));
  const { score, dims } = diversityScore(rows);
  dims.forEach((d) => console.log('  ' + d.dim.padEnd(11) + ' unique=' + String(d.unique).padStart(2) + ' ratio=' + d.ratio));
  assert.ok(score >= 0.3, '同预设 ×10 应存在跨维度变化，score ' + score); // 0.70 是系统级目标，见 bench
});

test('TASK-020：24 条语料 Diversity ≥0.70（系统级目标）', () => {
  const briefs = JSON.parse(readFileSync(new URL('../../benchmarks/briefs/briefs.json', import.meta.url), 'utf8'));
  const rows = [];
  briefs.forEach((b, i) => { const s = sample(b.brief, 2026 + i * 137); if (s) rows.push(s); });
  assert.equal(rows.length, briefs.length);
  const { score, dims } = diversityScore(rows);
  dims.forEach((d) => console.log('  ' + d.dim.padEnd(11) + ' unique=' + String(d.unique).padStart(2) + ' ratio=' + d.ratio));
  assert.ok(score >= 0.7, 'Diversity ' + score + ' < 0.70');
});
