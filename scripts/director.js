#!/usr/bin/env node
/**
 * director — 离线 Design Director：brief → 选预设 → 变异 → Design DNA →（可选）spec + 渲染。
 * 用法:
 *   node scripts/director.js "<brief>" [--preset key] [--title X] [--date X] [--location X]
 *        [--color strategy] [--orientation o] [--density 0.6] [--interaction static|showcase]
 *        [--seed N] [--out dir] [--render]
 * 输出: DNA（stdout / --out/dna.json）；--render 时同时写 spec.json + index.html
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { getDnaPreset, pickDnaPreset } from '../engine/design-dna/dna-presets.js';
import { mutateDna } from '../engine/design-dna/dna-presets.js';
import { validateDna, checkCompatibility } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { render } from '../renderer/html/index.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const brief = args.find((a) => a && !a.startsWith('--'));
if (!brief) { console.error('用法: director.js "<brief>" [--preset key] [--title X] [--render] …'); process.exit(1); }

const VAGUE = /^(现代|高级|酷|未来感|好看|简约|大气|时尚)?(modern|cool|premium|futuristic|beautiful|nice|slick|elegant)?\s*$/i;

// 1) 空泛输入检测
const vagueOnly = VAGUE.test(brief.trim());
if (vagueOnly) {
  console.warn('⚠ 检测到空泛描述（modern/cool/premium…）。已按用途兜底为 neo-editorial，并给出可调 DNA。');
}

// 2) 选预设
let presetKey = flagVal('preset');
if (!presetKey) {
  const hits = pickDnaPreset(brief);
  presetKey = (hits.length ? hits[0].key : null) || (vagueOnly ? 'neo-editorial' : 'neo-editorial');
}
const base = getDnaPreset(presetKey);
if (!base) { console.error('未找到预设: ' + presetKey); process.exit(1); }

// 3) 轻量启发式 + 显式参数
let orientation = flagVal('orientation');
if (!orientation) {
  if (/横版|宽幅|landscape|wide/i.test(brief)) orientation = 'landscape';
  else if (/方形|square/i.test(brief)) orientation = 'square';
}
let interaction = flagVal('interaction');
if (!interaction && /互动|动效|炫|interactive|motion/i.test(brief)) interaction = 'showcase';

const dna = mutateDna(base, {
  color: flagVal('color'),
  orientation,
  density: flagVal('density') != null ? Number(flagVal('density')) : undefined,
  interaction,
  seed: flagVal('seed') != null ? Number(flagVal('seed')) : undefined,
});

// 4) 校验 + 兼容
const v = validateDna(dna);
const c = checkCompatibility(dna);
console.log('— Design Director —');
console.log('brief     : ' + brief);
console.log('preset    : ' + presetKey + '  [' + base.name + ']');
console.log('movements : ' + (dna.design_vocabulary.design_movements || []).join(', '));
console.log('color     : ' + (dna.design_vocabulary.color || {}).strategy);
console.log('type      : ' + (dna.design_vocabulary.typography || {}).category);
console.log('structure : ' + (dna.design_vocabulary.composition || {}).structure + ' / ' + (dna.design_vocabulary.composition || {}).orientation);
console.log('valid     : ' + (v.ok ? '✔ 0 错误' : '✖ ' + v.errors.length + ' 错误'));
console.log('compat    : 命中 ' + c.matched.length + ' 规则，avoid 违规 ' + c.matched.reduce((n, m) => n + m.violatedCount, 0));
console.log('aiRisk    : ' + c.aiRisk);

// 5) 输出 DNA +（可选）spec + 渲染
const outDir = resolve(flagVal('out') || 'out/director');
mkdirSync(outDir, { recursive: true });
const dnaPath = join(outDir, 'dna.json');
writeFileSync(dnaPath, JSON.stringify(dna, null, 2), 'utf8');
console.log('dna       : ' + dnaPath);

if (args.includes('--render')) {
  const toSpecOpts = {
    title: flagVal('title') || (brief.split(/[，。,.!?？\s]/)[0].slice(0, 24) || 'UNTITLED'),
    date: flagVal('date'), location: flagVal('location'),
  };
  const spec = dnaToSpec(dna, toSpecOpts);
  if (toSpecOpts.__colorGuarded) {
    console.log('colorGuard: ⚠ 风险 ' + toSpecOpts.__colorGuarded.risk.toFixed(2) + ' > 0.6，已自动换安全色板 ' + JSON.stringify(toSpecOpts.__colorGuarded.after));
  }
  const specPath = join(outDir, 'spec.json');
  writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
  const html = render(spec);
  const htmlPath = join(outDir, 'index.html');
  writeFileSync(htmlPath, html, 'utf8');
  console.log('spec      : ' + specPath);
  console.log('poster    : ' + htmlPath + '（' + html.length + ' bytes）');
}

if (!v.ok) process.exitCode = 1; // avoid 违规仅提示，不阻塞（预设库本身合法）
