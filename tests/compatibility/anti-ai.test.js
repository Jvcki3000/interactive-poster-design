import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSpecAi, dnaAestheticRisk, detectAntiAI } from '../../engine/color/anti-ai.js';

test('TASK-014：spec 级检测与旧 critic 行为一致（紫粉强调色 → 高分）', () => {
  const spec = { style: { colors: { bg: '#111', ink: '#eee', accent: '#9b5de5', accent2: '#00f5d4' } }, animation: {}, interactions: {} };
  const r = detectSpecAi(spec);
  assert.ok(r.score >= 20, '紫粉强调色应触发 AI 信号，got ' + r.score);
  assert.equal(r.pass, r.score < 25);
});

test('TASK-014：DNA 级风险可叠加到统一入口', () => {
  const dna = { design_vocabulary: { color: { gradient: true, palette: ['#7c3aed', '#06b6d4', '#ec4899'] }, graphic_language: { elements: ['particles'] } } };
  const spec = { style: {}, animation: {}, interactions: {} };
  const only = detectSpecAi(spec);
  const both = detectAntiAI({ spec, dna });
  assert.ok(both.score > only.score, 'DNA 风险应提升总分');
  assert.ok(dnaAestheticRisk(dna) >= 0.4, 'DNA 风险应较高，got ' + dnaAestheticRisk(dna));
});

test('TASK-014：干净 DNA（黑+点缀色）风险低', () => {
  const dna = { design_vocabulary: { color: { gradient: false, palette: ['#111111', '#F4F1EA', '#E63329'] }, graphic_language: { elements: ['line'] }, composition: { structure: 'asymmetric', alignment: ['left_edge'] } } };
  assert.ok(dnaAestheticRisk(dna) < 0.2, 'got ' + dnaAestheticRisk(dna));
});
