// screenshot — 截图渲染（P16 配套）：无头 Chrome CDP 捕获 #poster → PNG
// 供 scripts/export.js（CLI）与 scripts/iterate.js（截图 QA）复用；零依赖。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

export function findChrome() {
  const candidates = (process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []).concat([
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]);
  return candidates.find((c) => c && existsSync(c)) || null;
}

function cdp(wsUrl) {
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { resolve: r, reject: j } = pending.get(m.id); pending.delete(m.id); m.error ? j(new Error(m.error.message)) : r(m.result); }
  };
  return {
    ready,
    send(method, params = {}) { return ready.then(() => new Promise((res, rej) => { const i = ++id; pending.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params })); })); },
    close() { try { ws.close(); } catch (e) { /* noop */ } },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 截图 HTML 文件中的 #poster，输出到 outPath（PNG），返回 {width,height,bytes} */
export async function capturePoster(htmlPath, outPath, { width = 1200, ratio } = {}) {
  const chrome = findChrome();
  if (!chrome) throw new Error('未找到 Chrome/Edge，请安装或设置 CHROME_PATH');
  const targetW = Math.max(320, Math.min(3840, Number(width) || 1200));
  const r = Number(ratio) > 0 ? Number(ratio) : 4 / 3;
  const winW = Math.round(targetW / 0.92);
  const winH = Math.round(winW * r + 48);
  const workDir = join(tmpdir(), 'poster-shot-' + process.pid + '-' + Date.now());
  mkdirSync(workDir, { recursive: true });
  const profile = join(workDir, 'profile');
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--window-size=' + winW + ',' + winH, '--force-color-profile=srgb', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let port = null;
    for (let i = 0; i < 50; i++) {
      const f = join(profile, 'DevToolsActivePort');
      if (existsSync(f)) { const [p] = readFileSync(f, 'utf8').split(/\r?\n/); port = p; break; }
      await sleep(100);
    }
    if (!port) throw new Error('Chrome DevTools 端口未就绪');
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('未找到页面 target');
    const c = cdp(page.webSocketDebuggerUrl);
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Page.navigate', { url: pathToFileURL(htmlPath).href });
    await sleep(2200);
    const rectRes = await c.send('Runtime.evaluate', {
      expression: `(() => { const p = document.getElementById('poster'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; })()`,
      returnByValue: true,
    });
    const rect = rectRes.result.value;
    const shot = rect && rect.width > 0
      ? await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 } })
      : await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const img = Buffer.from(shot.data, 'base64');
    writeFileSync(outPath, img);
    c.close();
    return { width: rect ? rect.width : 0, height: rect ? rect.height : 0, bytes: img.length };
  } finally {
    proc.kill();
  }
}

/** TASK-017：截图 QA 变体 — poster.png / poster-desktop.png / poster-mobile.png */
export async function captureVariants(htmlPath, outDir, { ratio } = {}) {
  const paths = {};
  const jobs = [
    ['poster.png', 1200],
    ['poster-desktop.png', 1280],
    ['poster-mobile.png', 600],
  ];
  for (const [name, w] of jobs) {
    const p = join(outDir, name);
    await capturePoster(htmlPath, p, { width: w, ratio });
    paths[name] = p;
  }
  return paths;
}

export default { capturePoster, findChrome };
