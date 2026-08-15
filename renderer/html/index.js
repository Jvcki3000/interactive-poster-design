/**
 * renderer — 渲染核心
 *
 * 职责：把 Design Spec 渲染成可交互的 HTML/SVG/CSS 输出（自包含 index.html）。
 *
 * V0.1：Text Reveal / Mouse Parallax / Cursor Light / Hover Distortion /
 *       Click Expand / Magnetic CTA / Responsive / prefers-reduced-motion。
 * V0.2：Particles（粒子背景）/ 3D Tilt（海报随鼠标倾斜）/ Scroll Reveal（滚动显现）。
 */
import { buildTypeScale, pxToCqw } from '../../engine/typography/index.js';
import { grid, stack } from '../../engine/layout/index.js';
import { LAYOUT_KEYS as LAYOUT_MODES } from '../../engine/design-dna/vocab.js';
import { WMO_CODES } from '../../engine/weather/weather-codes.js';
import { buildGraphicsSvg } from '../../engine/graphics/index.js';
import { MEDIUM_CLASS, materialityCss } from '../../engine/texture/index.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '255,255,255';
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

const DEFAULT_COLORS = {
  bg: '#0a0a12',
  surface: '#15152a',
  ink: '#f4f2ff',
  accent: '#00e5ff',
  accent2: '#ff2bd6',
  muted: '#8a87a8',
};

/**
 * @param {object} spec Design Spec（见 schema/design-spec.schema.json）
 * @returns {string} 完整 index.html
 */
export function render(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('spec 必须是对象');
  const { canvas, content, style = {}, animation = {}, interactions = {} } = spec;
  if (!canvas?.width || !canvas?.height) throw new Error('spec.canvas.width/height 必填');
  if (!content?.title) throw new Error('spec.content.title 必填');

  // ---- 计算层 ----
  const width = canvas.width;
  const ratioInv = (canvas.width / canvas.height).toFixed(4);
  const typeScale = buildTypeScale({
    ratio: style?.typography?.scaleRatio ?? 1.25,
    base: style?.typography?.baseSize ?? 16,
  });
  const g = grid({ width, ...(style?.layout ?? {}) });
  const layers = stack(style?.layout?.layers ?? ['background', 'glow', 'title', 'meta', 'cta']);

  const C = { ...DEFAULT_COLORS, ...(style?.colors ?? {}) };
  const rgb = {
    ink: hexToRgb(C.ink),
    accent: hexToRgb(C.accent),
    accent2: hexToRgb(C.accent2),
  };

  const fonts = {
    display: style?.typography?.fontFamily ?? "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
    body: style?.typography?.bodyFont ?? "'Helvetica Neue', Arial, sans-serif",
  };

  // ---- V0.3: Time-of-day lifecycle (time phases) ----
  const timePhases = Array.isArray(style?.timePhases) && style.timePhases.length >= 2
    ? style.timePhases.map((p) => ({
        hour: Number(p.hour) || 0,
        label: String(p.label ?? ''),
        name: String(p.name ?? ''),
        colors: p.colors ?? {},
        fx: p.fx ?? {},
      }))
    : null;

  // ---- V0.4: Weather-driven poster（实时天气 → 相位）----
  const weatherCfg = style?.weather && Array.isArray(style.weather.phases) && style.weather.phases.length >= 2
    ? {
        defaultCity: String(style.weather.defaultCity ?? 'YOUR CITY'),
        lat: Number(style.weather.lat) || 1.3521,
        lon: Number(style.weather.lon) || 103.8198,
        phases: style.weather.phases.map((p) => ({
          match: p.match ?? {},
          colors: p.colors ?? {},
          fx: p.fx ?? {},
          name: String(p.name ?? ''),
          label: String(p.label ?? ''),
        })),
      }
    : null;
  const switchCfg = Array.isArray(style?.switchPhases) && style.switchPhases.length >= 2
    ? style.switchPhases.map((p) => ({ name: String(p.name ?? ''), colors: p.colors ?? {}, fx: p.fx ?? {}, image: String(p.image ?? '') }))
    : null;
  const phaseSet = weatherCfg ? weatherCfg.phases : (timePhases ? timePhases : switchCfg);
  const hideStyleSwitch = !!style?.hideStyleSwitch;
  const middleAlign = style?.layout?.middleAlign || '';
  const titleBlend = style?.typography?.titleBlend || '';

  const titleFactor = Number(style?.typography?.titleScale ?? 2.2);
  const titleSize = pxToCqw(typeScale.display * titleFactor, width);
  // ---- P8: Typography-as-Image（旋转/纵向/裁切/重叠/超大）----
  const tF = style?.typography ?? {};
  const titleRotate = Number(tF.titleRotate) || 0;
  const titleVertical = !!tF.titleVertical;
  const titleOverlap = !!tF.titleOverlap;
  const titleCrop = Math.max(0, Math.min(1, Number(tF.titleCrop) || 0));
  const titleOversize = Number(tF.titleOversize) || 1;
  const titleFontSize = pxToCqw(typeScale.display * titleFactor * titleOversize, width);
  // ---- P11: Motion 独立动效风格 ----
  const motionStyle = String(animation?.motionStyle || 'none');
  const motionClass = motionStyle !== 'none' && motionStyle !== 'static' ? ' motion-' + motionStyle : '';
  const subtitleSize = pxToCqw(typeScale.md, width);
  const metaSize = pxToCqw(typeScale.sm, width);
  const xsSize = pxToCqw(typeScale.xs, width);

  // ---- 内容 ----
  const meta = content.metadata ?? {};
  const title = String(content.title);
  const subtitle = String(content.subtitle ?? '');
  const date = String(content.date ?? '');
  const location = String(content.location ?? '');
  const cta = content.cta ? String(content.cta) : '';
  const price = String(content.price ?? '');
  const brand = String(meta.brand ?? title.split(/\s+/)[0] + '//26');
  const tag = String(meta.tag ?? 'INTERACTIVE POSTER');
  const lineup = meta.lineup ? `<span class="d-lineup">${escapeHtml(meta.lineup)}</span>` : '';
  const time = meta.time ? `<span class="d-time">${escapeHtml(meta.time)}</span>` : '';
  const note = meta.note ? `<span class="d-note">${escapeHtml(meta.note)}</span>` : '';

  const bgDepth = Number(interactions?.background?.depth ?? 0.15);

  // ---- V0.2 特性开关 ----
  const particlesCfg = animation?.particles ?? null;

  const layoutMode = LAYOUT_MODES.includes(style?.layout?.mode) ? style.layout.mode : 'classic';
  // ---- P7: Grid Engine（4/6/8/12/baseline/modular/broken/custom + breakGrid）----
  const gridType = String(style?.layout?.gridType ?? '12_column');
  const gridVisible = Number(style?.layout?.gridVisible) || 0.5;
  const breakGrid = Number(style?.layout?.breakGrid) || 0;
  const gridCols = { '4_column': 4, '6_column': 6, '8_column': 8, '12_column': 12, modular: 6, baseline: 12, broken: 8, custom: Math.max(1, Number(style?.layout?.gridColumns) || 12), none: 0 }[gridType] || 12;
  const gridRows = { baseline: 1, modular: 6, broken: 8 }[gridType] || 8;
  const gridLine = (dir, n) => n > 0 ? `repeating-linear-gradient(to ${dir}, color-mix(in srgb, var(--ink) 7%, transparent) 0 1px, transparent 1px calc(100% / ${n}))` : 'none';
  const gridBgCols = gridType === 'baseline' ? 'none' : gridLine('right', gridCols);
  const gridBgRows = gridLine('bottom', gridRows);
  const gridLinesCss = `.grid-lines {
  z-index: 2; opacity: var(--grid-vis, .5);
  background-image: ${[gridBgCols, gridBgRows].filter((x) => x !== 'none').join(', ')};
}
${gridType === 'baseline' ? `.grid-lines::after { content:''; position:absolute; inset:0; background: repeating-linear-gradient(to bottom, transparent 0 calc(100% / ${gridRows} - 2px), color-mix(in srgb, var(--accent) 35%, transparent) calc(100% / ${gridRows} - 2px) calc(100% / ${gridRows})); opacity: .55; }` : ''}
${breakGrid > 0 ? `.grid-lines::before { content:''; position:absolute; inset:-8%; background: repeating-linear-gradient(13deg, color-mix(in srgb, var(--accent) 12%, transparent) 0 1px, transparent 1px ${Math.max(6, Math.round(40 / (0.2 + breakGrid)))}px); opacity: ${Math.min(0.5, 0.1 + breakGrid * 0.3)}; }` : ''}`;
  const tiltMax = interactions?.poster?.type === 'tilt3d' ? Number(interactions?.poster?.max ?? 0) : 0;
  const TITLE_EFFECTS = ['distort', 'glitch', 'color-shift', 'scale', 'expand', 'morph'];
  const titleEffect = TITLE_EFFECTS.includes(interactions?.title?.effect) ? interactions.title.effect : 'distort';
  const explodeEnabled = interactions?.title?.click === 'explode';
  const ballRepel = Number(interactions?.ball?.repel ?? 0);
  const cursorRingEnabled = interactions?.cursor?.type === 'ring';
  const spotlightEnabled = !!interactions?.spotlight;
  const spotlightHtml = spotlightEnabled ? '<div class="layer spotlight" id="spotlight"></div>' : '';
  const scrollEnabled = animation?.scroll?.reveal === true;

  const anim = {
    titleStagger: Number(animation?.title?.stagger ?? 0.05),
    metaDelay: Number(animation?.meta?.fadeUp ?? 0.65),
  };

  // ---- 浏览器运行时（注意：这里不能出现反引号和未转义 ${}）----
  const js = `(function () {
  'use strict';
  var poster = document.getElementById('poster');
  var title = document.getElementById('title');
  var text = title.textContent.replace(/\\s+/g, ' ').trim();
  var html = '';
  var i;
  for (i = 0; i < text.length; i++) {
    var ch = text.charAt(i) === ' ' ? '&nbsp;' : text.charAt(i);
    html += '<span class="ch" style="--i:' + i + '">' + ch + '</span>';
  }
  title.innerHTML = html;

  var layers = poster.querySelectorAll('[data-depth]');
  var light = document.getElementById('cursorLight');
  var cta = document.getElementById('cta');
  var date = document.getElementById('date');
  var details = document.getElementById('details');

  if (date) {
    date.addEventListener('click', function () {
      if (details) {
        var open = details.classList.toggle('open');
        details.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
    });
  }
  if (details) {
    details.addEventListener('click', function () {
      details.classList.remove('open');
      details.setAttribute('aria-hidden', 'true');
    });
  }
  var titleEffect = title.getAttribute('data-effect') || 'distort';
  title.addEventListener('mouseenter', function () { title.classList.add('fx-' + titleEffect); });
  title.addEventListener('mouseleave', function () { title.classList.remove('fx-' + titleEffect); });
  if (title.getAttribute('data-click') === 'explode') {
    title.addEventListener('click', function () {
      if (title.classList.contains('exploding')) { title.classList.remove('exploding'); return; }
      title.classList.add('exploding');
      var chs = title.querySelectorAll('.ch');
      var k;
      for (k = 0; k < chs.length; k++) {
        chs[k].style.setProperty('--ex', (Math.random() * 120 - 60).toFixed(0) + 'px');
        chs[k].style.setProperty('--ey', (Math.random() * 120 - 60).toFixed(0) + 'px');
        chs[k].style.setProperty('--er', (Math.random() * 40 - 20).toFixed(0) + 'deg');
      }
      var self = title;
      setTimeout(function () { self.classList.remove('exploding'); }, 800);
    });
  }

  var tilt = parseFloat(poster.getAttribute('data-tilt') || '0');
  if (tilt > 0) {
    poster.classList.add('tilting');
  }

  poster.addEventListener('mousemove', function (e) {
    var r = poster.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5;
    var y = (e.clientY - r.top) / r.height - 0.5;
    var d, k;
    for (k = 0; k < layers.length; k++) {
      d = parseFloat(layers[k].getAttribute('data-depth')) || 0;
      layers[k].style.setProperty('--dx', (x * d * 120).toFixed(1) + 'px');
      layers[k].style.setProperty('--dy', (y * d * 120).toFixed(1) + 'px');
    }
    light.style.setProperty('--lx', (e.clientX - r.left) + 'px');
    light.style.setProperty('--ly', (e.clientY - r.top) + 'px');
    var spot = document.getElementById('spotlight');
    if (spot) { spot.style.setProperty('--slx', (e.clientX - r.left) + 'px'); spot.style.setProperty('--sly', (e.clientY - r.top) + 'px'); }
    if (cta) {
      var cr = cta.getBoundingClientRect();
      var dx = e.clientX - (cr.left + cr.width / 2);
      var dy = e.clientY - (cr.top + cr.height / 2);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var t = Math.max(0, 1 - dist / 200);
      cta.style.transform = 'translate(' + (dx * t * 0.4).toFixed(1) + 'px,' + (dy * t * 0.4).toFixed(1) + 'px)';
    }
    if (tilt > 0) {
      poster.style.transform = 'perspective(1200px) rotateX(' + (-y * tilt).toFixed(2) + 'deg) rotateY(' + (x * tilt).toFixed(2) + 'deg)';
    }
  });
  var repels = poster.querySelectorAll('[data-repel]');
  if (repels.length) {
    poster.addEventListener('mousemove', function (e) {
      var r = poster.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top, k2;
      for (k2 = 0; k2 < repels.length; k2++) {
        var el = repels[k2];
        var er = el.getBoundingClientRect();
        var cx = er.left + er.width / 2 - r.left;
        var cy = er.top + er.height / 2 - r.top;
        var dx = cx - mx, dy = cy - my;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var strength = parseFloat(el.getAttribute('data-repel')) || 0.3;
        var f = Math.max(0, 1 - dist / 260) * strength * 120;
        el.style.setProperty('--rx', (dx / dist * f).toFixed(1) + 'px');
        el.style.setProperty('--ry', (dy / dist * f).toFixed(1) + 'px');
      }
    });
  }

  var ring = document.getElementById('cursorRing');
  if (ring) {
    var mx = 0, my = 0, rx = 0, ry = 0;
    poster.addEventListener('mousemove', function (e) {
      var r = poster.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    });
    function ringLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + (rx - ring.offsetWidth / 2).toFixed(1) + 'px,' + (ry - ring.offsetHeight / 2).toFixed(1) + 'px)';
      requestAnimationFrame(ringLoop);
    }
    ringLoop();
    poster.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest('.date, .cta, .title')) ring.classList.add('big');
    });
    poster.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('.date, .cta, .title')) ring.classList.remove('big');
    });
  }

  var hotspots = poster.querySelectorAll('.hotspot');
  var popover = document.getElementById('hotspotPopover');
  var floatCard = document.getElementById('hpFloat');
  var hpTitle = document.getElementById('hpTitle');
  var hpMeta = document.getElementById('hpMeta');
  var hpBody = document.getElementById('hpBody');
  var hpSections = document.getElementById('hpSections');
  var hpClose = document.getElementById('hpClose');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function placeTop(y, H, ch) {
    var spaceTop = y - 14, spaceBottom = H - y - 14;
    if (spaceTop >= ch + 14) return y - ch - 14;
    if (spaceBottom >= ch + 14) return y + 14;
    return spaceTop > spaceBottom ? 14 : Math.max(14, H - ch - 14);
  }
  function placeLeft(x, W, cw) {
    var left = x - cw / 2;
    if (left < 14) return 14;
    if (left + cw > W - 14) return Math.max(14, W - cw - 14);
    return left;
  }
  function hotspotAction(hs) {
    try { var a = JSON.parse(hs.getAttribute('data-action') || 'null'); } catch (e) { return false; }
    if (a && a.type === 'link' && a.url) { window.open(a.url, '_blank'); return true; }
    if (a && a.type === 'phase' && window.__ssCycle) { window.__ssCycle(); return true; }
    return false;
  }
  var k3;
  var hasSilhouette = !!document.querySelector('.person-glow');
  for (k3 = 0; k3 < hotspots.length; k3++) {
    (function (hs) {
      hs.addEventListener('mouseenter', function () { hs.classList.add('hover'); });
      hs.addEventListener('mouseleave', function () { hs.classList.remove('hover'); });
      var mode = hs.getAttribute('data-mode') || 'click';
      if (mode === 'hover' && floatCard && !hasSilhouette) {
        var fTitle = document.getElementById('hfTitle');
        var fMeta = document.getElementById('hfMeta');
        var fBody = document.getElementById('hfBody');
        var fSections = document.getElementById('hfSections');
        var pinned = false;
        function showFloat() {
          fTitle.textContent = hs.getAttribute('data-label') || '';
          fMeta.textContent = hs.getAttribute('data-meta') || '';
          fBody.textContent = hs.getAttribute('data-detail') || '';
          fMeta.style.display = fMeta.textContent ? '' : 'none';
          fBody.style.display = fBody.textContent ? '' : 'none';
          var secs = [];
          try { secs = JSON.parse(hs.getAttribute('data-sections') || '[]'); } catch (e) { secs = []; }
          var sh = '', si;
          for (si = 0; si < secs.length; si++) {
            sh += '<div class="hp-sec"><h4>' + esc(secs[si].heading || '') + '</h4><p>' + esc(secs[si].text || '') + '</p></div>';
          }
          fSections.innerHTML = sh;
          fSections.style.display = secs.length ? '' : 'none';
          var pr = poster.getBoundingClientRect();
          var hr = hs.getBoundingClientRect();
          var cw = floatCard.offsetWidth || 240;
          var ch = floatCard.offsetHeight || 140;
          var cx = hr.left - pr.left + hr.width / 2;
          var cy = hr.top - pr.top + hr.height / 2;
          floatCard.style.left = placeLeft(cx, pr.width, cw) + 'px';
          floatCard.style.top = placeTop(cy, pr.height, ch) + 'px';
          floatCard.classList.add('open');
        }
        function hideFloat() {
          poster.classList.remove('char-hover');
          floatCard.classList.remove('open');
        }
        hs.addEventListener('mouseenter', function () { poster.classList.add('char-hover'); if (hs.getAttribute('data-interaction') === 'highlight') { if (floatCard) floatCard.classList.remove('open'); } else { showFloat(); } });
        hs.addEventListener('mouseleave', function () { if (!pinned) hideFloat(); });
        hs.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (hotspotAction(hs)) return;
          pinned = !pinned;
          hs.classList.toggle('pinned', pinned);
          if (pinned) { poster.classList.add('char-hover'); if (hs.getAttribute('data-interaction') === 'highlight') { if (floatCard) floatCard.classList.remove('open'); } else { showFloat(); } }
          else { hideFloat(); }
        });
      } else if (popover) {
        hs.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (hotspotAction(hs)) return;
          hpTitle.textContent = hs.getAttribute('data-label') || '';
          hpMeta.textContent = hs.getAttribute('data-meta') || '';
          hpBody.textContent = hs.getAttribute('data-detail') || '';
          hpMeta.style.display = hpMeta.textContent ? '' : 'none';
          hpBody.style.display = hpBody.textContent ? '' : 'none';
          var secs = [];
          try { secs = JSON.parse(hs.getAttribute('data-sections') || '[]'); } catch (e) { secs = []; }
          var sh = '', si;
          for (si = 0; si < secs.length; si++) {
            sh += '<div class="hp-sec"><h4>' + esc(secs[si].heading || '') + '</h4><p>' + esc(secs[si].text || '') + '</p></div>';
          }
          hpSections.innerHTML = sh;
          hpSections.style.display = secs.length ? '' : 'none';
          popover.classList.add('open');
        });
      }
    })(hotspots[k3]);
  }
  if (hasSilhouette && floatCard) {
    var personGlowEl = document.querySelector('.person-glow');
    var silPinned = false, currentGlowSrc = '';
    var firstHoverHs = document.querySelector('.hotspot[data-mode="hover"]');
    function extractUrl(bg) {
      var u = bg.substring(bg.indexOf('url(') + 4, bg.lastIndexOf(')'));
      return u.split('"').join('').split("'").join('').trim();
    }
    function loadMask(src, cb) {
      var img = new Image();
      var cv = document.createElement('canvas');
      img.onload = function () {
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d').drawImage(img, 0, 0);
        cb({ cv: cv, W: img.naturalWidth, H: img.naturalHeight });
      };
      img.onerror = function () { cb(null); };
      img.src = src;
    }
    function hitMask(mask, px, py) {
      if (!mask) return false;
      try {
        var pr = poster.getBoundingClientRect();
        var scale = Math.max(pr.width / mask.W, pr.height / mask.H);
        var dispW = mask.W * scale, dispH = mask.H * scale;
        var offX = (pr.width - dispW) / 2, offY = (pr.height - dispH) / 2;
        var sx = Math.floor((px - offX) / scale), sy = Math.floor((py - offY) / scale);
        if (sx < 0 || sy < 0 || sx >= mask.W || sy >= mask.H) return false;
        return mask.cv.getContext('2d').getImageData(sx, sy, 1, 1).data[3] > 128;
      } catch (e) { return false; }
    }
    var defaultMask = null;
    var dSrc = extractUrl(personGlowEl.style.backgroundImage || '');
    if (dSrc) loadMask(dSrc, function (m) { defaultMask = m; });
    var spots = [];
    var maskHs = poster.querySelectorAll('.hotspot[data-mode="hover"][data-mask]');
    var mi;
    for (mi = 0; mi < maskHs.length; mi++) {
      (function (hs) {
        var src = hs.getAttribute('data-mask');
        if (!src) return;
        loadMask(src, function (m) { spots.push({ hs: hs, src: src, mask: m }); });
      })(maskHs[mi]);
    }
    function fillCard(hs, x, y) {
      var fTitle = document.getElementById('hfTitle');
      var fMeta = document.getElementById('hfMeta');
      var fBody = document.getElementById('hfBody');
      var fSections = document.getElementById('hfSections');
      fTitle.textContent = hs.getAttribute('data-label') || '';
      fMeta.textContent = hs.getAttribute('data-meta') || '';
      fBody.textContent = hs.getAttribute('data-detail') || '';
      fMeta.style.display = fMeta.textContent ? '' : 'none';
      fBody.style.display = fBody.textContent ? '' : 'none';
      var secs = [];
      try { secs = JSON.parse(hs.getAttribute('data-sections') || '[]'); } catch (e) {}
      var sh = '', si2;
      for (si2 = 0; si2 < secs.length; si2++) sh += '<div class="hp-sec"><h4>' + esc(secs[si2].heading || '') + '</h4><p>' + esc(secs[si2].text || '') + '</p></div>';
      fSections.innerHTML = sh;
      fSections.style.display = secs.length ? '' : 'none';
      var pr = poster.getBoundingClientRect();
      var cw = floatCard.offsetWidth || 240, ch = floatCard.offsetHeight || 140;
      floatCard.style.left = placeLeft(x, pr.width, cw) + 'px';
      floatCard.style.top = placeTop(y, pr.height, ch) + 'px';
      floatCard.classList.add('open');
    }
    function findHit(px, py) {
      var i;
      for (i = 0; i < spots.length; i++) {
        if (spots[i].mask && hitMask(spots[i].mask, px, py)) return spots[i];
      }
      if (defaultMask && hitMask(defaultMask, px, py)) return { hs: firstHoverHs, src: dSrc, mask: defaultMask };
      return null;
    }
    var showTimer = null, hideTimer = null, silShown = false;
    function silShow(hit, px, py) {
      silShown = true;
      poster.classList.add('char-hover');
      if (hit.hs) hit.hs.classList.add('hover');
      if (personGlowEl && hit.src && hit.src !== currentGlowSrc) {
        personGlowEl.style.backgroundImage = "url('" + hit.src + "')";
        currentGlowSrc = hit.src;
      }
      if (hit.hs) {
        if (hit.hs.getAttribute('data-interaction') === 'highlight') {
          if (floatCard) floatCard.classList.remove('open');
        } else { fillCard(hit.hs, px, py); }
      } else if (floatCard) { floatCard.classList.add('open'); }
    }
    function silHide() {
      silShown = false;
      poster.classList.remove('char-hover');
      for (var i = 0; i < spots.length; i++) spots[i].hs.classList.remove('hover');
      if (firstHoverHs) firstHoverHs.classList.remove('hover');
      floatCard.classList.remove('open');
    }
    poster.addEventListener('mousemove', function (e) {
      var pr = poster.getBoundingClientRect();
      var px = e.clientX - pr.left, py = e.clientY - pr.top;
      var hit = findHit(px, py);
      if (hit) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (silShown) { silShow(hit, px, py); }
        else if (!showTimer) { showTimer = setTimeout(function () { showTimer = null; silShow(hit, px, py); }, 110); }
      } else if (!silPinned) {
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        if (silShown && !hideTimer) { hideTimer = setTimeout(function () { hideTimer = null; silHide(); }, 180); }
      }
    });
    poster.addEventListener('click', function (ev) {
      var pr = poster.getBoundingClientRect();
      var px = ev.clientX - pr.left, py = ev.clientY - pr.top;
      var hit = findHit(px, py);
      if (hit) {
        if (hit.hs && hotspotAction(hit.hs)) return;
        silPinned = !silPinned;
        if (hit.hs) hit.hs.classList.toggle('pinned', silPinned);
        if (silPinned) { silShow(hit, px, py); } else { silHide(); }
      }
    });
  }
  if (popover) {
    poster.addEventListener('click', function () { popover.classList.remove('open'); });
    if (hpClose) {
      hpClose.addEventListener('click', function (ev) { ev.stopPropagation(); popover.classList.remove('open'); });
    }
    popover.addEventListener('click', function (ev) { ev.stopPropagation(); popover.classList.remove('open'); });
  }
  var imgLayer = poster.querySelector('.image');
  if (imgLayer && imgLayer.getAttribute('data-zoom')) {
    poster.addEventListener('mouseenter', function () { imgLayer.classList.add('zoom'); });
    poster.addEventListener('mouseleave', function () { imgLayer.classList.remove('zoom'); });
  }

  poster.addEventListener('mouseleave', function () {
    for (var k = 0; k < layers.length; k++) {
      layers[k].style.setProperty('--dx', '0px');
      layers[k].style.setProperty('--dy', '0px');
    }
    if (cta) { cta.style.transform = ''; }
    if (tilt > 0) { poster.style.transform = ''; }
  });

  // ---- V0.2: Particles（可选）----
  var pcanvas = document.getElementById('particles');
  if (pcanvas) {
    var pctx = pcanvas.getContext('2d');
    var parts = [];
    var pcount = ${particlesCfg ? Number(particlesCfg.count) || 30 : 0};
    var pcolor = '${particlesCfg ? rgb.accent : '0, 229, 255'}';
    var pw = 0, ph = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function pResize() {
      pw = poster.clientWidth; ph = poster.clientHeight;
      pcanvas.width = Math.max(1, Math.round(pw * dpr));
      pcanvas.height = Math.max(1, Math.round(ph * dpr));
      pcanvas.style.width = pw + 'px';
      pcanvas.style.height = ph + 'px';
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function pInit() {
      parts = [];
      for (var i = 0; i < pcount; i++) {
        parts.push({
          x: Math.random() * pw,
          y: Math.random() * ph,
          r: Math.random() * 1.8 + 0.6,
          s: Math.random() * 0.4 + 0.15,
          a: Math.random() * 0.6 + 0.2,
          tw: Math.random() * Math.PI * 2,
        });
      }
    }
    function pTick() {
      if (reduced) { pInit(); pDraw(); return; }
      pctx.clearRect(0, 0, pw, ph);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.s;
        p.tw += 0.02;
        if (p.y < -4) { p.y = ph + 4; p.x = Math.random() * pw; }
        var alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = 'rgba(' + pcolor + ',' + alpha.toFixed(3) + ')';
        pctx.fill();
      }
      requestAnimationFrame(pTick);
    }
    function pDraw() {
      pctx.clearRect(0, 0, pw, ph);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = 'rgba(' + pcolor + ',' + (p.a * 0.8).toFixed(3) + ')';
        pctx.fill();
      }
    }
    pResize(); pInit();
    if (pcount > 0) { pTick(); }
    window.addEventListener('resize', function () { pResize(); pInit(); });
  }

  // ---- V0.4: Rain canvas 雨幕（深度分层 + 斜风）----
  var rainCanvas = document.getElementById('rainCanvas');
  if (rainCanvas) {
    var rctx = rainCanvas.getContext('2d');
    var drops = [], ripples = [], splashes = [];
    var RW = 0, RH = 0, Rdpr = Math.min(window.devicePixelRatio || 1, 2);
    var rReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var rainOn = true, rainDensity = 1, rippleAcc = 0;
    function rCssVar(name, dflt) {
      var v = getComputedStyle(poster).getPropertyValue(name).trim();
      var n = parseFloat(v);
      return isNaN(n) ? dflt : n;
    }
    function rGate() {
      var on = rCssVar('--fx-rain', 0) === 1;
      var density = rCssVar('--fx-rain-density', 1);
      if (!on && rainOn) rctx.clearRect(0, 0, RW, RH);
      var turnedOn = on && !rainOn;
      if (turnedOn) { rainDensity = density; rInit(); }
      else if (on && Math.abs(density - rainDensity) > 0.12) { rainDensity = density; rInit(); }
      rainOn = on;
      if (turnedOn) rTick();  // rainOn 已更新 → 雨开启时补画一帧（reduced-motion 也可见）
    }
    function rResize() {
      RW = poster.clientWidth; RH = poster.clientHeight;
      rainCanvas.width = Math.max(1, Math.round(RW * Rdpr));
      rainCanvas.height = Math.max(1, Math.round(RH * Rdpr));
      rainCanvas.style.width = RW + 'px';
      rainCanvas.style.height = RH + 'px';
      rctx.setTransform(Rdpr, 0, 0, Rdpr, 0, 0);
    }
    function rInit() {
      drops = []; ripples = []; splashes = [];
      var sc = Math.sqrt(Math.max(0.3, rainDensity));
      var total = Math.round((RW * RH) / 9000 * rainDensity);
      var i;
      for (i = 0; i < total; i++) {
        var near = Math.random() > 0.62;
        drops.push({
          x: Math.random() * (RW + 120) - 60,
          y: Math.random() * RH,
          len: near ? (Math.random() * 16 + 22) * sc : (Math.random() * 8 + 9) * sc,
          spd: near ? (Math.random() * 0.9 + 1.1) * sc : (Math.random() * 0.45 + 0.5) * sc,
          a: near ? (Math.random() * 0.28 + 0.38) : (Math.random() * 0.14 + 0.12),
          w: near ? (Math.random() * 1 + 1.3) : (Math.random() * 0.5 + 0.6),
        });
      }
      rainCanvas.__rain = { drops: drops, ripples: ripples, splashes: splashes, density: rainDensity };
    }
    function rSpawn() {
      var x = Math.random() * RW, y = Math.random() * RH;
      var big = Math.random() > 0.7;
      ripples.push({ x: x, y: y, t: 0, life: big ? 1 : 0.55, maxR: big ? (Math.random() * 16 + 20) : (Math.random() * 7 + 9) });
      if (ripples.length > 26) ripples.shift();
      var n = 2 + Math.floor(Math.random() * 2), i;
      for (i = 0; i < n; i++) {
        var ang = -Math.PI * 0.85 - Math.random() * Math.PI * 0.3;
        var sp = Math.random() * 2.6 + 1.3;
        splashes.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, life: 0.32 + Math.random() * 0.16 });
        if (splashes.length > 60) splashes.shift();
      }
    }
    function rTick() {
      var i, d;
      for (i = 0; i < drops.length; i++) {
        d = drops[i];
        d.y += d.spd;
        d.x -= d.spd * 0.22;
        if (d.y - d.len > RH) { d.y = -Math.random() * RH * 0.25; d.x = Math.random() * (RW + 120) - 60; }
        if (d.x < -60) d.x = RW + 50;
      }
      if (rainOn) {
        rippleAcc += 0.02 + rainDensity * 0.012;
        while (rippleAcc >= 1) { rippleAcc -= 1; rSpawn(); }
        for (i = ripples.length - 1; i >= 0; i--) {
          var rp = ripples[i];
          rp.t += 1 / 60 / rp.life;
          if (rp.t >= 1) ripples.splice(i, 1);
        }
        for (i = splashes.length - 1; i >= 0; i--) {
          var sp = splashes[i];
          sp.t += 1 / 60 / sp.life;
          sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.09;
          if (sp.t >= 1) splashes.splice(i, 1);
        }
        rctx.clearRect(0, 0, RW, RH);
        rctx.lineCap = 'round';
        for (i = 0; i < drops.length; i++) {
          d = drops[i];
          rctx.strokeStyle = 'rgba(198,228,255,' + d.a.toFixed(3) + ')';
          rctx.lineWidth = d.w;
          rctx.beginPath();
          rctx.moveTo(d.x, d.y);
          rctx.lineTo(d.x - d.len * 0.22, d.y - d.len);
          rctx.stroke();
        }
        for (i = 0; i < ripples.length; i++) {
          var r2 = ripples[i];
          var ease = 1 - Math.pow(1 - r2.t, 3);
          var rad = r2.maxR * ease;
          var alpha = (1 - r2.t) * 0.5;
          rctx.strokeStyle = 'rgba(212,238,255,' + alpha.toFixed(3) + ')';
          rctx.lineWidth = 1.3;
          rctx.beginPath();
          rctx.ellipse(r2.x, r2.y, rad, rad * 0.72, 0, 0, Math.PI * 2);
          rctx.stroke();
        }
        for (i = 0; i < splashes.length; i++) {
          var s2 = splashes[i];
          rctx.fillStyle = 'rgba(212,238,255,' + ((1 - s2.t) * 0.75).toFixed(3) + ')';
          rctx.beginPath();
          rctx.arc(s2.x, s2.y, 1.5, 0, Math.PI * 2);
          rctx.fill();
        }
      }
      if (!rReduced) requestAnimationFrame(rTick);
    }
    rGate(); rResize(); rInit(); rTick();
    setInterval(rGate, 500);
    window.addEventListener('resize', function () { rResize(); rInit(); });
  }

  // ---- V0.2: Scroll Reveal（可选）----
  // ---- V0.3: Time-of-day lifecycle (time phases) ----
  var timePhases = ${JSON.stringify(timePhases || [])};
  if (timePhases.length >= 2) {
    function cssColorToRgbStr(v) {
      var s = String(v), i = s.indexOf('('), j = s.indexOf(')');
      if (i < 0) return '0, 0, 0';
      var body = s.slice(i + 1, j < 0 ? s.length : j);
      var parts = body.split(',').map(function (x) { return parseFloat(x); });
      if (parts.length >= 3 && !isNaN(parts[0])) return parts[0] + ', ' + parts[1] + ', ' + parts[2];
      return '0, 0, 0';
    }
    var chip = document.getElementById('timeChip');
    var tcText = document.getElementById('tcText');
    var tcDot = document.getElementById('tcDot');
    var live = true;
    var phaseIdx = 0;
    function phaseForHour(h) {
      var idx = -1, i;
      for (i = 0; i < timePhases.length; i++) { if (h >= timePhases[i].hour) idx = i; }
      return idx === -1 ? timePhases.length - 1 : idx;
    }
    function applyPhase(i) {
      phaseIdx = i;
      poster.setAttribute('data-phase', String(i));
      var p = timePhases[i];
      tcText.textContent = (p.name ? p.name + ' \u00B7 ' : '') + (p.label || p.hour + ':00');
      if (pcanvas) { pcolor = cssColorToRgbStr(getComputedStyle(poster).getPropertyValue('--accent')); }
    }
    function goLive() { live = true; tcDot.classList.add('live'); applyPhase(phaseForHour(new Date().getHours())); }
    function cycle() { live = false; tcDot.classList.remove('live'); applyPhase((phaseIdx + 1) % timePhases.length); }
    chip.addEventListener('click', function (e) { e.stopPropagation(); cycle(); });
    chip.addEventListener('dblclick', function (e) { e.stopPropagation(); goLive(); });
    goLive();
    setInterval(function () { if (live) applyPhase(phaseForHour(new Date().getHours())); }, 30000);
  }

  // ---- V0.4: Weather-driven poster（实时天气 → 相位）----
  var weatherCfg = ${JSON.stringify(weatherCfg || null)};
  var wmo = ${JSON.stringify(WMO_CODES)};
  if (weatherCfg && wmo) {
    function wGroup(code) { return (wmo[code] && wmo[code].group) || 'cloud'; }
    function wLabel(code) { return (wmo[code] && wmo[code].label) || 'CLOUDY'; }
    function jget(url, ms) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var opt = ctrl ? { signal: ctrl.signal } : {};
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 8000);
      return fetch(url, opt).then(function (r) { return r.json(); }).then(function (d) { clearTimeout(to); return d; }, function (e) { clearTimeout(to); throw e; });
    }
    var wCity = weatherCfg.defaultCity || 'YOUR CITY';
    var wLat = weatherCfg.lat, wLon = weatherCfg.lon;
    var wChip = document.getElementById('timeChip');
    var wTcText = document.getElementById('tcText');
    var wTcDot = document.getElementById('tcDot');
    var eWTime = document.getElementById('wTime');
    var eWCity = document.getElementById('wCity');
    var eWTemp = document.getElementById('wTemp');
    var eWCond = document.getElementById('wCond');
    var eWGreet = document.getElementById('wGreeting');
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function nowTime() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
    function wMatch(group, isDay) {
      var i;
      for (i = 0; i < weatherCfg.phases.length; i++) {
        var m = weatherCfg.phases[i].match || {};
        var g = m.group ? (Array.isArray(m.group) ? m.group.indexOf(group) >= 0 : m.group === group) : true;
        var d = m.isDay !== undefined ? (m.isDay === isDay) : true;
        if (g && d) return i;
      }
      return 0;
    }
    function wSetTitle(text) {
      var t = document.getElementById('title');
      if (!t || !text || text.length > 12) return;
      var h = '', i;
      for (i = 0; i < text.length; i++) {
        var ch = text.charAt(i) === ' ' ? '\u00A0' : text.charAt(i);
        h += '<span class="ch" style="--i:' + i + '">' + ch + '</span>';
      }
      t.innerHTML = h;
    }
    function wApply(group, isDay, temp, cond, density) {
      var idx = wMatch(group, isDay);
      poster.setAttribute('data-phase', String(idx));
      poster.setAttribute('data-fx-rain', (group === 'rain' || group === 'storm' || group === 'drizzle') ? '1' : '0');
      if (group === 'rain' || group === 'storm' || group === 'drizzle') {
        poster.style.setProperty('--fx-rain-density', String(isNaN(density) ? 1 : density));
      } else {
        poster.style.removeProperty('--fx-rain-density');
      }
      var greet = (isDay ? 'RIGHT NOW IN ' : 'TONIGHT IN ') + wCity + ' \u00B7 ' + (locSource === 'gps' ? 'GPS' : locSource === 'ip' ? 'IP' : locSource === 'city' ? 'MANUAL' : 'DEFAULT');
      if (eWTime) eWTime.textContent = nowTime();
      if (eWCity) eWCity.textContent = wCity;
      if (eWTemp) eWTemp.textContent = (temp == null ? '--' : temp) + '\u00B0';
      if (eWCond) eWCond.textContent = cond;
      if (eWGreet) eWGreet.textContent = greet;
      if (wTcText) wTcText.textContent = 'LIVE \u00B7 ' + wCity + ' \u00B7 ' + (temp == null ? '--' : temp) + '\u00B0';
      if (wTcDot) wTcDot.classList.add('live');
    }
    function wFail() { wApply('cloud', true, null, 'OFFLINE', 1); }
    function wDensity(code) {
      if (code >= 95) return 2.2;          // 暴雨/雷暴
      if (code === 82 || code === 65 || code === 67) return 1.6; // 大雨
      if (code >= 80) return 1.3;          // 阵雨
      if (code >= 61) return 1;            // 中雨
      if (code >= 51) return 0.45;         // 毛毛雨
      return 1;
    }
    function wLoad() {
      var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + wLat + '&longitude=' + wLon + '&current=temperature_2m,is_day,weather_code&timezone=auto';
      jget(u, 10000).then(function (d) {
        if (!d || !d.current) return wFail();
        var code = d.current.weather_code;
        var isDay = d.current.is_day === 1;
        wApply(wGroup(code), isDay, Math.round(d.current.temperature_2m), wLabel(code), wDensity(code));
        if (wCity !== (weatherCfg.defaultCity || 'YOUR CITY')) wSetTitle(wCity.toUpperCase());
      }).catch(wFail);
    }
    var locSource = 'default';
    function wReverseGeo() {
      var u1 = 'https://nominatim.openstreetmap.org/reverse?lat=' + wLat + '&lon=' + wLon + '&format=json&accept-language=en';
      return jget(u1, 5000).then(function (d) {
        var a = (d && d.address) || {};
        var c = a.city || a.town || a.county || a.state_district || '';
        if (c) wCity = c;
      }).catch(function () {
        var u2 = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + wLat + '&longitude=' + wLon + '&localityLanguage=en';
        return jget(u2, 5000).then(function (d) { if (d && d.city) wCity = d.city; }).catch(function () {});
      }).then(function () {
        // 城市名解析完成 → 刷新显示（不阻塞天气加载）
        if (eWCity) eWCity.textContent = wCity;
        if (wCity !== (weatherCfg.defaultCity || 'YOUR CITY')) wSetTitle(wCity.toUpperCase());
        wLoad();
      });
    }
    function wResolveGps() {
      return new Promise(function (resolve) {
        if (!navigator.geolocation) return resolve(false);
        navigator.geolocation.getCurrentPosition(function (pos) {
          wLat = pos.coords.latitude; wLon = pos.coords.longitude;
          resolve(true);   // 坐标已到手，先出天气；城市名并行解析
          wReverseGeo();
        }, function (err) {
          if (eWGreet) {
            eWGreet.textContent = '\uD83D\uDCCD \u5B9A\u4F4D\u5931\u8D25 \u00B7 \u70B9\u51FB\u91CD\u8BD5\uFF08\u9700\u5C55\u5F00\u6D4F\u89C8\u5668\u5B9A\u4F4D\u6743\u9650\uFF09';
            eWGreet.setAttribute('title', '\u70B9\u51FB\u91CD\u65B0\u5B9A\u4F4D');
          }
          resolve(false);
        }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 });
      });
    }
    function wResolveByIp() {
      return jget('https://ipwho.is/', 8000).then(function (d) {
        if (d && d.success && d.city) {
          wCity = d.city;
          if (d.latitude) wLat = d.latitude;
          if (d.longitude) wLon = d.longitude;
          return 'ip';
        }
        return 'default';
      }).catch(function () { return 'default'; });
    }
    function wSetLoc(source) {
      locSource = source;
      if (eWGreet) eWGreet.setAttribute('title', '点击重新定位');
    }
    function wBoot() {
      var qCity = null;
      try { qCity = new URLSearchParams(window.location.search).get('city'); } catch (e) {}
      if (qCity) {
        jget('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(qCity) + '&count=1&language=en&format=json', 8000).then(function (g) {
          if (g && g.results && g.results.length) {
            wCity = g.results[0].name;
            wLat = g.results[0].latitude; wLon = g.results[0].longitude;
            wSetLoc('city');
            if (eWCity) eWCity.textContent = wCity;
            wLoad();
          } else { wBootIp(); }
        }).catch(function () { wBootIp(); });
        return;
      }
      wResolveGps().then(function (geoOk) {
        if (geoOk) { wSetLoc('gps'); }
        else { return wResolveByIp().then(function (src) { wSetLoc(src); }); }
      }).then(function () {
        if (eWCity) eWCity.textContent = wCity;
        wLoad();
      });
    }
    function wBootIp() {
      wResolveByIp().then(function (src) {
        wSetLoc(src);
        if (eWCity) eWCity.textContent = wCity;
        wLoad();
      });
    }
    if (eWGreet) eWGreet.addEventListener('click', function () { wBoot(); });
    wBoot();
    if (wChip) wChip.addEventListener('click', function (e) { e.stopPropagation(); wLoad(); });
    setInterval(wLoad, 600000);
  }

  var switchCfg = ${JSON.stringify(switchCfg || null)};
  if (switchCfg && switchCfg.length >= 2) {
    var ssBtn = document.getElementById('styleSwitch');
    var ssText = document.getElementById('ssText');
    var ssChip = document.getElementById('phaseChip');
    var ssIdx = 0;
    function ssSwapImage(i) {
      var imgLayer = poster.querySelector('.image');
      if (!imgLayer || !switchCfg[i].image) return;
      var next = "url('" + switchCfg[i].image + "')";
      if (imgLayer.style.backgroundImage === next) return;
      imgLayer.style.transition = 'opacity .5s ease, transform 1.2s cubic-bezier(.2,.7,.2,1), filter .5s ease';
      imgLayer.style.opacity = '0';
      setTimeout(function () {
        imgLayer.style.backgroundImage = next;
        imgLayer.style.opacity = '1';
      }, 240);
    }
    function ssApply(i) {
      ssIdx = i;
      poster.setAttribute('data-phase', String(i));
      var label = switchCfg[i].name || String(i + 1);
      if (ssText) ssText.textContent = 'STYLE \u00B7 ' + label;
      if (ssChip) ssChip.textContent = label;
      ssSwapImage(i);
    }
    window.__ssCycle = function () { ssApply((ssIdx + 1) % switchCfg.length); };
    if (ssBtn) ssBtn.addEventListener('click', function (e) { e.stopPropagation(); window.__ssCycle(); });
    ssApply(0);
  }

  var more = document.getElementById('scrollMore');
  if (more) {
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { more.classList.add('in-view'); io.unobserve(more); }
        });
      }, { threshold: 0.15 });
      io.observe(more);
    } else {
      more.classList.add('in-view');
    }
  }
})();`;

  // ---- CSS ----
  const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  margin: 0; min-height: 100vh; display: grid; place-items: center;
  background: #05050a; padding: 24px; font-family: ${fonts.body};
}
body.scrollable { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 48px 24px 96px; }
@property --bg { syntax: '<color>'; inherits: true; initial-value: ${C.bg}; }
@property --surface { syntax: '<color>'; inherits: true; initial-value: ${C.surface}; }
@property --ink { syntax: '<color>'; inherits: true; initial-value: ${C.ink}; }
@property --accent { syntax: '<color>'; inherits: true; initial-value: ${C.accent}; }
@property --accent2 { syntax: '<color>'; inherits: true; initial-value: ${C.accent2}; }
@property --muted { syntax: '<color>'; inherits: true; initial-value: ${C.muted}; }
@property --glow-color { syntax: '<color>'; inherits: true; initial-value: transparent; }
@property --grain { syntax: '<number>'; inherits: true; initial-value: .35; }
@property --glow { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --blur { syntax: '<number>'; inherits: true; initial-value: 0; }
@property --contrast { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --brightness { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --saturate { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --shadow { syntax: '<number>'; inherits: true; initial-value: .55; }
@property --fx-rain { syntax: '<number>'; inherits: true; initial-value: 0; }
@property --fx-rain-density { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --fx-fog { syntax: '<number>'; inherits: true; initial-value: 0; }
@property --fx-stars { syntax: '<number>'; inherits: true; initial-value: 0; }
.stage {
  width: min(92vw, calc((100vh - 48px) * ${ratioInv}));
  aspect-ratio: ${width} / ${canvas.height};
  container-type: inline-size;
}
.poster {
  position: relative; width: 100%; height: 100%; overflow: hidden;
  border-radius: 1cqw; background: var(--bg); color: var(--ink);
  box-shadow: 0 4cqw 8cqw rgba(0,0,0,var(--shadow,.55)); cursor: crosshair; isolation: isolate;
  transform-style: preserve-3d;
  --bg: ${C.bg}; --surface: ${C.surface}; --ink: ${C.ink};
  --accent: ${C.accent}; --accent2: ${C.accent2}; --muted: ${C.muted};
  --grain: .35; --glow: 1; --blur: 0; --contrast: 1; --brightness: 1; --saturate: 1; --shadow: .55; --hue: 0deg; --fx-rain: 0; --fx-rain-density: 1; --fx-fog: 0; --fx-stars: 0;
  --glow-color: color-mix(in srgb, ${C.accent} 30%, transparent);
  filter: contrast(var(--contrast,1)) brightness(var(--brightness,1)) saturate(var(--saturate,1)) hue-rotate(var(--hue, 0deg)) blur(calc(var(--blur,0) * 1.2cqw));
  transition: transform .25s ease-out, filter 1.6s ease, box-shadow 1.6s ease,
    --bg 1.6s ease, --surface 1.6s ease, --ink 1.6s ease, --accent 1.6s ease,
    --accent2 1.6s ease, --muted 1.6s ease, --grain 1.6s ease, --glow 1.6s ease,
    --blur 1.6s ease, --contrast 1.6s ease, --brightness 1.6s ease, --saturate 1.6s ease,
    --shadow 1.6s ease, --glow-color 1.6s ease, --fx-rain 1.6s ease, --fx-rain-density 1.6s ease, --fx-fog 1.6s ease, --fx-stars 1.6s ease;
}
.poster.tilting { will-change: transform; }
.layer { position: absolute; inset: 0; pointer-events: none; }
[data-depth] {
  transform: translate3d(calc(var(--dx,0px) + var(--rx,0px)), calc(var(--dy,0px) + var(--ry,0px)), 0);
  transition: transform .3s cubic-bezier(.2,.7,.2,1); will-change: transform;
}
.bg {
  z-index: 1;
  background:
    radial-gradient(120% 90% at 18% 8%, var(--surface), transparent 62%),
    radial-gradient(90% 70% at 85% 92%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%),
    var(--bg);
}
.bg::after {
  content: ""; position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  opacity: var(--grain, .35); mix-blend-mode: overlay;
}
  ${gridLinesCss}
.particles { z-index: 3; display: block; width: 100%; height: 100%; }
.ball {
  z-index: 3; pointer-events: none;
  width: 44cqw; height: 44cqw;
  right: -10cqw; top: 14cqw; left: auto; bottom: auto;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255,255,255,.4), transparent 42%),
    radial-gradient(circle at 50% 50%, #e06a28 0 60%, #191919 60% 100%);
  box-shadow: 0 0 8cqw rgba(199,255,0,.18);
  opacity: .92;
}
.ball::before, .ball::after { content: ""; position: absolute; background: #191919; opacity: .8; }
.ball::before { left: 50%; top: 0; width: 2.4cqw; height: 100%; transform: translateX(-50%); }
.ball::after { top: 50%; left: 0; height: 2.4cqw; width: 100%; transform: translateY(-50%); }
.glow {
  z-index: 4;
  background: radial-gradient(38% 38% at 50% 45%, var(--glow-color), transparent 70%);
  filter: blur(6cqw); animation: pulse 6s ease-in-out infinite;
}
.content {
  position: absolute; inset: 0; z-index: 5;
  padding: 7cqw 7cqw 6cqw;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "top top"
    "mid mid"
    "bottom bottom";
  gap: 3cqw;
}
.meta-top { grid-area: top; }
.middle { grid-area: mid; align-self: center; }
.meta-bottom { grid-area: bottom; align-self: end; }
.meta-top {
  display: flex; justify-content: space-between; align-items: center;
  opacity: 0; transform: translateY(1.5cqw);
  animation: fadeUp .8s ease .15s forwards;
}
.brand { font-family: ${fonts.body}; font-weight: 800; letter-spacing: .35em; font-size: ${xsSize}cqw; color: var(--accent); }
.tag {
  font-family: ${fonts.body}; letter-spacing: .3em; font-size: ${xsSize}cqw;
  color: var(--muted); border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  padding: .6em 1em; border-radius: 99em;
}
.middle { display: flex; flex-direction: column; align-items: flex-start; }
.title {
  font-family: ${fonts.display}; font-size: ${titleSize}cqw; line-height: .92;
  font-weight: 900; text-transform: uppercase; letter-spacing: .01em;
  max-width: 92%; color: var(--ink);
  text-shadow: 0 0 calc(3cqw * var(--glow,1)) color-mix(in srgb, var(--accent) 28%, transparent);
  transition: transform .35s cubic-bezier(.2,.7,.2,1), letter-spacing .35s;
}
.title .ch {
  display: inline-block; white-space: pre; opacity: 0;
  transform: translateY(.55em);
  animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards;
  animation-delay: calc(var(--i) * ${anim.titleStagger}s + .25s);
}
.title.distort { letter-spacing: .05em; transform: skewX(-4deg) scale(1.04); }
.fx-distort { letter-spacing: .05em; transform: skewX(-4deg) scale(1.04); }
.fx-glitch { animation: glitch .35s steps(2) infinite; }
.fx-color-shift { color: var(--accent); }
.title .ch { transition: transform .35s cubic-bezier(.2,.7,.2,1), color .35s; }
.fx-expand { letter-spacing: .22em; }
.fx-morph .ch { transform: scale(1.35) rotate(9deg); color: var(--accent); }
.fx-morph .ch:nth-child(odd) { transform: scale(.85) rotate(-7deg); }
.spotlight { z-index: 4; pointer-events: none; mix-blend-mode: screen; opacity: .9;
  background: radial-gradient(32cqw 32cqw at var(--slx, 50%) var(--sly, 50%), color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%); }
.fx-scale { transform: scale(1.06); }
.title.exploding .ch { animation: explode .7s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: 0s !important; }
.title[data-vertical] { writing-mode: vertical-rl; max-height: 96%; }
.title[data-rotate] { --title-rot: attr(data-rotate deg); transform: rotate(var(--title-rot, 0deg)); }
.title[data-crop] { clip-path: inset(0 0 calc((1 - var(--title-crop, 0)) * 100%) 0); --title-crop: attr(data-crop number); }
.title[data-overlap] { letter-spacing: -0.06em; }
.motion-subtle .title { animation: msTitle 5s ease-in-out infinite; }
@keyframes msTitle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-.5cqw); } }
.motion-kinetic .title { animation: mkTitle 2.2s ease-in-out infinite; }
@keyframes mkTitle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.2cqw); } }
.motion-kinetic .image { animation: mkImg 7s ease-in-out infinite; }
@keyframes mkImg { 0%,100% { background-position: center; } 50% { background-position: 54% 46%; } }
.motion-fluid .title { animation: mfTitle 3s ease-in-out infinite; }
@keyframes mfTitle { 0%,100% { letter-spacing: .01em; filter: blur(0); } 50% { letter-spacing: .08em; filter: blur(.06cqw); } }
.motion-mechanical .title { animation: mmTitle 1.8s steps(3) infinite; }
@keyframes mmTitle { 0% { transform: translateX(0); } 33% { transform: translateX(1cqw); } 66% { transform: translateX(-1cqw); } 100% { transform: translateX(0); } }
.motion-elastic .title { animation: meTitle 2.6s cubic-bezier(.34,1.56,.64,1) infinite; }
@keyframes meTitle { 0%,100% { transform: scale(1); } 45% { transform: scale(1.03); } 55% { transform: scale(.98); } }
.motion-organic .title { animation: moTitle 4s ease-in-out infinite; }
@keyframes moTitle { 0%,100% { transform: rotate(-.4deg); } 50% { transform: rotate(.4deg); } }
.motion-cinematic .image { animation: mcZoom 9s ease-out infinite alternate; }
@keyframes mcZoom { 0% { transform: scale(1.02); } 100% { transform: scale(1.12); } }
.motion-glitch .title { animation: mgGlitch .4s steps(2) infinite; }
@keyframes mgGlitch { 0% { clip-path: inset(0 0 0 0); transform: translate(0,0); } 25% { clip-path: inset(12% 0 48% 0); transform: translate(-2px,1px); } 50% { clip-path: inset(58% 0 8% 0); transform: translate(2px,-1px); } 75% { clip-path: inset(28% 0 40% 0); transform: translate(-1px,2px); } 100% { clip-path: inset(0 0 0 0); transform: translate(0,0); } }
.subtitle {
  font-family: ${fonts.body}; font-size: ${subtitleSize}cqw; letter-spacing: .28em;
  color: var(--muted); text-transform: uppercase; margin-top: 2.5cqw;
  opacity: 0; transform: translateY(1.5cqw);
  animation: fadeUp .8s ease .5s forwards;
}
.location {
  margin-top: 2.5cqw; font-family: ${fonts.body}; font-size: ${metaSize}cqw;
  letter-spacing: .22em; color: var(--muted); text-transform: uppercase;
  opacity: 0; transform: translateY(1.5cqw);
  animation: fadeUp .8s ease ${anim.metaDelay}s forwards;
}
.meta-bottom {
  display: flex; align-items: center; justify-content: space-between;
  opacity: 0; transform: translateY(1.5cqw);
  animation: fadeUp .8s ease .8s forwards;
}
.date {
  font-family: ${fonts.body}; font-size: ${metaSize}cqw; font-weight: 800;
  letter-spacing: .22em; background: var(--accent); color: #05050a;
  border: none; padding: 1.3em 1.9em; border-radius: .35em; cursor: pointer;
  text-transform: uppercase; transition: transform .2s, box-shadow .2s;
}
.date:hover { transform: translateY(-.2em); box-shadow: 0 0 3cqw color-mix(in srgb, var(--accent) 50%, transparent); }
.meta-left { display: flex; flex-direction: column; align-items: flex-start; gap: 1.2cqw; }
.price {
  font-family: ${fonts.display}; font-size: ${metaSize}cqw; font-weight: 700;
  letter-spacing: .18em; color: var(--accent); text-transform: uppercase;
}
.cta {
  font-family: ${fonts.body}; font-size: ${subtitleSize}cqw; font-weight: 900;
  letter-spacing: .28em; color: var(--ink); background: transparent;
  border: .15em solid var(--ink); padding: 1.1em 2.4em; border-radius: .35em;
  cursor: pointer; text-transform: uppercase;
  transition: background .25s, color .25s, box-shadow .25s;
}
.cta:hover { background: var(--ink); color: var(--bg); box-shadow: 0 0 4cqw color-mix(in srgb, var(--ink) 35%, transparent); }
.details {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
  background: rgba(8,8,14,.92); backdrop-filter: blur(1.5cqw);
  padding: 3.5cqw 7cqw; border-top: .2em solid var(--accent);
  transform: translateY(102%); transition: transform .5s cubic-bezier(.2,.7,.2,1);
}
.details.open { transform: translateY(0); }
.details-inner { display: flex; flex-direction: column; gap: 1.2cqw; font-family: ${fonts.body}; }
.d-lineup { font-size: ${subtitleSize}cqw; font-weight: 800; letter-spacing: .2em; color: ${C.ink}; text-transform: uppercase; }
.d-time, .d-note { font-size: ${metaSize}cqw; letter-spacing: .18em; color: ${C.muted}; text-transform: uppercase; }
.cursor-light {
  position: absolute; inset: 0; z-index: 7; pointer-events: none;
  background: radial-gradient(24cqw 24cqw at var(--lx,50%) var(--ly,50%), color-mix(in srgb, var(--accent) 15%, transparent), transparent 70%);
  mix-blend-mode: screen; opacity: 0; transition: opacity .3s;
}
.poster:hover .cursor-light { opacity: 1; }
.cursor-ring {
  position: absolute; left: 0; top: 0; width: 28px; height: 28px; z-index: 8;
  border: 2px solid var(--accent); border-radius: 50%; pointer-events: none;
  opacity: .85; mix-blend-mode: screen;
  transition: width .2s ease, height .2s ease, border-color .2s ease;
}
.cursor-ring.big { width: 46px; height: 46px; border-color: var(--accent2); }
.image {
  z-index: 2; background-size: cover; background-position: center;
  transition: transform 1.2s cubic-bezier(.2,.7,.2,1), filter .5s ease;
}
.image.zoom { transform: scale(1.06); }
.image-duotone {
  z-index: 2; mix-blend-mode: multiply; opacity: .6;
  background: linear-gradient(color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 22%, transparent));
}
.img-overlay {
  z-index: 2; opacity: 0; transition: opacity 1.4s ease;
}
.img-overlay svg { width: 100%; height: 100%; display: block; }
${phaseSet ? '.poster[data-phase]:not([data-phase="0"]) .img-overlay { opacity: 1; }' : ''}
.graphics { z-index: 2; pointer-events: none; }
.graphics svg { width: 100%; height: 100%; display: block; }
${materialityCss()}
.image-scrim {
  z-index: 2;
  background:
    linear-gradient(to top, ${C.bg} 0%, transparent 32%),
    linear-gradient(to bottom, ${C.bg} 0%, transparent 26%);
  opacity: .85;
}
.person-glow {
  z-index: 2; background-size: cover; background-position: center; pointer-events: none;
  mix-blend-mode: screen; opacity: 0;
  filter: blur(.4cqw) drop-shadow(0 0 2.2cqw var(--accent)) drop-shadow(0 0 4.5cqw color-mix(in srgb, var(--accent) 50%, transparent));
  transition: opacity .45s ease;
}
.poster.char-hover .person-glow { opacity: .85; }
.hotspot {
  position: absolute; width: calc(var(--hrx, var(--hr, 8%)) * 2); height: calc(var(--hry, var(--hr, 8%)) * 2);
  transform: translate(-50%, -50%); border-radius: 50%;
  border: none; background: transparent; padding: 0; cursor: pointer; z-index: 6;
}
.hs-dot {
  position: absolute; left: 50%; top: 50%; width: 1.3cqw; height: 1.3cqw;
  transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none;
  background: var(--accent); box-shadow: 0 0 1.4cqw color-mix(in srgb, var(--accent) 70%, transparent);
  opacity: .3; transition: opacity .25s, transform .25s;
}
.hotspot.hover .hs-dot, .hotspot.pinned .hs-dot { opacity: .95; transform: translate(-50%, -50%) scale(1.7); }
.hotspot[data-quiet="1"] .hs-glow, .hotspot[data-quiet="1"]::before, .hotspot[data-quiet="1"]::after { display: none; }
.hotspot[data-quiet="1"] { cursor: pointer; }
.hotspot-hint {
  position: absolute; left: 50%; bottom: 2.6cqw; transform: translateX(-50%); z-index: 9;
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .18em; text-transform: uppercase;
  color: var(--ink); background: color-mix(in srgb, var(--bg) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  backdrop-filter: blur(1cqw); padding: .7em 1.2em; border-radius: 99em;
  opacity: 0; animation: hintLife 9s ease 2s forwards; pointer-events: none;
}
@keyframes hintLife { 0% { opacity: 0; } 6% { opacity: .85; } 80% { opacity: .85; } 100% { opacity: 0; } }
.hs-glow {
  position: absolute; inset: -16%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(58% 58% at 50% 50%, color-mix(in srgb, var(--accent) 42%, transparent), transparent 72%);
  filter: blur(1.6cqw); opacity: 0; transform: scale(.7);
  transition: opacity .35s ease, transform .45s cubic-bezier(.2,.7,.2,1);
}
.hotspot.hover .hs-glow, .hotspot.pinned .hs-glow { opacity: 1; transform: scale(1.04); }
.poster.char-hover .image { filter: brightness(1.09) saturate(1.18); }
.hotspot::before {
  content: ""; position: absolute; inset: 0; border-radius: 50%;
  border: 1px solid rgba(${rgb.ink}, .55); opacity: 0;
  transition: opacity .25s, transform .25s;
}
.hotspot.hover::before, .hotspot:focus-visible::before {
  opacity: 1; animation: hotspotPulse 1.6s ease-out infinite;
}
.hotspot::after {
  content: attr(data-label); position: absolute; left: 50%; top: -2.4em; transform: translateX(-50%);
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .12em; white-space: nowrap;
  color: var(--ink); background: rgba(5,5,10,.85); border: 1px solid color-mix(in srgb, var(--ink) 30%, transparent);
  padding: .4em .8em; border-radius: .3em; opacity: 0; pointer-events: none;
  transition: opacity .2s;
}
.hotspot.hover::after { opacity: 1; }
.hotspot-popover {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -46%);
  z-index: 9; max-width: 72%; min-width: 42%;
  background: rgba(8,8,14,.94); border: 1px solid var(--accent); border-radius: .6em;
  padding: 3cqw 4cqw; display: flex; flex-direction: column; gap: 1.2cqw;
  font-family: ${fonts.body}; opacity: 0; pointer-events: none;
  transition: opacity .3s, transform .3s;
}
.hotspot-popover.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
.hp-title { font-family: ${fonts.display}; font-size: ${subtitleSize}cqw; color: var(--accent); letter-spacing: .15em; text-transform: uppercase; }
.hp-body { font-size: ${metaSize}cqw; color: var(--ink); line-height: 1.6; }
.hp-meta { font-size: ${xsSize}cqw; letter-spacing: .2em; color: var(--accent); text-transform: uppercase; }
.hp-sections { display: flex; flex-direction: column; gap: 1.4cqw; margin-top: 1cqw; }
.hp-sec h4 { font-family: ${fonts.display}; font-size: ${metaSize}cqw; color: var(--ink); letter-spacing: .1em; margin-bottom: .3em; text-transform: uppercase; }
.hp-sec p { font-size: ${metaSize}cqw; color: var(--muted); line-height: 1.55; }
.hp-close { position: absolute; top: 1cqw; right: 1.2cqw; background: none; border: none; color: var(--muted); font-size: ${metaSize}cqw; cursor: pointer; padding: .4em; }
.hp-close:hover { color: var(--ink); }
.hp-float {
  position: absolute; z-index: 9; max-width: 42%; min-width: 30%;
  background: rgba(8,8,14,.94); border: 1px solid var(--accent); border-left: .35em solid var(--accent);
  border-radius: .55em; padding: 2.2cqw 3cqw; font-family: ${fonts.body};
  display: flex; flex-direction: column; gap: 1cqw;
  opacity: 0; pointer-events: none; transform: translateY(.8cqw);
  transition: opacity .3s ease, transform .3s ease;
}
.hp-float.open { opacity: 1; transform: translateY(0); }
.style-switch {
  position: absolute; left: 3cqw; bottom: 3cqw; z-index: 10;
  display: flex; align-items: center; gap: 1.1cqw;
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink); background: color-mix(in srgb, var(--bg) 62%, transparent);
  border: 1px solid color-mix(in srgb, var(--ink) 30%, transparent);
  backdrop-filter: blur(1cqw); padding: .95em 1.5em; border-radius: 99em;
  cursor: pointer; user-select: none;
  opacity: 0; transform: translateY(1.2cqw);
  animation: fadeUp .8s ease 1.05s forwards;
  transition: background-color 1.6s ease, color 1.6s ease, border-color 1.6s ease;
}
.style-switch:hover { border-color: var(--accent); }
.ss-dot { width: .8cqw; height: .8cqw; border-radius: 50%; background: var(--accent); box-shadow: 0 0 1.5cqw color-mix(in srgb, var(--accent) 80%, transparent); }
.phase-chip {
  position: absolute; right: 3cqw; bottom: 3cqw; z-index: 10;
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .3em; text-transform: uppercase;
  color: var(--accent); background: color-mix(in srgb, var(--bg) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
  backdrop-filter: blur(1cqw); padding: .8em 1.4em; border-radius: 99em;
  pointer-events: none; opacity: 0; transform: translateY(1.2cqw);
  animation: fadeUp .8s ease 1.2s forwards;
  transition: background-color 1.6s ease, color 1.6s ease, border-color 1.6s ease;
}
${phaseSet ? `
.time-chip {
  position: absolute; right: 3cqw; bottom: 3cqw; z-index: 10;
  display: flex; align-items: center; gap: 1.1cqw;
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink); background: color-mix(in srgb, var(--bg) 62%, transparent);
  border: 1px solid color-mix(in srgb, var(--ink) 30%, transparent);
  backdrop-filter: blur(1cqw); padding: .95em 1.5em; border-radius: 99em;
  cursor: pointer; user-select: none;
  opacity: 0; transform: translateY(1.2cqw);
  animation: fadeUp .8s ease 1.05s forwards;
  transition: background-color 1.6s ease, color 1.6s ease, border-color 1.6s ease;
}
.time-chip:hover { border-color: var(--accent); }
.time-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: .3em; }
.tc-dot { width: .8cqw; height: .8cqw; border-radius: 50%; background: var(--accent); box-shadow: 0 0 1.5cqw color-mix(in srgb, var(--accent) 80%, transparent); }
.tc-dot.live { animation: tcPulse 2.2s ease-in-out infinite; }
.tc-hint { font-size: .7em; letter-spacing: .1em; color: var(--muted); }
@keyframes tcPulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
` : ''}
.weather-strip {
  display: flex; align-items: baseline; gap: 1.6cqw; flex-wrap: wrap;
  font-family: ${fonts.body}; font-size: ${metaSize}cqw; letter-spacing: .22em; text-transform: uppercase;
  color: var(--ink); margin-bottom: 2.4cqw;
  opacity: 0; transform: translateY(1.2cqw);
  animation: fadeUp .8s ease .85s forwards;
}
.w-item { font-weight: 800; }
.w-temp { color: var(--accent); font-family: ${fonts.display}; font-size: ${subtitleSize}cqw; font-weight: 900; }
.w-sep { color: var(--muted); opacity: .75; }
.weather-greeting {
  font-family: ${fonts.body}; font-size: ${xsSize}cqw; letter-spacing: .3em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 2.2cqw; cursor: pointer;
  border-bottom: 1px dashed transparent; transition: border-color .2s;
  opacity: 0; transform: translateY(1.2cqw);
  animation: fadeUp .8s ease .7s forwards;
}
.weather-greeting:hover { border-bottom-color: var(--accent); }
.stars {
  z-index: 2; opacity: var(--fx-stars, 0);
  background-image:
    radial-gradient(1.5cqw 1.5cqw at 18% 22%, rgba(255,255,255,.95), transparent 62%),
    radial-gradient(1cqw 1cqw at 64% 12%, rgba(255,255,255,.75), transparent 62%),
    radial-gradient(1.3cqw 1.3cqw at 83% 38%, rgba(255,255,255,.6), transparent 62%),
    radial-gradient(.9cqw .9cqw at 38% 52%, rgba(255,255,255,.55), transparent 62%),
    radial-gradient(1.1cqw 1.1cqw at 12% 68%, rgba(255,255,255,.5), transparent 62%),
    radial-gradient(.8cqw .8cqw at 74% 78%, rgba(255,255,255,.45), transparent 62%),
    radial-gradient(1.4cqw 1.4cqw at 48% 90%, rgba(255,255,255,.4), transparent 62%);
  background-size: 130cqw 130cqw; transition: opacity 1.6s ease;
}
.rain {
  z-index: 3; opacity: var(--fx-rain, 0);
  display: block; width: 100%; height: 100%;
  transition: opacity 1.6s ease;
}
.fog {
  z-index: 3; opacity: var(--fx-fog, 0); pointer-events: none;
  background:
    radial-gradient(62% 46% at 28% 38%, rgba(178,202,220,.30), transparent 72%),
    radial-gradient(54% 42% at 74% 62%, rgba(160,190,212,.24), transparent 72%),
    linear-gradient(to top, rgba(170,196,214,.16), transparent 38%);
  filter: blur(3cqw); mix-blend-mode: screen;
  transition: opacity 2.2s ease;
}
.scroll-more {
  max-width: 640px; width: 100%; margin-top: 48px; text-align: center;
  opacity: 0; transform: translateY(40px);
  transition: opacity .8s ease, transform .8s ease;
}
.scroll-more.in-view { opacity: 1; transform: none; }
.sm-heading {
  font-family: ${fonts.display}; font-size: 26px; letter-spacing: .22em;
  color: var(--ink); text-transform: uppercase; margin-bottom: 18px;
}
.sm-line {
  font-family: ${fonts.body}; font-size: 14px; letter-spacing: .18em;
  color: var(--muted); text-transform: uppercase; line-height: 2.2;
}
.sm-note { margin-top: 22px; font-size: 12px; letter-spacing: .1em; color: var(--accent); }
.content.mode-minimal { text-align: center; }
.content.mode-minimal .meta-top { justify-content: center; }
.content.mode-minimal .middle { align-items: center; }
.content.mode-minimal .meta-bottom { justify-content: center; }
.content.mode-hero { grid-template-areas: "top top" ". ." "mid bottom"; }
.content.mode-hero .middle { align-self: end; }
.content.mode-hero .meta-bottom { flex-direction: column; align-items: flex-end; gap: 2cqw; justify-content: center; }
.content.mode-hero .title { max-width: 100%; }
.content.mode-split { grid-template-areas: "top mid" ". mid" "bottom mid"; }
.content.mode-split .middle { align-self: center; align-items: flex-start; }
.content.mode-split .meta-top { flex-direction: column; align-items: flex-start; gap: 2cqw; }
.content.mode-split .meta-bottom { flex-direction: column; align-items: flex-start; gap: 2cqw; }
.content.mode-dynamic .middle { transform: rotate(-3deg); }
.content.mode-dynamic .title { transform: skewX(-6deg); }
.content.mode-dynamic .meta-bottom { justify-content: flex-end; }
${middleAlign ? `.content .middle { position: absolute; left: 7cqw; right: 7cqw; top: ${middleAlign}; }` : ''}
${titleBlend ? `.title { mix-blend-mode: ${titleBlend}; }` : ''}
${style?.typography?.titleNowrap ? `.title { white-space: nowrap; }` : ''}
@keyframes rise { to { opacity: 1; transform: translateY(0); } }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.18); } }
@keyframes glitch { 0% { transform: translate(0,0); clip-path: inset(0 0 0 0); } 20% { transform: translate(-2px,1px); clip-path: inset(10% 0 55% 0); } 40% { transform: translate(2px,-1px); clip-path: inset(60% 0 5% 0); } 60% { transform: translate(-1px,2px); clip-path: inset(30% 0 40% 0); } 80% { transform: translate(1px,-2px); clip-path: inset(5% 0 70% 0); } 100% { transform: translate(0,0); clip-path: inset(0 0 0 0); } }
@keyframes explode { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 100% { transform: translate(var(--ex,0), var(--ey,0)) rotate(var(--er,0)); opacity: 0; } }
@keyframes hotspotPulse { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.7); opacity: 0; } }
${phaseSet ? phaseSet.map((p, i) => `
.poster[data-phase="${i}"] {
  --bg: ${p.colors.bg ?? C.bg}; --surface: ${p.colors.surface ?? C.surface};
  --ink: ${p.colors.ink ?? C.ink}; --accent: ${p.colors.accent ?? C.accent};
  --accent2: ${p.colors.accent2 ?? C.accent2}; --muted: ${p.colors.muted ?? C.muted};
  --grain: ${p.fx.grain ?? 0.35}; --glow: ${p.fx.glow ?? 1}; --blur: ${p.fx.blur ?? 0};
  --contrast: ${p.fx.contrast ?? 1}; --brightness: ${p.fx.brightness ?? 1};
  --saturate: ${p.fx.saturate ?? 1}; --hue: ${p.fx.hue ?? 0}deg; --shadow: ${p.fx.shadow ?? 0.55};
  --fx-rain: ${p.fx.rain ? 1 : 0}; --fx-rain-density: ${p.fx.rainDensity ?? 1}; --fx-fog: ${p.fx.fog ? p.fx.fog : 0}; --fx-stars: ${p.fx.stars ? 1 : 0};
  --glow-color: color-mix(in srgb, ${p.colors.accent ?? C.accent} ${Math.round(30 * (p.fx.glow ?? 1))}%, transparent);
}`).join('\n') : ''}
@media (prefers-reduced-motion: reduce) {
  .title .ch, .meta-top, .subtitle, .location, .meta-bottom {
    animation: none !important; opacity: 1 !important; transform: none !important;
  }
  .glow { animation: none !important; }
  [data-depth] { transition: none !important; }
  .scroll-more { transition: none !important; }
}`;

  // ---- HTML ----
  const particlesHtml = particlesCfg
    ? '<canvas class="layer particles" id="particles" aria-hidden="true"></canvas>'
    : '';
  const ballHtml = style?.imagery?.ball
    ? `<div class="layer ball" data-depth="${Number(style?.imagery?.ball?.depth ?? 0.35)}"${ballRepel ? ` data-repel="${ballRepel}"` : ''}></div>`
    : '';
  const imageCfg = style?.imagery?.image;
  const graphicsList = Array.isArray(style?.graphics) ? style.graphics : [];
  const graphicsHtml = graphicsList.length ? `<div class="layer graphics">${buildGraphicsSvg(graphicsList)}</div>` : '';
  const mat = style?.materiality || null;
  const MAT_CLASS = MEDIUM_CLASS;
  const matClass = mat && mat.medium ? (MAT_CLASS[mat.medium] || String(mat.medium)) : null;
  const materialityHtml = mat && matClass ? `<div class="layer materiality materiality-${matClass}" style="--imp:${Number(mat.imperfection) ?? 0.5};--grain:${Number(mat.grain) ?? 0.5}"></div>` : '';
  const overlayHtml = imageCfg?.overlay
    ? `<div class="layer img-overlay" aria-hidden="true">${imageCfg.overlay}</div>`
    : '';
  const imageHtml = imageCfg?.src
    ? `<div class="layer image" style="background-image:url('${imageCfg.src}')"${imageCfg.zoom ? ' data-zoom="1"' : ''}></div>${imageCfg.duotone ? '<div class="layer image-duotone"></div>' : ''}${imageCfg.scrim ? '<div class="layer image-scrim"></div>' : ''}`
    : '';
  const personGlowHtml = imageCfg?.silhouette
    ? `<div class="layer person-glow" style="background-image:url('${imageCfg.silhouette}')"></div>`
    : '';
  const hotspots = Array.isArray(content.hotspots) ? content.hotspots : [];
  const hotspotsHtml = hotspots.length
    ? hotspots.map((h) => {
        const rx = h.rx ?? h.r ?? 8;
        const ry = h.ry ?? h.r ?? 8;
        const mode = h.mode === 'hover' ? 'hover' : 'click';
        return `<button class="hotspot" type="button" data-mode="${mode}" style="left:${Number(h.x) || 50}%;top:${Number(h.y) || 50}%;--hrx:${rx}%;--hry:${ry}%" data-label="${escapeHtml(h.label || '')}" data-meta="${escapeHtml(h.meta || '')}" data-detail="${escapeHtml(h.detail || '')}" data-sections="${escapeHtml(JSON.stringify(h.sections || []))}"${h.interaction ? ` data-interaction="${escapeHtml(h.interaction)}"` : ''}${h.action ? ` data-action="${escapeHtml(JSON.stringify(h.action))}"` : ''}${h.mask ? ` data-mask="${escapeHtml(h.mask)}"` : ''}${h.quiet ? ' data-quiet="1"' : ''}${h.dot === false ? '' : '<span class="hs-dot" aria-hidden="true"></span>'}<span class="hs-glow" aria-hidden="true"></span></button>`;
      }).join('\n    ')
    : '';
  const anyHover = hotspots.some((h) => h.mode === 'hover');
  const hintHtml = hotspots.length
    ? `<div class="hotspot-hint" id="hotspotHint" aria-hidden="true">${escapeHtml(String(meta.hint ?? (anyHover ? 'HOVER / CLICK' : 'CLICK') + ' TO EXPLORE'))}</div>`
    : '';
  const floatHtml = hotspots.some((h) => h.mode === 'hover')
    ? `<div class="hp-float" id="hpFloat"><span class="hp-meta" id="hfMeta"></span><span class="hp-title" id="hfTitle"></span><span class="hp-body" id="hfBody"></span><div class="hp-sections" id="hfSections"></div></div>`
    : '';
  const popoverHtml = hotspots.length
    ? `<div class="hotspot-popover" id="hotspotPopover"><span class="hp-meta" id="hpMeta"></span><span class="hp-title" id="hpTitle"></span><span class="hp-body" id="hpBody"></span><div class="hp-sections" id="hpSections"></div><button class="hp-close" id="hpClose" type="button" aria-label="close">&#10005;</button></div>`
    : '';
  const tiltAttr = tiltMax > 0 ? ` data-tilt="${tiltMax}"` : '';
  const detailsHtml = lineup || time || note
    ? `<aside class="details" id="details" aria-hidden="true"><div class="details-inner">${lineup}${time}${note}</div></aside>`
    : '';
  const moreHtml = scrollEnabled
    ? `<section class="scroll-more" id="scrollMore">
  <h2 class="sm-heading">${escapeHtml(meta.moreHeading ?? 'ABOUT THE NIGHT')}</h2>
  ${[meta.lineup, meta.time, location].filter(Boolean).map((l) => `<p class="sm-line">${escapeHtml(l)}</p>`).join('\n  ')}
  ${note ? `<p class="sm-note">${escapeHtml(note)}</p>` : ''}
</section>`
    : '';

  const bodyClass = scrollEnabled ? ' class="scrollable"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Poster</title>
<style>${css}</style>
</head>
<body${bodyClass}>
<main class="stage">
  <article class="poster${motionClass}" id="poster"${tiltAttr}>
    <div class="layer bg" data-depth="${bgDepth}"></div>
    ${imageHtml}
    ${overlayHtml}
    ${personGlowHtml}
    ${phaseSet ? '<div class="layer stars" aria-hidden="true"></div><canvas class="layer rain" id="rainCanvas" aria-hidden="true"></canvas><div class="layer fog" aria-hidden="true"></div>' : ''}
    ${materialityHtml}
    ${graphicsHtml}
    <div class="layer grid-lines" style="--grid-vis:${gridVisible}"></div>
    ${gridType === 'broken' || breakGrid > 0 ? '<div class="layer grid-lines grid-broken" style="--grid-vis:' + Math.min(0.6, 0.15 + breakGrid * 0.45) + '"></div>' : ''}
    ${particlesHtml}
    ${ballHtml}
    <div class="layer glow"></div>
    <div class="content mode-${layoutMode}">
      <header class="meta-top">
        <span class="brand">${escapeHtml(brand)}</span>
        <span class="tag">${escapeHtml(tag)}</span>
      </header>
      <section class="middle">
        ${weatherCfg ? `<div class="weather-greeting" id="wGreeting"></div><div class="weather-strip" id="weatherStrip"><span class="w-item" id="wTime"></span><span class="w-sep">\u00B7</span><span class="w-item" id="wCity">${escapeHtml(weatherCfg.defaultCity)}</span><span class="w-sep">\u00B7</span><span class="w-item w-temp" id="wTemp">--\u00B0</span><span class="w-sep">\u00B7</span><span class="w-item" id="wCond">SYNCING\u2026</span></div>` : ''}
        <h1 class="title" id="title" data-effect="${titleEffect}"${explodeEnabled ? ' data-click="explode"' : ''}${titleRotate ? ' data-rotate="' + titleRotate + '"' : ''}${titleVertical ? ' data-vertical="1"' : ''}${titleCrop > 0 ? ' data-crop="' + titleCrop + '"' : ''}${titleOverlap ? ' data-overlap="1"' : ''} style="font-size:${titleFontSize}cqw">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${location ? `<p class="location">${escapeHtml(location)}</p>` : ''}
      </section>
      ${(date || price || cta) ? `<footer class="meta-bottom">
        <div class="meta-left">
          ${date ? `<button class="date" id="date" type="button">${escapeHtml(date)}</button>` : ''}
          ${price ? `<span class="price">${escapeHtml(price)}</span>` : ''}
        </div>
        ${cta ? `<button class="cta" id="cta" type="button">${escapeHtml(cta)}</button>` : ''}
      </footer>` : ''}
    </div>
    ${detailsHtml}
    ${timePhases ? `<div class="time-chip" id="timeChip" role="button" tabindex="0" aria-label="cycle time of day"><span class="tc-dot" id="tcDot"></span><span class="tc-text" id="tcText"></span><span class="tc-hint">CLICK CYCLE \u00B7 DBL LIVE</span></div>` : weatherCfg ? `<div class="time-chip" id="timeChip" role="button" tabindex="0" aria-label="refresh weather"><span class="tc-dot" id="tcDot"></span><span class="tc-text" id="tcText">LIVE WEATHER</span></div>` : ''}
    ${switchCfg && !hideStyleSwitch ? `<button class="style-switch" id="styleSwitch" type="button"><span class="ss-dot" aria-hidden="true"></span><span class="ss-text" id="ssText">STYLE \u00B7 ${escapeHtml(switchCfg[0].name || '1')}</span></button>` : ''}
    ${switchCfg && hideStyleSwitch ? `<div class="phase-chip" id="phaseChip" aria-hidden="true"></div>` : ''}
    ${cursorRingEnabled ? '<div class="cursor-ring" id="cursorRing"></div>' : ''}
    ${hotspotsHtml}
    ${popoverHtml}
    ${floatHtml}
    ${hintHtml}
    ${spotlightHtml}
    <div class="cursor-light" id="cursorLight"></div>
  </article>
</main>
${moreHtml}
<script>${js}</script>
</body>
</html>`;
}

export default { render };