/**
 * brief — 需求引导：打印问题清单，或把用户答案生成 Design Spec 骨架
 *
 * 用法：
 *   node scripts/brief.js                                             # 打印 4+2 问题清单
 *   node scripts/brief.js --style swiss|editorial|minimal|experimental|cyberpunk \
 *     --color <12 策略之一> --interaction buttons|hotspots|showcase|calm \
 *     --title 标题 [--subtitle 副标题] [--date 日期] [--location 地点] [--price 价格] [--cta 按钮文案] \
 *     [--image 图片路径] [--hotspots "标签|详情|x|y|r" (可多次)] \
     [--time] [--weather 城市 (可配 --lat --lon)] \
 *     [--size 1200x1600] [--out out/brief] [--render]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyPreset, presets } from '../engine/presets/index.js';
import { generatePalette, listStrategies } from '../engine/color/strategy.js';
import { render } from '../renderer/html/index.js';
import { resolveSize, DEFAULT_WEATHER_PHASES, DEFAULT_TIME_PHASES } from '../engine/design-dna/vocab.js';

const args = process.argv.slice(2);
const flagVal = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const flags = args.filter((a) => a.startsWith('--'));

if (flags.length === 0) {
  console.log('— poster-design 需求引导 Briefing —');
  console.log('1) 风格 Style   : ' + Object.keys(presets).join(' | ') + ' | 自由描述');
  console.log('2) 内容 Content : 标题/副标题/日期/地点/价格/CTA');
  console.log('3) 交互 Interaction: buttons(按钮) | hotspots(图片+热点零按钮) | showcase(炫技) | calm(克制) | live(实时数据)');
  console.log('4) 配色 Color   : ' + listStrategies().map((s) => s.key).join(' | ') + ' | 参考图 | 品牌色');
  console.log('可选: 尺寸(默认1200x1600) / 参考图 / Logo / --time 时间相位 / --weather 城市 实时天气');
  console.log('\n带参数直接生成 spec 骨架，例如:');
  console.log('  node scripts/brief.js --style cyberpunk --color high-contrast --interaction showcase --title "NEON RUSH" --date "09.12" --out out/brief --render');
  process.exit(0);
}

const size = resolveSize(flagVal('size') || '1200x1600') ?? { width: 1200, height: 1600 };
const w = size.width;
const h = size.height;
const interaction = flagVal('interaction') || 'buttons';

// 收集热点（"标签|详情|x|y|r" 可重复）
const hotspots = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--hotspots' && args[i + 1]) {
    const [label, detail, x, y, r] = args[i + 1].split('|');
    hotspots.push({ label, detail, x: Number(x) || 50, y: Number(y) || 50, r: Number(r) || 8 });
  }
}

const spec = {
  canvas: { width: w || 1200, height: h || 1600, unit: 'px', responsive: true },
  content: {
    title: flagVal('title') || 'POSTER',
    subtitle: flagVal('subtitle') || '',
    date: flagVal('date') || '',
    location: flagVal('location') || '',
    price: flagVal('price') || '',
    cta: interaction === 'hotspots' ? '' : flagVal('cta') || '',
    metadata: {
      brand: flagVal('brand') || 'POSTER',
      tag: flagVal('tag') || 'INTERACTIVE',
      note: flagVal('note') || '',
    },
    hotspots: interaction === 'hotspots'
      ? (hotspots.length ? hotspots : [
          { x: 30, y: 40, r: 9, label: flagVal('title') || 'SUBJECT', detail: '第一个热点：点击查看详情。' },
          { x: 65, y: 58, r: 8, label: 'SECOND', detail: '第二个热点：人物/宠物/物体。' },
        ])
      : hotspots,
  },
  style: {},
  animation: {},
  interactions: {},
};

// 风格预设
const style = flagVal('style');
if (style) {
  if (!presets[style]) {
    console.error('未知风格 "' + style + '"，可选: ' + Object.keys(presets).join(', ') + '（自由描述请直接写进 spec）');
    process.exit(1);
  }
  Object.assign(spec, applyPreset(spec, style));
}

// 配色策略（用户明确选择 → 覆盖预设色）
const color = flagVal('color');
if (color) {
  try {
    spec.style.colors = generatePalette(color, 2026).colors;
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

// 图片层
const image = flagVal('image');
if (image) {
  spec.style.imagery = spec.style.imagery ?? {};
  spec.style.imagery.image = { src: image, fit: 'cover', duotone: true, scrim: true, zoom: true };
}

// 交互 profile
if (interaction === 'showcase') {
  spec.interactions = {
    title: { type: 'hover', effect: 'glitch', click: 'explode' },
    cursor: { type: 'ring' },
    ball: { repel: 0.4 },
    poster: { type: 'tilt3d', max: 7 },
  };
  spec.style.imagery = spec.style.imagery ?? {};
  spec.style.imagery.ball = spec.style.imagery.ball ?? { depth: 0.4 };
  spec.animation.particles = { count: 26 };
} else if (interaction === 'calm' || interaction === 'live') {
  spec.interactions = { title: { type: 'hover', effect: 'distort' }, background: { type: 'parallax', depth: 0.1 }, glow: { type: 'cursorLight', blend: 'screen' } };
  spec.animation.scroll = { reveal: true };
} else if (interaction === 'hotspots') {
  spec.interactions = { title: { type: 'hover', effect: 'distort' } };
  spec.animation.scroll = { reveal: true };
} else {
  spec.interactions = {
    title: { type: 'hover', effect: 'distort' },
    date: { type: 'click', action: 'expand' },
    cta: { type: 'hover', effect: 'magnetic' },
    poster: { type: 'tilt3d', max: 4 },
  };
}

// 动态数据：实时天气 / 时间生命周期
const weatherCity = flagVal('weather');
if (weatherCity) {
  spec.style.weather = {
    defaultCity: weatherCity,
    lat: Number(flagVal('lat')) || 1.3521,
    lon: Number(flagVal('lon')) || 103.8198,
    phases: DEFAULT_WEATHER_PHASES,
  };
  spec.style.layout = spec.style.layout ?? {};
  spec.style.layout.mode = spec.style.layout.mode ?? 'classic';
  spec.metadata = spec.metadata ?? {};
}
if (args.includes('--time')) {
  spec.style.timePhases = DEFAULT_TIME_PHASES;
  spec.style.layout = spec.style.layout ?? {};
  spec.style.layout.mode = spec.style.layout.mode ?? 'classic';
}

const outDir = resolve(flagVal('out') ?? 'out/brief');
mkdirSync(outDir, { recursive: true });
const specFile = resolve(outDir, 'spec.json');
writeFileSync(specFile, JSON.stringify(spec, null, 2), 'utf8');
console.log('✔ 已生成 spec: ' + specFile);

if (args.includes('--render')) {
  const html = render(spec);
  writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
  console.log('✔ 已渲染: ' + resolve(outDir, 'index.html'));
}