#!/usr/bin/env node
/**
 * explore — 首次 UX：Brief + Mood → 3 个结构不同的方向（概念名，隐藏 DNA）。
 * 用法: node scripts/explore.js "<brief>" [--moods RAW,LOUD] [--seed N] [--out dir] [--render]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { listDnaPresets, getDnaPreset, pickDnaPreset, mutateDna } from '../engine/design-dna/dna-presets.js';
import { validateDna } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { interpretMood, applyDelta, conceptualName } from '../engine/intent/index.js';
import { inferRole, treatmentsFor } from '../engine/materials/index.js';
import { analyzeImages } from '../engine/materials/analyze.js';
import { render } from '../renderer/html/index.js';

/** 核心：给定 brief + mood，产出 3 个方向（含 DNA/spec/渲染） */
export function runExplore(brief, opts = {}) {
  const moods = opts.moods || [];
  const seed = Number(opts.seed) || 2026;
  const outDir = resolve(opts.out || 'out/explore');
  const renderAll = !!opts.render;
  const moodDelta = interpretMood(moods);
  // 素材：同一素材每个方向用不同处理/层级
  let material = null;
  if (opts.image) {
    const [analysis] = analyzeImages([opts.image]);
    const role = opts.role || inferRole(analysis);
    material = { analysis, role, treatments: opts.treatment ? [opts.treatment] : treatmentsFor(role), hierarchy: [0.85, 0.6, 0.4] };
  }
  const lines = [];
  if (moods.length) lines.push('mood → 已按 ' + moods.join(', ') + ' 调整设计（内部翻译，无需懂术语）');
  function pickThree() {
    const all = listDnaPresets();
    const chosen = [];
    for (const h of pickDnaPreset(brief).map((x) => x.key)) { if (chosen.length < 3 && !chosen.includes(h)) chosen.push(h); }
    let i = 0;
    while (chosen.length < 3) { const k = all[(seed + i * 97) % all.length].key; if (!chosen.includes(k)) chosen.push(k); i++; }
    return chosen;
  }
  const keys = pickThree();
  lines.push('— 三个方向我们可以都试试 —');
  const dirs = keys.map((key, i) => {
    let dna = getDnaPreset(key);
    if (Object.keys(moodDelta).length) dna = applyDelta(dna, moodDelta);
    dna = mutateDna(dna, { seed: seed + i * 137 });
    const v = validateDna(dna);
    let matEntry;
    if (material) {
      const treatment = material.treatments[i % material.treatments.length];
      matEntry = { id: 'material_0' + (i + 1), source_type: 'image', source_url: opts.image, filename: String(opts.image).split(/[\\/]/).pop(), role: material.role, treatment, hierarchy: material.hierarchy[i], placement: material.role === 'background' ? 'full_bleed' : 'center' };
      dna.design_vocabulary.materials = [matEntry];
    }
    const spec = dnaToSpec(dna, { title: opts.title || 'POSTER', date: opts.date, location: opts.location, image: matEntry ? matEntry.source_url : undefined, treatment: matEntry ? matEntry.treatment : undefined });
    const d = dna.design_vocabulary;
    const [name, concept] = conceptualName(i);
    const desc = [ (d.composition||{}).structure, (d.typography||{}).category, (d.color||{}).strategy, (d.materiality||{}).medium ].filter(Boolean).join(' · ');
    lines.push('  [' + i + '] ' + name + ' — ' + desc);
    if (v.errors.length) lines.push('    ⚠ 校验: ' + v.errors.join('; '));
    return { i, key, name, concept, dna, spec, valid: v.ok };
  });
  mkdirSync(outDir, { recursive: true });
  for (const d of dirs) {
    const dp = join(outDir, 'd' + d.i);
    mkdirSync(dp, { recursive: true });
    writeFileSync(join(dp, 'dna.json'), JSON.stringify(d.dna, null, 2), 'utf8');
    writeFileSync(join(dp, 'spec.json'), JSON.stringify(d.spec, null, 2), 'utf8');
    if (renderAll) writeFileSync(join(dp, 'index.html'), render(d.spec), 'utf8');
    if (!d.valid) process.exitCode = 1;
  }
  lines.push('✔ 已输出 3 个方向到 ' + outDir + (renderAll ? '（含渲染）' : '，加 --render 渲染'));
  return { lines, dirs, outDir };
}

// CLI
const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const brief = args.find((a) => a && !a.startsWith('--'));
if (!brief) { console.error('用法: explore.js "<brief>" [--moods RAW,LOUD] [--seed N] [--out dir] [--render]'); process.exit(1); }
const res = runExplore(brief, {
  moods: (flagVal('moods') || '').split(',').map((s) => s.trim()).filter(Boolean),
  seed: flagVal('seed'), out: flagVal('out'), render: args.includes('--render'),
  title: flagVal('title'), date: flagVal('date'), location: flagVal('location'),
  image: flagVal('image'), role: flagVal('role'), treatment: flagVal('treatment'),
});
process.stdout.write(res.lines.join('\n') + '\n');
