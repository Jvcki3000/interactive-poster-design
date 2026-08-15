import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../../engine/critic/index.js';
import { applyPreset } from '../../engine/presets/index.js';

const base = {
  canvas: { width: 1200, height: 1600 },
  content: { title: 'T', subtitle: 'S', date: '1 JAN', location: 'X', cta: 'GO', metadata: { brand: 'B', tag: 'T' } },
  style: {},
  animation: {},
  interactions: {},
};

test('克制设计 → AI-ness 低分通过', () => {
  const spec = applyPreset(JSON.parse(JSON.stringify(base)), 'swiss');
  const rep = evaluate(spec);
  assert.ok(rep.aiNess.score < 25, JSON.stringify(rep.aiNess));
  assert.equal(rep.aiNess.pass, true);
});

test('霓虹+装饰堆叠 → AI-ness 高分不过', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.colors = { bg: '#0a0a12', ink: '#f4f2ff', accent: '#00e5ff', accent2: '#ff2bd6', surface: '#15152a', muted: '#8a87a8' };
  spec.animation = { particles: { count: 30 }, glow: { pulse: true } };
  spec.interactions = { glow: { type: 'cursorLight' }, cursor: { type: 'ring' }, title: { click: 'explode' }, poster: { type: 'tilt3d', max: 7 } };
  const rep = evaluate(spec);
  assert.ok(rep.aiNess.score >= 25, JSON.stringify(rep.aiNess));
  assert.equal(rep.aiNess.pass, false);
});

test('AI-ness 信号含紫粉/堆叠等关键词', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.style.colors = { bg: '#0a0a12', ink: '#f4f2ff', accent: '#a855f7', accent2: '#ec4899', surface: '#15152a', muted: '#8a87a8' };
  spec.animation = { particles: { count: 30 }, glow: { pulse: true } };
  spec.interactions = { glow: { type: 'cursorLight' }, cursor: { type: 'ring' }, title: { click: 'explode' }, poster: { type: 'tilt3d', max: 7 } };
  const rep = evaluate(spec);
  assert.ok(rep.aiNess.signals.some((s) => s.includes('紫') || s.includes('霓虹') || s.includes('堆叠')));
});