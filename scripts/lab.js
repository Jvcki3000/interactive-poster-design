#!/usr/bin/env node
/**
 * lab — Phase E：Advanced Design Lab（高级用户显式进入；首屏流程默认隐藏这些）。
 * 用法: node scripts/lab.js "<brief>" [--preset key] [--moods A,B] [--color s] [--orientation o]
 *        [--density n] [--interaction static|showcase] [--seed N] [--render] [--show-dna] [--out dir]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { listDnaPresets, getDnaPreset, pickDnaPreset, mutateDna } from '../engine/design-dna/dna-presets.js';
import { validateDna, checkCompatibility } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { interpretMood, applyDelta } from '../engine/intent/index.js';
import { render } from '../renderer/html/index.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const brief = args.find((a) => a && !a.startsWith('--'));
if (!brief) { console.error('用法: lab.js "<brief>" [--preset key] [--moods X] [--color s] [--density n] [--render] [--show-dna]'); process.exit(1); }

let presetKey = flagVal('preset');
if (!presetKey) {
  const hits = pickDnaPreset(brief);
  presetKey = hits.length ? hits[0].key : 'neo-editorial';
}
let dna = getDnaPreset(presetKey);
const moodDelta = interpretMood((flagVal('moods') || '').split(',').map((s) => s.trim()).filter(Boolean));
if (Object.keys(moodDelta).length) dna = applyDelta(dna, moodDelta);
dna = mutateDna(dna, {
  color: flagVal('color'), orientation: flagVal('orientation'),
  density: flagVal('density') != null ? Number(flagVal('density')) : undefined,
  interaction: flagVal('interaction'), seed: Number(flagVal('seed')) || 2026,
});
const v = validateDna(dna);
const c = checkCompatibility(dna);
const spec = dnaToSpec(dna, { title: flagVal('title') || 'POSTER' });
console.log('— Design Lab（高级）—');
console.log('brief     : ' + brief);
console.log('preset    : ' + presetKey);
console.log('movements : ' + (dna.design_vocabulary.design_movements || []).join(', '));
console.log('valid     : ' + (v.ok ? '✔ 0 错误' : '✖ ' + v.errors.join('; ')));
console.log('compat    : 命中 ' + c.matched.length + ' 规则，avoid 违规 ' + c.matched.reduce((n, m) => n + m.violatedCount, 0));
console.log('aiRisk    : ' + c.aiRisk);
if (args.includes('--show-dna')) process.stdout.write(JSON.stringify(dna, null, 2) + '\n');
const outDir = resolve(flagVal('out') || 'out/lab');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'dna.json'), JSON.stringify(dna, null, 2), 'utf8');
writeFileSync(join(outDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf8');
if (args.includes('--render')) writeFileSync(join(outDir, 'index.html'), render(spec), 'utf8');
console.log('✔ 已输出到 ' + outDir + (args.includes('--render') ? '（含渲染）' : ''));
if (!v.ok) process.exitCode = 1;
