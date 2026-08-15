import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';

const base = {
  canvas: { width: 1080, height: 1620 },
  content: {
    title: 'DUNE',
    subtitle: 'PART THREE',
    metadata: { brand: 'L', tag: 'T' },
    hotspots: [
      { x: 50, y: 42, r: 15, label: 'PAUL', meta: 'CHARACTER PROFILE', detail: 'bio', sections: [{ heading: 'House', text: 'Atreides' }] },
    ],
  },
  style: { imagery: { image: { src: 'still.jpg', duotone: true, scrim: true } } },
  interactions: {},
};

test('热点支持 meta + sections（电影海报弹卡）', () => {
  const html = render(base);
  assert.match(html, /data-meta="CHARACTER PROFILE"/);
  assert.match(html, /data-sections="\[/);
  assert.match(html, /id="hpMeta"/);
  assert.match(html, /id="hpSections"/);
  assert.match(html, /id="hpClose"/);
  assert.match(html, /House/);
});

test('热点无 meta/sections 时也能渲染', () => {
  const spec = JSON.parse(JSON.stringify(base));
  spec.content.hotspots = [{ x: 50, y: 50, r: 10, label: 'X', detail: 'y' }];
  const html = render(spec);
  assert.match(html, /data-meta=""/);
  assert.match(html, /data-sections="\[\]"/);
});