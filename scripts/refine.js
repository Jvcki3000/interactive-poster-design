#!/usr/bin/env node
/**
 * refine — 首次 UX：自然语言反馈 → 定向 Design DNA 变异（用户不需要懂 DNA）。
 * 用法: node scripts/refine.js <dna.json> "<feedback>" [--out dna.json] [--render] [--title X]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { validateDna } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { interpretFeedback, applyDelta } from '../engine/intent/index.js';
import { render } from '../renderer/html/index.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const dnaPath = args.find((a) => a && !a.startsWith('--') && /.json$/i.test(a));
const feedback = args.find((a) => a && !a.startsWith('--') && !/.json$/i.test(a));
if (!dnaPath || !feedback) { console.error('用法: refine.js <dna.json> "<feedback>" [--out dna.json] [--render]'); process.exit(1); }

let dna;
try { dna = JSON.parse(readFileSync(dnaPath, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.error('DNA 解析失败:', e.message); process.exit(1); }

const { delta, note } = interpretFeedback(feedback);
const mutated = applyDelta(dna, delta);
const v = validateDna(mutated);
console.log('feedback : ' + feedback);
console.log('→ ' + note);
console.log('变更     : ' + JSON.stringify(delta));
console.log('valid    : ' + (v.ok ? '✔ 0 错误' : '✖ ' + v.errors.join('; ')));

const outPath = resolve(flagVal('out') || dnaPath);
writeFileSync(outPath, JSON.stringify(mutated, null, 2), 'utf8');
console.log('dna      : ' + outPath);
if (v.errors.length) process.exitCode = 1;

if (args.includes('--render')) {
  const spec = dnaToSpec(mutated, { title: flagVal('title') || 'POSTER' });
  const dir = dirname(outPath);
  mkdirSync(dir, { recursive: true });
  const htmlPath = dir + '/index.html';
  writeFileSync(htmlPath, render(spec), 'utf8');
  console.log('poster   : ' + htmlPath);
}
