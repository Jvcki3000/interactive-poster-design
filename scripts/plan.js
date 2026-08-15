/**
 * plan — 9 维度设计方案输出
 * 用法：node scripts/plan.js <spec.json> [--fingerprint fp.json] [--out plan.md] [--json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPlan } from '../engine/design-plan/index.js';

const args = process.argv.slice(2);
const specPath = args.find((a) => a && !a.startsWith('--'));
const flagVal = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!specPath) {
  console.error('用法: node scripts/plan.js <spec.json> [--fingerprint fp.json] [--out plan.md] [--json]');
  process.exit(1);
}

function load(p, label) {
  try {
    return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    console.error(label + '解析失败:', p, '-', e.message);
    process.exit(1);
  }
}

const spec = load(specPath, 'spec');
const fpPath = flagVal('fingerprint');
const fingerprint = fpPath ? load(fpPath, 'fingerprint') : undefined;

const plan = buildPlan(spec, { fingerprint });

if (args.includes('--json')) {
  const out = {
    title: spec?.content?.title,
    canvas: spec?.canvas,
    dimensions: plan.dimensions,
    interactions: plan.interactions,
    aiNess: plan.aiNess,
  };
  const text = JSON.stringify(out, null, 2);
  if (flagVal('out')) writeFileSync(resolve(flagVal('out')), text, 'utf8');
  else console.log(text);
} else {
  if (flagVal('out')) {
    const out = resolve(flagVal('out'));
    mkdirSync(resolve(flagVal('out')).slice(0, Math.max(0, out.lastIndexOf('\\'))), { recursive: true });
    writeFileSync(out, plan.md, 'utf8');
    console.log('✔ 设计方案已写出: ' + out);
  }
  console.log(plan.md);
}
process.exit(0);