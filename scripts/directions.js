#!/usr/bin/env node
/**
 * directions — 生成 N 个（默认 3）真正不同的设计方向（TASK-006）。
 * 方向来自不同 Design DNA 预设 + 独立变异，而不是同一 spec 的换色。
 * 用法:
 *   node scripts/directions.js "<brief 或 spec.json>" [--count 3] [--seed N] [--out out/directions]
 *        [--render] [--pick N] [--title X] [--date X] [--location X] [--color s] [--orientation o]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { listDnaPresets, getDnaPreset, pickDnaPreset } from '../engine/design-dna/dna-presets.js';
import { mutateDna } from '../engine/design-dna/dna-presets.js';
import { validateDna } from '../engine/design-dna/dna.js';
import { dnaToSpec } from '../engine/design-dna/index.js';
import { render } from '../renderer/html/index.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const input = args.find((a) => a && !a.startsWith('--'));
if (!input) { console.error('用法: directions.js "<brief|spec.json>" [--count 3] [--seed N] [--render] [--pick N]'); process.exit(1); }

const count = Math.max(2, Math.min(6, Number(flagVal('count')) || 3));
const seed = Number(flagVal('seed')) || 2026;
const outDir = resolve(flagVal('out') || 'out/directions');
const renderAll = args.includes('--render');
const pick = flagVal('pick');

// 1) 内容：spec 文件（兼容旧用法）或 brief
let content = {};
if (existsSync(input) && /\.[a-z]+$/i.test(input)) {
  try { const s = JSON.parse(readFileSync(input, 'utf8').replace(/^\uFEFF/, '')); content = s.content || {}; }
  catch (e) { console.error('spec 解析失败:', e.message); process.exit(1); }
}
const C = (k, f) => flagVal(k) ?? content[k] ?? (f ? '' : undefined);

// 2) 选 N 个不同预设：brief → pick 命中优先，不足用种子轮转补齐
function pickPresets(n) {
  const all = listDnaPresets();
  const chosen = [];
  const hits = pickDnaPreset(input).map((h) => h.key);
  for (const k of hits) { if (chosen.length < n && !chosen.includes(k)) chosen.push(k); }
  let i = 0;
  while (chosen.length < n) {
    const k = all[(seed + i * 97) % all.length].key;
    if (!chosen.includes(k)) chosen.push(k);
    i++;
  }
  return chosen;
}

const keys = pickPresets(count);
console.log('— Design Director：' + count + ' 个方向（来自 ' + count + ' 个不同 Design DNA 预设）—');

// 3) 每个方向：预设 → 变异 → DNA → spec →（可选）渲染
const directions = keys.map((key, i) => {
  const base = getDnaPreset(key);
  const dna = mutateDna(base, {
    color: flagVal('color'),
    orientation: flagVal('orientation'),
    seed: seed + i * 137,
  });
  const v = validateDna(dna);
  const spec = dnaToSpec(dna, {
    title: C('title', true) || 'UNTITLED', subtitle: C('subtitle'), date: C('date'),
    location: C('location'), price: C('price'), cta: C('cta'), brand: C('brand'), tag: C('tag'),
  });
  return { i, key, name: base.name, dna, spec, valid: v.ok, errs: v.errors, d: dna.design_vocabulary };
});

for (const d of directions) {
  const col = d.d.color || {}; const typo = d.d.typography || {}; const comp = d.d.composition || {};
  console.log('  [' + d.i + '] ' + d.key.padEnd(26) + ' ' + (d.name || '').padEnd(16) +
    ' color=' + (col.strategy || '-').padEnd(14) + ' type=' + (typo.category || '-').padEnd(12) +
    ' structure=' + (comp.structure || '-') + (d.valid ? '' : '  ✖ 校验失败'));
}

// 4) 输出
mkdirSync(outDir, { recursive: true });
for (const d of directions) {
  const dirPath = join(outDir, 'd' + d.i);
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(join(dirPath, 'dna.json'), JSON.stringify(d.dna, null, 2), 'utf8');
  writeFileSync(join(dirPath, 'spec.json'), JSON.stringify(d.spec, null, 2), 'utf8');
  if (renderAll && (pick == null || String(pick) === String(d.i))) {
    const html = render(d.spec);
    writeFileSync(join(dirPath, 'index.html'), html, 'utf8');
  }
  if (!d.valid) process.exitCode = 1;
}
console.log('✔ 已输出 ' + count + ' 个方向到 ' + outDir + (renderAll ? '（含渲染）' : '（未渲染，加 --render）'));
