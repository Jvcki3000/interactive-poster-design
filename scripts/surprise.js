#!/usr/bin/env node
/**
 * surprise — Phase E："给我惊喜"：随机类别 + 随机 brief → 3 个故意不同的方向（不直接出通用海报）。
 * 用法: node scripts/surprise.js [--seed N] [--render] [--out dir] [--moods X]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExplore } from './explore.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const seed = Number(flagVal('seed')) || Date.now() % 100000;
const HERE = dirname(fileURLToPath(import.meta.url));
const briefs = JSON.parse(readFileSync(join(HERE, '..', 'benchmarks', 'briefs', 'briefs.json'), 'utf8'));
const brief = briefs[seed % briefs.length];
console.log('— Surprise me —');
console.log('随机主题：' + brief.brief + '（类别 ' + brief.id + '）');
runExplore(brief.brief, {
  moods: (flagVal('moods') || '').split(',').map((s) => s.trim()).filter(Boolean),
  seed, out: flagVal('out') || ('out/surprise-' + (seed % 1000)), render: args.includes('--render'),
  title: flagVal('title'),
});
