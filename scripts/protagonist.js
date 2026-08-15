/**
 * protagonist — 一键"上传照片 → 主角电影海报"
 * 用法:
 *   node scripts/protagonist.js <照片> [--title 片名] [--subtitle 副标题] [--out out/<name>] [--critic]
 *
 * 流程: 分割抠图(mediapipe) → 复制素材 → cover 换算热点几何 →
 *       生成电影海报 spec(silhouette 剪影高亮 + hover 档案卡) → render → critic
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, extname, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../renderer/html/index.js';
import { evaluate } from '../engine/critic/index.js';

const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 探测装有 mediapipe 的 Python（protagonist 需要分割模型） */
function findPython() {
  const candidates = [
    process.env.POSTER_ENGINE_PYTHON,
    'C:/Users/foshanwuyanzu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
    'python',
    'py',
  ].filter(Boolean);
  for (const c of candidates) {
    const t = spawnSync(c, ['-c', 'import mediapipe'], { encoding: 'utf-8' });
    if (t.status === 0) return c;
  }
  return candidates[0];
}
const PYTHON = findPython();

const args = process.argv.slice(2);
let photo = args.includes('--generate') ? null : (args.find((a) => a && !a.startsWith('--')) || null);
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const title = flagVal('title') || 'UNTITLED';
const subtitle = flagVal('subtitle') || 'A FILM BY YOU';
const outDir = resolve(flagVal('out') ?? 'out/protagonist');
const wantCritic = args.includes('--critic');
const engine = flagVal('engine') || 'mediapipe';
const generatePrompt = flagVal('generate');
const multi = args.includes('--multi');
const names = flagVal('names') || '';
const labelsPath = flagVal('labels');
if (!photo && !generatePrompt) {
  console.error('用法: node scripts/protagonist.js <照片> [--title 片名] [--subtitle 副标题] [--out out/<name>] [--engine mediapipe|rembg|auto] [--critic]');
  process.exit(1);
}

// 1) 分割抠图
const name = basename(outDir).replace(/[^a-zA-Z0-9_-]/g, '') || 'protagonist';
const outRef = resolve(ENGINE_ROOT, 'assets', 'reference');
const py = resolve(ENGINE_ROOT, 'scripts', 'protagonist.py');

// 0) 无照片但有 --generate：用 imagegen 生成主角图（需 image_gen 工具或 OPENAI_API_KEY）
if (!photo && generatePrompt) {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const imgDir = [process.env.IMAGE_GEN_DIR, home + '/.codex/skills/.system/imagegen', 'C:/Users/foshanwuyanzu/.codex/skills/.system/imagegen']
    .filter(Boolean).find((d) => existsSync(d + '/scripts/image_gen.py'));
  if (!hasKey || !imgDir) {
    console.log('');
    console.log('⚠️  当前环境无法用 imagegen 生成主角图（未暴露内置工具 / 未设 OPENAI_API_KEY）。');
    console.log('可用方案：');
    console.log('  ① 设置 OPENAI_API_KEY 后重试：poster.js protagonist --generate "<描述>"');
    console.log('  ② 上传一张主角照片：poster.js protagonist <照片>');
    console.log('  ③ AI 合成替代：代码合成(HTML/SVG/Canvas) / 分割抠图(上传照片) / 联网找 CC 素材');
    process.exit(0);
  }
  console.log('② 用 imagegen 生成主角图…');
  const genOut = resolve(outRef, name + '-generated.png');
  const genRes = spawnSync(PYTHON, [join(imgDir, 'scripts', 'image_gen.py'), 'generate', '--prompt', generatePrompt, '--size', '1024x1536', '--quality', 'high', '--out', genOut], { stdio: 'inherit' });
  if (genRes.status !== 0) process.exit(genRes.status ?? 1);
  photo = genOut;
  console.log('✔ 主角图已生成: ' + genOut);
}
let geo = null;
if (labelsPath) {
  const labels = JSON.parse(readFileSync(labelsPath, 'utf8'));
  geo = {
    photo: resolve(photo),
    size: labels.size || { w: 800, h: 1000 },
    cutout: labels.unionCutout || null,
    multi: (labels.people || []).map((pp) => ({ bbox: pp.box, mask: pp.mask, name: pp.name })),
  };
  console.log('② 使用 labels.json（' + geo.multi.length + ' 人）…');
} else {
  console.log('① 分割人物（engine=' + engine + '）…');
  const pyArgs = [py, '--photo', photo, '--out-dir', outRef, '--name', name, '--engine', engine];
  if (multi) { pyArgs.push('--multi', '--count', '4', '--names', names || ''); }
  const res = spawnSync(PYTHON, pyArgs, { encoding: 'utf-8' });
  if (res.status !== 0) {
    console.error(res.stderr || '分割失败');
    process.exit(res.status ?? 1);
  }
  geo = JSON.parse(res.stdout);
}

// 2) 复制照片到引擎 assets（保证 http/file 都能访问）
const photoExt = extname(geo.photo).toLowerCase() || '.png';
const photoCopy = resolve(outRef, name + '-photo' + photoExt);
try { copyFileSync(geo.photo, photoCopy); } catch (e) { photoCopy = geo.photo; }

// 3) cover 换算：照片坐标 → 海报坐标（热点/剪影对齐）
// 3) cover 换算：照片坐标 → 海报坐标（热点/剪影对齐）
const W = 1080, H = 1620;
const scale = Math.max(W / geo.size.w, H / geo.size.h);
const offX = (W - geo.size.w * scale) / 2;
const offY = (H - geo.size.h * scale) / 2;
const mapBB = (bb) => ({
  x: Math.round(((bb.x / 100 * geo.size.w) * scale + offX) / W * 100),
  y: Math.round(((bb.y / 100 * geo.size.h) * scale + offY) / H * 100),
  rx: Math.min(Math.max((bb.rx / 100 * geo.size.w * scale) / W * 100, 14), 45),
  ry: Math.min(Math.max((bb.ry / 100 * geo.size.h * scale) / H * 100, 20), 60),
});

const rel = (abs) => relative(outDir, abs).split(sep).join('/');

// 4) 电影海报 spec（多人 = 每个元素一个独立掩膜热点）
const isMulti = Array.isArray(geo.multi) && geo.multi.length > 0;
const hotspots = isMulti
  ? geo.multi.map((it, idx) => {
      const b = mapBB(it.bbox);
      const nm = it.name || 'ELEMENT ' + (idx + 1);
      return {
        x: b.x, y: b.y, rx: b.rx, ry: b.ry, mode: 'hover', mask: it.mask ? rel(it.mask) : undefined,
        label: String(nm).toUpperCase(), meta: 'CHARACTER PROFILE',
        detail: nm + ' 的角色档案——每个人都是自己故事的主角。',
        sections: [
          { heading: 'Name', text: nm },
          { heading: 'Role', text: '本片角色 · 悬停查看' },
          { heading: 'Quote', text: '"无论你在哪里，我一定会去见你。"' },
        ],
      };
    })
  : [(() => { const b = mapBB(geo.bbox); return {
      x: b.x, y: b.y, rx: b.rx, ry: b.ry, mode: 'hover',
      label: 'THE PROTAGONIST', meta: 'CHARACTER PROFILE',
      detail: '海报的主角——每个打开这张海报的人，都能在这里遇见自己。',
      sections: [
        { heading: 'Name', text: '你 · 照片里的主角（可改）' },
        { heading: 'Role', text: '主角 · 本片唯一的主人公' },
        { heading: 'Quote', text: '"无论你在哪里，我一定会去见你。"' },
      ],
    }; })()];
const spec = {
  "$comment": "protagonist: 一键主角电影海报。照片=" + rel(photoCopy) + "；silhouette 剪影高亮 + hover 档案卡。内容占位可改。",
  canvas: { width: W, height: H, unit: 'px', responsive: true },
  content: {
    title: title,
    subtitle: subtitle,
    date: '2026.12.18',
    location: 'IN THEATERS',
    metadata: { brand: 'PRESENTS', tag: isMulti ? 'AN ENSEMBLE FILM' : 'A PROTAGONIST FILM', note: 'HOVER THE CHARACTERS TO EXPLORE' },
    hotspots: hotspots,
  },
  style: {
    colors: { bg: '#241610', surface: '#4a2f1d', ink: '#f4ece0', accent: '#c9a86a', accent2: '#8a6a4a', muted: '#b7a68f' },
    typography: { fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif", bodyFont: "'Helvetica Neue', Arial, sans-serif", scaleRatio: 1.3, titleScale: 2.6, type: 'serif' },
    layout: { gridColumns: 12, gutter: 24, margin: 56, mode: 'minimal' },
    imagery: { image: { src: rel(photoCopy), silhouette: geo.cutout ? rel(geo.cutout) : undefined, fit: 'cover', scrim: true, zoom: true } },
  },
  animation: { title: { reveal: 'chars', stagger: 0.06 }, scroll: { reveal: true } },
  interactions: {
    background: { type: 'parallax', depth: 0.1 },
    glow: { type: 'cursorLight', blend: 'screen' },
    title: { type: 'hover', effect: 'color-shift' },
  },
  assets: [],
};

// 5) 写出 + 渲染 + 评分
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf8');
const html = render(spec);
writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
console.log('✔ 主角海报已生成: ' + resolve(outDir, 'index.html'));
console.log('  热点（hover）: ' + hotspots.map(h => h.x + '%/' + h.y + '%').join(' | '));
console.log('  提示：片名/档案内容为占位，编辑 spec.json 或重新传 --title 可改。');

if (wantCritic) {
  const rep = evaluate(spec, html);
  console.log('\n— Design Critic —');
  for (const [k, v] of Object.entries(rep.scores)) console.log('  ' + k.padEnd(18) + String(v.score).padStart(3) + '/10');
  console.log('  总分: ' + rep.overall + '/10  ' + (rep.pass ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'));
  console.log('  AI-ness: ' + rep.aiNess.score + '/100  ' + (rep.aiNess.pass ? '✅' : '❌'));
  if (!rep.pass) process.exitCode = 1;
}
