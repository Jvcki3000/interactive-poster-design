import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';

const base = {
  canvas: { width: 1080, height: 1620 },
  content: { title: 'NIAGARA', subtitle: 'S', location: 'X', metadata: { brand: 'B', tag: 'T' } },
  style: {
    colors: { bg: '#f4f1ea', surface: '#ffffff', ink: '#1c1a16', accent: '#3b6ea5', accent2: '#c9821e', muted: '#6a6257' },
    typography: { fontFamily: 'Arial', bodyFont: 'Arial' },
    timePhases: [
      { hour: 8, label: '08:00', name: 'DAWN', colors: { bg: '#f4f1ea', ink: '#1c1a16', accent: '#3b6ea5' }, fx: { grain: 0.08, glow: 0.5 } },
      { hour: 20, label: '20:00', name: 'NEON', colors: { bg: '#0a0a14', ink: '#f4f2ff', accent: '#ff2bd6' }, fx: { grain: 0.3, glow: 2.4, blur: 0.2 } },
    ],
  },
};

test('timePhases：渲染时间芯片 + 相位 CSS 变量 + 运行时 JS', () => {
  const html = render(base);
  assert.match(html, /id="timeChip"/);
  assert.match(html, /id="tcText"/);
  assert.match(html, /data-phase="0"/);
  assert.match(html, /data-phase="1"/);
  assert.match(html, /--bg: #f4f1ea/);
  assert.match(html, /--bg: #0a0a14/);
  assert.match(html, /--glow-color: color-mix\(in srgb, #ff2bd6 72%, transparent\)/);
  assert.match(html, /function phaseForHour/);
  assert.match(html, /function goLive/);
  assert.match(html, /setInterval\(function \(\) \{ if \(live\)/);
  // 配色走 CSS 变量（可被相位切换）
  assert.match(html, /background: var\(--bg\)/);
  assert.match(html, /color: var\(--ink\)/);
});

test('无 timePhases：不渲染时间芯片，配色仍用 CSS 变量默认值', () => {
  const spec = JSON.parse(JSON.stringify(base));
  delete spec.style.timePhases;
  const html = render(spec);
  assert.ok(!html.includes('id="timeChip"'));
  assert.ok(!html.includes('data-phase='));
  assert.match(html, /--bg: #f4f1ea/);
  assert.match(html, /background: var\(--bg\)/);
});

test('@property 注册颜色变量以支持平滑过渡', () => {
  const html = render(base);
  assert.match(html, /@property --bg \{ syntax: '<color>'/);
  assert.match(html, /@property --accent \{ syntax: '<color>'/);
  assert.match(html, /@property --grain \{ syntax: '<number>'/);
});
