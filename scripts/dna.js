#!/usr/bin/env node
/**
 * dna — Design DNA 校验 + 兼容规则 + 反 AI 审美风险。
 * 用法:
 *   node scripts/dna.js <dna.json>          # 校验 + 兼容检查 + AI 风险
 *   node scripts/dna.js --template          # 输出可填写的 DNA 模板
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { validateDna, checkCompatibility, templateDna } from '../engine/design-dna/dna.js';

const args = process.argv.slice(2);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };

if (args[0] === 'to-spec') {
  // node scripts/dna.js to-spec <dna.json> [--out spec.json] [--title X] [--subtitle X] [--date X] [--location X] [--price X] [--cta X] [--render]
  const dnaPath = args[1];
  if (!dnaPath) { console.error('用法: dna.js to-spec <dna.json> [--out spec.json] [--title ...] [--render]'); process.exit(1); }
  let dna;
  try { dna = JSON.parse(readFileSync(dnaPath, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.error('DNA 解析失败:', e.message); process.exit(1); }
  const { dnaToSpec } = await import('../engine/design-dna/index.js');
  const spec = dnaToSpec(dna, {
    title: flagVal('title'), subtitle: flagVal('subtitle'), date: flagVal('date'),
    location: flagVal('location'), price: flagVal('price'), cta: flagVal('cta'), brand: flagVal('brand'), tag: flagVal('tag'),
  });
  const outSpec = flagVal('out');
  const text = JSON.stringify(spec, null, 2);
  if (outSpec) { writeFileSync(outSpec, text, 'utf8'); console.log('✔ spec 已写入 ' + outSpec); } else process.stdout.write(text + '\n');
  if (args.includes('--render')) {
    const { render } = await import('../renderer/html/index.js');
    const html = render(spec);
    const htmlOut = (outSpec ? outSpec.replace(/\.json$/i, '') : 'poster') + '.html';
    writeFileSync(htmlOut, html, 'utf8');
    console.log('✔ 已渲染 ' + htmlOut + '（' + html.length + ' bytes）');
  }
  process.exit(0);
}

if (args.includes('--template')) {
  process.stdout.write(JSON.stringify(templateDna(), null, 2) + '\n');
  process.exit(0);
}
const path = args.find((a) => a && !a.startsWith('--'));
if (!path) { console.error('用法: node scripts/dna.js <dna.json> | --template'); process.exit(1); }
let dna;
try { dna = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.error('DNA 解析失败:', e.message); process.exit(1); }

const v = validateDna(dna);
console.log('— Design DNA 校验 —');
console.log('  字段数 ' + v.counts.fields + ' · 设计运动 ' + v.counts.movements + ' · 错误 ' + v.errors.length);
v.errors.forEach((e) => console.log('  ✖ ' + e));
if (!v.ok) process.exitCode = 1;

const c = checkCompatibility(dna);
console.log('— 兼容规则（命中 ' + c.matched.length + '/' + c.totalRules + '）—');
c.matched.forEach((m) => {
  const bad = m.avoid.filter((x) => x.violated);
  const miss = m.prefer.filter((x) => !x.satisfied);
  console.log('  [' + m.id + '] prefer✓' + (m.prefer.length - miss.length) + '/' + m.prefer.length + ' avoid✗' + bad.length + '/' + m.avoid.length);
  miss.forEach((x) => console.log('    - prefer 未满足: ' + x.path + ' = ' + JSON.stringify(x.value) + '（期望 ' + JSON.stringify(x.want) + '）'));
  bad.forEach((x) => console.log('    - avoid 违规: ' + x.path + ' = ' + JSON.stringify(x.value) + '（应避免 ' + JSON.stringify(x.want) + '）'));
  if (m.violatedCount > 0) process.exitCode = 1;
});

console.log('— 反 AI 审美风险 —');
console.log('  aiRisk = ' + c.aiRisk + (c.aiRisk >= 0.35 ? '（偏高，建议：换非霓虹色、去粒子/渐变、打破居中）' : '（低，符合反 AI 默认）'));
if (!v.ok || c.matched.some((m) => m.violatedCount > 0)) process.exitCode = 1;
