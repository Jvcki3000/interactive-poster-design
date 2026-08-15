/**
 * vocab — Design Vocabulary 命令行
 * 用法：
 *   node scripts/vocab.js list                          # 打印全部词表
 *   node scripts/vocab.js compose --layout split --type serif --color duotone \
 *     --fx hover:glitch --fx click:explode --fx cursor:ring --graphic ball \
 *     [--title ...] [--out out/lang] [--render]
 *   node scripts/vocab.js validate <spec.json>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { listVocabulary, compose, validateCombo } from '../engine/design-dna/vocab.js';
import { render } from '../renderer/html/index.js';
import { resolveSize } from '../engine/design-dna/vocab.js';

const args = process.argv.slice(2);
const cmd = args[0];
const flagVal = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const flags = args.filter((a) => a.startsWith('--'));

function allValues(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--' + name && args[i + 1]) out.push(args[i + 1]);
  }
  return out;
}

if (cmd === 'list') {
  const rows = listVocabulary();
  const byCat = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] || 0) + 1;
  console.log('— Design Vocabulary（共 ' + rows.length + ' 条：' + Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join(' · ') + '）—');
  let cur = '';
  for (const r of rows) {
    if (r.category !== cur) {
      cur = r.category;
      console.log('\n[' + cur + ']');
    }
    console.log('  ' + r.key.padEnd(18) + r.name.padEnd(22) + r.spec);
  }
  process.exit(0);
}

if (cmd === 'compose') {
  const lang = {
    layout: flagVal('layout'),
    type: flagVal('type'),
    color: flagVal('color'),
    style: flagVal('style'),
    interactions: allValues('fx'),
    graphics: allValues('graphic'),
  };
  try {
    const size = resolveSize(flagVal('size'));
    const spec = compose(lang, {
      width: size?.width,
      height: size?.height,
      title: flagVal('title'),
      subtitle: flagVal('subtitle'),
      date: flagVal('date'),
      location: flagVal('location'),
      cta: flagVal('cta'),
      seed: Number(flagVal('seed') ?? 2026),
    });
    const outDir = resolve(flagVal('out') ?? 'out/lang');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf8');
    console.log('✔ 已组合: ' + resolve(outDir, 'spec.json'));
    if (args.includes('--render')) {
      writeFileSync(resolve(outDir, 'index.html'), render(spec), 'utf8');
      console.log('✔ 已渲染: ' + resolve(outDir, 'index.html'));
    }
    const v = validateCombo(spec);
    console.log('  校验: ' + (v.valid ? '✅ 合法' : '❌ ' + v.issues.join('; ')));
    process.exit(0);
  } catch (e) {
    console.error('组合失败:', e.message);
    process.exit(1);
  }
}

if (cmd === 'validate') {
  const specPath = args[1];
  if (!specPath) {
    console.error('用法: node scripts/vocab.js validate <spec.json>');
    process.exit(1);
  }
  let spec;
  try {
    spec = JSON.parse(readFileSync(specPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    console.error('spec 解析失败:', e.message);
    process.exit(1);
  }
  const v = validateCombo(spec);
  if (v.valid) {
    console.log('✅ 词表校验通过');
  } else {
    console.log('❌ 词表校验失败:');
    v.issues.forEach((s) => console.log('  - ' + s));
    process.exit(1);
  }
  process.exit(0);
}

console.error('用法: node scripts/vocab.js <list|compose|validate> [参数...]');
process.exit(1);