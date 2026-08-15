import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listVocabulary, compose, validateCombo, LAYOUT, TYPOGRAPHY, COLOR, INTERACTION, GRAPHIC } from '../../engine/design-dna/vocab.js';
import { render } from '../../renderer/html/index.js';

test('词表规模：49 原语 + 5 风格预设', () => {
  assert.equal(Object.keys(LAYOUT).length, 5);
  assert.equal(Object.keys(TYPOGRAPHY).length, 4);
  assert.equal(Object.keys(COLOR).length, 21);
  assert.equal(Object.keys(INTERACTION).length, 16);
  assert.equal(Object.keys(GRAPHIC).length, 3);
  const rows = listVocabulary();
  const pure = rows.filter((r) => r.category !== 'style');
  assert.equal(pure.length, 49);
  assert.equal(rows.length, 54);
});

test('compose 组合原语 → 可渲染 spec', () => {
  const spec = compose(
    { layout: 'split', type: 'serif', color: 'duotone', interactions: ['hover:glitch', 'click:explode', 'cursor:ring', 'cursor:tilt3d'], graphics: ['ball'] },
    { title: 'TEST' },
  );
  assert.equal(spec.style.layout.mode, 'split');
  assert.equal(spec.style.typography.type, 'serif');
  assert.equal(spec.interactions.title.effect, 'glitch');
  assert.equal(spec.interactions.cursor.type, 'ring');
  assert.ok(spec.style.imagery.ball);
  const html = render(spec);
  assert.match(html, /mode-split/);
});

test('compose 未知原语报错', () => {
  assert.throws(() => compose({ layout: 'nope' }), /未知排版/);
  assert.throws(() => compose({ interactions: ['hover:nope'] }), /未知交互/);
});

test('validateCombo 校验非法 spec', () => {
  const spec = compose({ layout: 'hero', type: 'mono' });
  assert.equal(validateCombo(spec).valid, true);
  spec.style.layout.mode = 'weird';
  spec.interactions.title = { type: 'hover', effect: 'unknown' };
  const v = validateCombo(spec);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some((s) => s.includes('weird')));
  assert.ok(v.issues.some((s) => s.includes('unknown')));
});