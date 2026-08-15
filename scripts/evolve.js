#!/usr/bin/env node
/**
 * evolve — Phase D：在现有 DNA 上继续演化（不从头再来），维护版本历史（可回退）。
 * 用法: node scripts/evolve.js <dna.json> "<反馈/方向>" [--seed N] [--render] [--out <workspace>] [--title X]
 * 版本历史: --out <workspace> 下生成 v1/ v2/ ...（各含 dna.json + meta.json + index.html）+ versions.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { validateDna } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { mutateDna } from '../engine/design-dna/dna-presets.js';
import { interpretFeedback, applyDelta } from '../engine/intent/index.js';
import { render } from '../renderer/html/index.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const dnaPath = args.find((a) => a && a.endsWith('.json'));
const feedback = args.find((a) => a && !a.endsWith('.json') && !a.startsWith('--'));
if (!dnaPath || !feedback) { console.error('用法: evolve.js <dna.json> "<反馈/方向>" [--seed N] [--render] [--out workspace]'); process.exit(1); }

let dna;
try { dna = JSON.parse(readFileSync(dnaPath, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.error('DNA 解析失败:', e.message); process.exit(1); }

const { delta, note } = interpretFeedback(feedback);
let mutated = applyDelta(dna, delta);
mutated = mutateDna(mutated, { seed: Number(flagVal('seed')) || Date.now() % 100000 });
const v = validateDna(mutated);
console.log('evolve   : ' + feedback);
console.log('→ ' + note + '（叠加种子微变异，避免原地踏步）');
console.log('valid    : ' + (v.ok ? '✔ 0 错误' : '✖ ' + v.errors.join('; ')));
if (v.errors.length) process.exitCode = 1;

const workspace = resolve(flagVal('out') || dirname(dnaPath));
mkdirSync(workspace, { recursive: true });
const versionsPath = join(workspace, 'versions.json');
let versions = [];
if (existsSync(versionsPath)) { try { versions = JSON.parse(readFileSync(versionsPath, 'utf8')); } catch (e) { versions = []; } }
const n = versions.length + 1;
const vdir = join(workspace, 'v' + n);
mkdirSync(vdir, { recursive: true });
const meta = { version: n, feedback, note, seed: Number(flagVal('seed')) || null, created: new Date().toISOString() };
writeFileSync(join(vdir, 'dna.json'), JSON.stringify(mutated, null, 2), 'utf8');
writeFileSync(join(vdir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
if (args.includes('--render')) writeFileSync(join(vdir, 'index.html'), render(dnaToSpec(mutated, { title: flagVal('title') || 'POSTER' })), 'utf8');
versions.push({ version: n, feedback, created: meta.created, file: 'v' + n + '/dna.json' });
writeFileSync(versionsPath, JSON.stringify(versions, null, 2), 'utf8');
console.log('✔ 已保存 v' + n + ' → ' + vdir + (args.includes('--render') ? '（含渲染）' : ''));
console.log('  版本历史：' + versionsPath + '（' + versions.length + ' 版，可回退到任意 vN/dna.json）');
