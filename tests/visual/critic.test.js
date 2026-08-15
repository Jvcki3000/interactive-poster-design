import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../../renderer/html/index.js';
import { evaluate } from '../../engine/critic/index.js';

const spec = JSON.parse(
  readFileSync(new URL('../../examples/event-poster/spec.json', import.meta.url), 'utf8'),
);

test('evaluate 对非对象报错', () => {
  assert.throws(() => evaluate(null), /spec/);
});

test('event-poster 渲染后可评分且结构完整', () => {
  const html = render(spec);
  const rep = evaluate(spec, html);
  assert.equal(typeof rep.overall, 'number');
  assert.equal(typeof rep.pass, 'boolean');
  assert.ok(Array.isArray(rep.suggestions));
  for (const k of ['hierarchy', 'typography', 'composition', 'contrast', 'balance', 'brandConsistency', 'readability']) {
    assert.ok(k in rep.scores, `缺少维度 ${k}`);
  }
});

test('高对比配色 → contrast 高分', () => {
  const s = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'AAA', subtitle: 'BBB', date: '1 JAN', location: 'X', cta: 'GO' },
    style: { colors: { bg: '#000000', ink: '#ffffff', accent: '#ff0000', accent2: '#00ff00', surface: '#111111', muted: '#888888' } },
  };
  const rep = evaluate(s, render(s));
  assert.ok(rep.scores.contrast.score >= 8, JSON.stringify(rep.scores.contrast));
});

test('低对比配色 → contrast 低分且含建议', () => {
  const s = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'AAA', subtitle: 'BBB', date: '1 JAN', location: 'X', cta: 'GO' },
    style: { colors: { bg: '#888888', ink: '#777777', accent: '#999999', accent2: '#aaaaaa', surface: '#7f7f7f', muted: '#666666' } },
  };
  const rep = evaluate(s, render(s));
  assert.ok(rep.scores.contrast.score < 7);
  assert.ok(rep.suggestions.some((x) => x.includes('对比度')));
});

test('过长标题 → typography 低分', () => {
  const s = {
    canvas: { width: 1200, height: 1600 },
    content: { title: 'THIS IS A VERY VERY VERY LONG TITLE THAT OVERFLOWS', subtitle: 'BBB', date: '1 JAN', location: 'X', cta: 'GO' },
    style: { typography: { titleScale: 4 } },
  };
  const rep = evaluate(s, render(s));
  assert.ok(rep.scores.typography.score < 8);
  assert.ok(rep.suggestions.some((x) => x.includes('超出')));
});