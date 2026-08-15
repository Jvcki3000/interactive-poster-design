/**
 * group — 多人圈选引导：合影 → 分割候选 → 圈选命名页 → labels.json
 * 用法:
 *   node scripts/group.js <照片> [--out out/group] [--engine mediapipe|rembg|auto]
 *
 * 流程: 分割(protagonist.py --multi) → 生成 label.html（点人物命名/拖拽手动圈选）
 *       → 下载 labels.json → 再跑: poster.js protagonist <照片> --labels labels.json
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, basename, extname, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function findPython() {
  const candidates = [
    process.env.POSTER_ENGINE_PYTHON,
    'C:/Users/foshanwuyanzu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
    'python', 'py',
  ].filter(Boolean);
  for (const c of candidates) {
    const t = spawnSync(c, ['-c', 'import mediapipe'], { encoding: 'utf-8' });
    if (t.status === 0) return c;
  }
  return candidates[0];
}
const PYTHON = findPython();

const args = process.argv.slice(2);
const photo = args.find((a) => a && !a.startsWith('--'));
const flagVal = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const outDir = resolve(flagVal('out') ?? 'out/group');
const engine = flagVal('engine') || 'mediapipe';
if (!photo) {
  console.error('用法: node scripts/group.js <照片> [--out out/group] [--engine mediapipe|rembg|auto]');
  process.exit(1);
}

const name = basename(outDir).replace(/[^a-zA-Z0-9_-]/g, '') || 'group';
const outRef = resolve(ENGINE_ROOT, 'assets', 'reference');
const py = resolve(ENGINE_ROOT, 'scripts', 'protagonist.py');
console.log('① 分割人物候选（engine=' + engine + '）…');
const res = spawnSync(PYTHON, [py, '--photo', photo, '--out-dir', outRef, '--name', name, '--engine', engine, '--multi', '--count', '12'], { encoding: 'utf-8' });
if (res.status !== 0) { console.error(res.stderr || '分割失败'); process.exit(res.status ?? 1); }
const geo = JSON.parse(res.stdout);

const photoExt = extname(geo.photo).toLowerCase() || '.png';
const photoCopy = resolve(outRef, name + '-photo' + photoExt);
try { copyFileSync(geo.photo, photoCopy); } catch (e) {}

const rel = (abs) => relative(outDir, abs).split(sep).join('/');
const people = (geo.multi || []).map((m) => ({
  name: m.name || '',
  box: { x: m.bbox.x, y: m.bbox.y, rx: m.bbox.rx, ry: m.bbox.ry },
  mask: m.mask, // absolute
}));
const labels = { size: geo.size, unionCutout: geo.cutout, people: people };

// ---- label page ----
function labelHtml(photoSrc, boxes) {
  const data = JSON.stringify({ photo: photoSrc, boxes: boxes.map((b) => ({ name: b.name, box: b.box })), masks: boxes.map((b) => b.mask) });
  return `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><title>多人圈选命名</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d0d16;color:#e8e6ff;margin:0;padding:24px}
  h2{margin:0 0 6px}.sub{color:#9aa;font-size:13px;margin-bottom:16px}
  .layout{display:flex;gap:20px;flex-wrap:wrap}
  .photo-wrap{position:relative;max-width:min(52vw,640px);cursor:crosshair;border:1px solid #333;border-radius:8px;overflow:hidden;user-select:none}
  .photo-wrap img{display:block;width:100%}
  .box{position:absolute;border:2px solid #ff2bd6;border-radius:6px;box-sizing:border-box;cursor:move;background:rgba(255,43,214,.08)}
  .box .tag{position:absolute;left:0;top:-22px;background:#ff2bd6;color:#fff;font-size:11px;padding:1px 6px;border-radius:4px;white-space:nowrap}
  .box.selected{border-color:#00e5ff;background:rgba(0,229,255,.10)}
  .box.selected .tag{background:#00e5ff;color:#000}
  .box .del{position:absolute;right:-8px;top:-8px;width:16px;height:16px;background:#ff4d4d;color:#fff;border:none;border-radius:50%;font-size:10px;line-height:16px;text-align:center;cursor:pointer}
  .panel{min-width:260px;background:#16161f;border:1px solid #26263a;border-radius:8px;padding:14px;height:fit-content}
  .panel label{display:block;font-size:12px;color:#9aa;margin:10px 0 4px}
  .panel input{width:100%;box-sizing:border-box;background:#0d0d16;border:1px solid #333;color:#eee;padding:8px;border-radius:6px;font-size:14px}
  .btn{width:100%;margin-top:10px;background:#ff2bd6;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600}
  .btn:hover{filter:brightness(1.1)}
  .btn.ghost{background:transparent;border:1px solid #444}
  .hint{font-size:12px;color:#88a;line-height:1.6;margin-top:12px}
  #saveMsg{font-size:12px;margin-top:8px;color:#7f7}
</style></head><body>
<h2>多人圈选命名</h2>
<div class="sub">点击检测到的人物框 → 输入名字（回车确认）；在空白处<b>拖拽</b>可手动圈选；右下角 ✕ 删除框。命名完成后下载 labels.json。</div>
<div class="layout">
  <div class="photo-wrap" id="wrap"><img id="photo" src="${photoSrc}" alt="photo"><div id="preview" style="position:absolute;border:2px dashed #fff;display:none;pointer-events:none"></div></div>
  <div class="panel">
    <label>当前选中人物名字</label>
    <input id="nameInput" placeholder="输入名字，回车确认" />
    <button class="btn ghost" id="delBtn">删除选中框</button>
    <button class="btn" id="downloadBtn">⬇ 下载 labels.json</button>
    <div id="saveMsg"></div>
    <div class="hint">已检测到 ${boxes.length} 个人物候选。<br>每个有名字的框会生成一张独立档案卡；没名字的框不会导出。<br>手动圈出的框没有抠图掩膜，用椭圆热点。</div>
  </div>
</div>
<script>
var G = ${data};
var wrap = document.getElementById('wrap');
var img = document.getElementById('photo');
var preview = document.getElementById('preview');
var nameInput = document.getElementById('nameInput');
var boxes = [];
var selected = -1;
var W = 0, H = 0;

img.onload = function () { W = img.naturalWidth; H = img.naturalHeight; };
function pct(n) { return n + '%'; }
function render() {
  var old = wrap.querySelectorAll('.box');
  for (var i = 0; i < old.length; i++) old[i].remove();
  var i;
  for (i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    var el = document.createElement('div');
    el.className = 'box' + (i === selected ? ' selected' : '');
    el.style.left = pct(b.box.x - b.box.rx);
    el.style.top = pct(b.box.y - b.box.ry);
    el.style.width = pct(b.box.rx * 2);
    el.style.height = pct(b.box.ry * 2);
    el.innerHTML = '<span class="tag">' + (b.name || '人物 ' + (i + 1)) + '</span>' + (b.drawn ? '<button class="del" data-i="' + i + '">x</button>' : '');
    el.addEventListener('mousedown', function (ev) { ev.stopPropagation(); select(parseInt(this.dataset.i, 10)); });
    el.dataset.i = i;
    wrap.appendChild(el);
  }
}
function select(i) {
  selected = i;
  nameInput.value = boxes[i] ? boxes[i].name : '';
  render();
  if (i >= 0) nameInput.focus();
}
nameInput.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter' && selected >= 0) { boxes[selected].name = nameInput.value.trim(); render(); }
});
document.getElementById('delBtn').addEventListener('click', function () {
  if (selected >= 0) { boxes.splice(selected, 1); selected = -1; render(); }
});
// drag to draw a new box
var dragging = null;
wrap.addEventListener('mousedown', function (ev) {
  if (ev.target !== img && ev.target !== wrap && ev.target !== preview) return;
  var r = wrap.getBoundingClientRect();
  dragging = { x0: ev.clientX - r.left, y0: ev.clientY - r.top };
  preview.style.display = 'block';
});
window.addEventListener('mousemove', function (ev) {
  if (!dragging) return;
  var r = wrap.getBoundingClientRect();
  var x = ev.clientX - r.left, y = ev.clientY - r.top;
  preview.style.left = Math.min(x, dragging.x0) + 'px';
  preview.style.top = Math.min(y, dragging.y0) + 'px';
  preview.style.width = Math.abs(x - dragging.x0) + 'px';
  preview.style.height = Math.abs(y - dragging.y0) + 'px';
});
window.addEventListener('mouseup', function () {
  if (!dragging) return;
  var r = wrap.getBoundingClientRect();
  var pr = preview.getBoundingClientRect();
  preview.style.display = 'none';
  var x = (pr.left - r.left) / r.width * 100, y = (pr.top - r.top) / r.height * 100;
  var w = pr.width / r.width * 100, h = pr.height / r.height * 100;
  dragging = null;
  if (w < 2 || h < 2) return;
  boxes.push({ name: '', drawn: true, box: { x: x + w / 2, y: y + h / 2, rx: w / 2, ry: h / 2 }, mask: null });
  select(boxes.length - 1);
});
document.getElementById('downloadBtn').addEventListener('click', function () {
  var named = [];
  for (var i = 0; i < boxes.length; i++) {
    if (boxes[i].name) named.push({ name: boxes[i].name, box: boxes[i].box, mask: boxes[i].mask });
  }
  if (!named.length) { document.getElementById('saveMsg').textContent = '至少命名一个人再下载'; return; }
  var out = JSON.stringify({ size: { w: W, h: H }, unionCutout: '${geo.cutout}', people: named }, null, 2);
  var blob = new Blob([out], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'labels.json';
  a.click();
  document.getElementById('saveMsg').textContent = '已下载 labels.json · 下一步运行 poster.js protagonist <照片> --labels labels.json';
});
// init from detected
for (var k = 0; k < G.boxes.length; k++) {
  boxes.push({ name: G.boxes[k].name, drawn: false, box: G.boxes[k].box, mask: G.masks[k] });
}
render();
</script></body></html>`;
}

mkdirSync(outDir, { recursive: true });
const labelFile = resolve(outDir, 'label.html');
writeFileSync(labelFile, labelHtml(rel(photoCopy), people), 'utf8');
// labels.json with ABSOLUTE mask/union paths (so any outDir can consume)
writeFileSync(resolve(outDir, 'labels.json'), JSON.stringify(labels, null, 2), 'utf8');
console.log('✔ 圈选页: ' + labelFile);
console.log('✔ 初始 labels: ' + resolve(outDir, 'labels.json'));
console.log('');
console.log('下一步：');
console.log('  1) 打开 ' + labelFile + '（http://localhost:8080/' + basename(outDir) + '/label.html）');
console.log('  2) 点击每个人物输入名字（或拖拽手动圈选）→ 下载 labels.json');
console.log('  3) 生成海报: poster.js protagonist <照片> --labels <labels.json> --title 片名 --out out/x');
