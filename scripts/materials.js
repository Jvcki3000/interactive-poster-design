#!/usr/bin/env node
/**
 * materials — 素材智能（Phase 1-4）：上传板 + 分析 + 角色推断 + 处理建议。
 * 用法: node scripts/materials.js <图片...> [--out board.json] [--role hero] [--treatment duotone]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';


import { inferRole, treatmentsFor, ROLE_LABEL } from '../engine/materials/index.js';
import { analyzeImages } from '../engine/materials/analyze.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const images = args.filter((a) => a && !a.startsWith('--') && !a.endsWith('.json'));
if (!images.length) { console.error('用法: materials.js <图片...> [--out board.json] [--role hero]'); process.exit(1); }

// 找 python（复用 poster.js 逻辑：env / python / py / codex runtime）
const tmp = resolve(flagVal('out') || 'material-board.json');
const analyses = analyzeImages(images);

const roleOverride = flagVal('role');
const treatmentOverride = flagVal('treatment');
const board = analyses.map((a, i) => {
  const role = roleOverride || inferRole(a);
  const treatments = treatmentOverride ? [treatmentOverride] : treatmentsFor(role);
  return {
    id: 'material_' + String(i + 1).padStart(2, '0'),
    source_type: a.logo_presence ? 'logo' : 'image',
    source_url: a.path,
    filename: a.path.split(/[\\/]/).pop(),
    analysis: a,
    role, role_label: ROLE_LABEL[role] || role,
    treatment: treatmentOverride || treatments[0],
    treatments,
    hierarchy: role === 'hero' ? 0.85 : role === 'background' ? 0.4 : 0.5,
  };
});
writeFileSync(tmp, JSON.stringify(board, null, 2), 'utf8');

console.log('— YOUR MATERIALS —');
for (const b of board) {
  const a = b.analysis;
  console.log('  [' + b.id + '] ' + b.filename + '  ' + a.orientation + ' ' + a.width + 'x' + a.height);
  console.log('        角色: ' + b.role_label + '（' + b.role + '）  建议处理: ' + b.treatments.join(', ') + ' → 默认 ' + b.treatment);
  console.log('        分析: colors=' + a.dominant_colors.slice(0, 3).join(',') + ' 对比=' + a.contrast + ' 视觉权重=' + a.visual_weight + (a.human_presence ? ' 有人物' : '') + (a.logo_presence ? ' Logo' : ''));
}
console.log('✔ 素材板已写入 ' + tmp + '（角色可改：--role hero|background|texture|logo|decorative…）');
