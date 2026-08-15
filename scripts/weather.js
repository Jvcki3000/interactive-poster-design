/**
 * weather — 实时天气 CLI
 * 用法:
 *   node scripts/weather.js <city> [--spec <weather spec.json>]
 *   node scripts/weather.js --lat 1.35 --lon 103.8 [--spec <weather spec.json>]
 *
 * 打印：城市 / 温度 / 昼夜 / WMO 码 / 分组 / 文案，以及 spec 里匹配到的相位。
 */
import { readFileSync } from 'node:fs';
import { groupForCode, labelForCode, matchPhase } from '../engine/weather/weather-codes.js';

const args = process.argv.slice(2);
const flagVal = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const lat = Number(flagVal('lat'));
const lon = Number(flagVal('lon'));
const specPath = flagVal('spec');
const city = args.find((a) => a && !a.startsWith('--'));

async function jget(url) {
  const r = await fetch(url);
  return r.json();
}

async function resolveLocation() {
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { name: city || ('lat,' + lat + ',' + lon), lat, lon };
  if (!city) throw new Error('用法: node scripts/weather.js <city> 或 --lat --lon');
  const g = await jget('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=en&format=json');
  if (!g.results || !g.results.length) throw new Error('找不到城市: ' + city + '（中文名可能不识别，试试英文名如 Shanghai，或加 --lat/--lon）');
  return { name: g.results[0].name, lat: g.results[0].latitude, lon: g.results[0].longitude };
}

const loc = await resolveLocation();
const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon + '&current=temperature_2m,is_day,weather_code&timezone=auto';
const d = await jget(u);
const c = d.current;
const group = groupForCode(c.weather_code);
console.log('城市   :', loc.name);
console.log('温度   :', Math.round(c.temperature_2m) + '°C');
console.log('昼夜   :', c.is_day === 1 ? '白天' : '夜晚');
console.log('WMO 码 :', c.weather_code);
console.log('分组   :', group);
console.log('文案   :', labelForCode(c.weather_code));
if (specPath) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8').replace(/^\uFEFF/, ''));
  const phases = spec?.style?.weather?.phases;
  if (Array.isArray(phases) && phases.length) {
    const idx = matchPhase(phases, group, c.is_day === 1);
    const p = phases[idx];
    console.log('相位   :', '#' + idx, p?.name || '', '→ data-phase="' + idx + '"');
  } else {
    console.log('相位   : 未配置 style.weather.phases');
  }
}
