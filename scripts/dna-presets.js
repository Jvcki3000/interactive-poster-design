#!/usr/bin/env node
/**
 * dna-presets — Design DNA 预设库 CLI。
 * 用法:
 *   node scripts/dna-presets.js                          # 列出全部预设
 *   node scripts/dna-presets.js show <key>               # 输出完整 DNA JSON
 *   node scripts/dna-presets.js pick "<查询>"            # 按描述挑选预设
 *   node scripts/dna-presets.js mutate <key> [--color s] [--orientation o] [--density 0.6] [--movements a,b] [--interaction static|showcase] [--seed N] [--out f.json]
 */
import { writeFileSync } from 'node:fs';
import { listDnaPresets, getDnaPreset, pickDnaPreset, mutateDna } from '../engine/design-dna/dna-presets.js';

const args = process.argv.slice(2);
const sub = args[0];
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const outPath = flagVal('out');

function emit(obj) {
  const s = JSON.stringify(obj, null, 2);
  if (outPath) { writeFileSync(outPath, s, 'utf8'); console.log('✔ 已写入 ' + outPath); }
  else process.stdout.write(s + '\n');
}

if (!sub || sub === 'list') {
  const list = listDnaPresets();
  console.log('共 ' + list.length + ' 个 Design DNA 预设：');
  list.forEach((p) => console.log('  ' + p.key.padEnd(26) + ' ' + p.name + '  [' + p.movements.join(', ') + ']'));
  process.exit(0);
}

if (sub === 'show') {
  const p = getDnaPreset(args[1]);
  if (!p) { console.error('未找到预设: ' + args[1] + '（试试 dna-presets list）'); process.exit(1); }
  emit(p);
  process.exit(0);
}

if (sub === 'pick') {
  const q = args.slice(1).join(' ');
  const hits = pickDnaPreset(q);
  if (!hits.length) { console.log('没有匹配项，试试：swiss / brutalist / luxury / music / minimal / film / print …'); process.exit(1); }
  console.log('「' + q + '」 → 最匹配：' + hits[0].key + '（' + hits[0].name + '）');
  hits.slice(0, 5).forEach((h, i) => console.log('  ' + (i + 1) + '. ' + h.key + ' score=' + h.score));
  process.exit(0);
}

if (sub === 'mutate') {
  const base = getDnaPreset(args[1]);
  if (!base) { console.error('未找到预设: ' + args[1]); process.exit(1); }
  const opts = {
    color: flagVal('color'),
    orientation: flagVal('orientation'),
    density: flagVal('density') != null ? Number(flagVal('density')) : undefined,
    movements: flagVal('movements') ? flagVal('movements').split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    interaction: flagVal('interaction'),
    seed: flagVal('seed') != null ? Number(flagVal('seed')) : undefined,
  };
  const dna = mutateDna(base, opts);
  emit(dna);
  process.exit(0);
}

console.error('用法: dna-presets [list|show <key>|pick <query>|mutate <key> --color x ...]');
process.exit(1);
