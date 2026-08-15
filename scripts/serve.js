/**
 * serve — 本地预览服务器
 * 用法：node scripts/serve.js [dir] [port]
 *
 * 特性：
 * - 不依赖当前工作目录：相对路径/默认目录都相对 poster-engine 根解析
 * - 目录无 index.html 时自动生成可点击的目录列表
 * - 端口被占用时自动尝试下一个端口
 * - 输出绝对路径与真实端口
 */
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function pickRoot(rootArg) {
  const candidates = [];
  if (rootArg) {
    candidates.push(resolve(rootArg));               // 相对当前 cwd
    candidates.push(resolve(ENGINE_ROOT, rootArg));  // 相对 engine 根
  } else {
    candidates.push(resolve(ENGINE_ROOT, 'out'));
    candidates.push(resolve(ENGINE_ROOT, 'examples/event-poster'));
  }
  for (const c of candidates) {
    try { if ((await stat(c)).isDirectory()) return c; } catch { /* 继续 */ }
  }
  return candidates[0];
}

async function directoryListing(dir, rel) {
  const entries = await readdir(dir, { withFileTypes: true });
  const base = rel === '/' ? '/' : rel + '/';
  const items = entries
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))
    .map((e) => {
      const href = base + encodeURIComponent(e.name) + (e.isDirectory() ? '/' : '');
      const label = e.name + (e.isDirectory() ? '/' : '');
      return `<li><a href="${href}">${escapeHtml(label)}</a></li>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>poster-engine 输出目录</title>
<style>body{font-family:system-ui,sans-serif;background:#0d0d16;color:#e8e6ff;padding:40px}a{color:#00e5ff;text-decoration:none}a:hover{text-decoration:underline}ul{list-style:none;padding:0}li{padding:6px 0;border-bottom:1px solid #26263a}h1{font-size:18px;letter-spacing:.05em}</style>
</head>
<body><h1>poster-engine · 输出目录</h1><ul>${items || '<li><em>（空目录）</em></li>'}</ul></body></html>`;
}

async function handle(root, urlPath) {
  const target = join(root, urlPath);
  let st;
  try { st = await stat(target); } catch { return null; }

  if (st.isDirectory()) {
    const idx = join(target, 'index.html');
    try {
      const data = await readFile(idx);
      return { data, mime: MIME['.html'] };
    } catch {
      return { data: Buffer.from(await directoryListing(target, urlPath)), mime: MIME['.html'] };
    }
  }
  if (st.isFile()) {
    return { data: await readFile(target), mime: MIME[extname(target)] ?? 'application/octet-stream' };
  }
  return null;
}

const rootArg = process.argv[2];
const root = await pickRoot(rootArg);
let port = Number(process.argv[3] || 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) port = 8080;

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const urlPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '') || '/';
    // 海报里的相对资源（../../assets/...）经 HTTP 解析为 /assets/...，统一指向引擎 assets
    const serveRoot = (urlPath === '/assets' || urlPath.startsWith('/assets/')) ? ENGINE_ROOT : root;
    // 路径穿越防护
    const resolvedTarget = resolve(serveRoot, '.' + urlPath);
    if (resolvedTarget !== resolve(serveRoot) && !resolvedTarget.startsWith(resolve(serveRoot) + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }
    const result = await handle(serveRoot, urlPath);
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<meta charset="utf-8"><h2>404 找不到 ${escapeHtml(rawPath)}</h2><p>提示：先渲染再预览，例如</p><pre>node scripts/render.js examples/event-poster/spec.json --out out/event-poster</pre><p>或访问 <a href="/event-poster/">/event-poster/</a></p>`);
      return;
    }
    res.writeHead(200, { 'Content-Type': result.mime });
    res.end(result.data);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 ' + e.message);
  }
});

let attempts = 0;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && attempts < 10) {
    attempts += 1;
    console.log('端口 ' + port + ' 被占用，尝试 ' + (port + 1) + ' …');
    port += 1;
    server.listen(port);
  } else {
    console.error('服务器启动失败:', err.message);
    process.exit(1);
  }
});
server.listen(port, () => {
  console.log('poster-engine 预览: http://localhost:' + port);
  console.log('根目录: ' + root);
});