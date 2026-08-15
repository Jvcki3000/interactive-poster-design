import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../../renderer/html/index.js';
import { groupForCode, labelForCode, matchPhase } from '../../engine/weather/weather-codes.js';

const base = {
  canvas: { width: 1080, height: 1620 },
  content: { title: 'CITY LIVE', subtitle: 'S', location: 'X', metadata: { brand: 'B', tag: 'T' } },
  style: {
    colors: { bg: '#101820', ink: '#e6eef4', accent: '#6f8fa8' },
    typography: { fontFamily: 'Arial', bodyFont: 'Arial' },
    weather: {
      defaultCity: 'Singapore',
      lat: 1.3521,
      lon: 103.8198,
      phases: [
        { match: { group: ['clear'], isDay: true }, name: 'SUNNY', colors: { bg: '#cfe9f5', ink: '#12324a' }, fx: { glow: 0.6, stars: 0 } },
        { match: { group: ['clear'], isDay: false }, name: 'STARRY', colors: { bg: '#0a1226', ink: '#e8f0ff' }, fx: { stars: 1, glow: 0.8 } },
        { match: { group: ['rain', 'drizzle'] }, name: 'RAINY', colors: { bg: '#26323e', ink: '#e8f1f7' }, fx: { rain: 1, blur: 0.12 } },
        { name: 'NEUTRAL' },
      ],
    },
  },
};

test('style.weather：渲染天气条 + 雨/星空图层 + 运行时取数 JS', () => {
  const html = render(base);
  assert.match(html, /id="weatherStrip"/);
  assert.match(html, /id="wCity"/);
  assert.match(html, /id="wTemp"/);
  assert.match(html, /id="wCond"/);
  assert.match(html, /id="wGreeting"/);
  assert.match(html, /class="layer stars"/);
  assert.match(html, /class="layer rain"/);
  assert.match(html, /api\.open-meteo\.com/);
  assert.match(html, /function wLoad/);
  assert.match(html, /function wMatch/);
  assert.match(html, /ipwho\.is/);
  // 相位规则带天气 fx 开关
  assert.match(html, /--fx-stars: 1/);
  assert.match(html, /--fx-rain: 1/);
  assert.match(html, /--fx-stars: 0/);
  assert.match(html, /--fx-rain-density:/);
  assert.match(html, /--fx-fog:/);
  assert.match(html, /class="layer fog"/);
  assert.match(html, /rainCanvas.__rain/); // 涟漪/溅射调试接口
  // WMO 码表内嵌
  assert.match(html, /weather_code/);
  assert.match(html, /"RAIN"/); // WMO 码表内嵌
});

test('无 weather / timePhases：不渲染天气条与相位图层', () => {
  const spec = JSON.parse(JSON.stringify(base));
  delete spec.style.weather;
  const html = render(spec);
  assert.ok(!html.includes('id="weatherStrip"'));
  assert.ok(!html.includes('class="layer stars"'));
  assert.ok(!html.includes('class="layer rain"'));
});

test('weather-codes：WMO 码 → 分组/文案 + matchPhase', () => {
  assert.equal(groupForCode(0), 'clear');
  assert.equal(groupForCode(63), 'rain');
  assert.equal(groupForCode(95), 'storm');
  assert.equal(labelForCode(63), 'RAIN');
  const phases = base.style.weather.phases;
  assert.equal(matchPhase(phases, 'clear', true), 0);
  assert.equal(matchPhase(phases, 'clear', false), 1);
  assert.equal(matchPhase(phases, 'rain', true), 2);
  assert.equal(matchPhase(phases, 'snow', true), 3); // 无匹配 → fallback
});
