/**
 * critic — Design Critic（自检评分）
 *
 * 对 Design Spec（+ 渲染出的 HTML）做多维度打分，输出 0–10 分与改进建议。
 * 用于 V0.3 的「设计循环」：render → critic → pass / improve → regenerate。
 *
 * 维度：hierarchy / typography / composition / contrast / balance /
 *       brandConsistency / readability / originality（后两者部分需人工/AI）。
 */
import { buildTypeScale, pxToCqw } from '../typography/index.js';
import { detectSpecAi } from '../color/anti-ai.js';

const DEFAULT_COLORS = {
  bg: '#0a0a12',
  surface: '#15152a',
  ink: '#f4f2ff',
  accent: '#00e5ff',
  accent2: '#ff2bd6',
  muted: '#8a87a8',
};

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return { r: 255, g: 255, b: 255 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}



/**
 * @param {object} spec Design Spec
 * @param {string} [html] 渲染输出（可选，用于完整性检查）
 * @returns {{scores: object, overall: number, pass: boolean, suggestions: string[]}}
 */
export function evaluate(spec, html = '') {
  if (!spec || typeof spec !== 'object') throw new Error('spec 必须是对象');
  const { canvas = {}, content = {}, style = {} } = spec;
  const width = Number(canvas.width) || 1200;
  const C = { ...DEFAULT_COLORS, ...(style.colors ?? {}) };
  const ts = buildTypeScale({
    ratio: style?.typography?.scaleRatio ?? 1.25,
    base: style?.typography?.baseSize ?? 16,
  });
  const titleFactor = Number(style?.typography?.titleScale ?? 2.2);
  const titleCqw = pxToCqw(ts.display * titleFactor, width);
  const subCqw = pxToCqw(ts.md, width);
  const metaCqw = pxToCqw(ts.sm, width);

  const scores = {};
  const suggestions = [];

  // ---- hierarchy 层次 ----
  {
    const issues = [];
    const ratio = titleCqw / Math.max(subCqw, 0.1);
    let s = ratio >= 2.2 ? 10 : ratio >= 1.8 ? 8 : ratio >= 1.5 ? 6 : 4;
    if (s <= 6) issues.push(`标题/副标题字号差异不足（${ratio.toFixed(2)}:1）`);
    const levels = [content.title, content.subtitle, content.location, content.date || content.cta].filter(Boolean).length;
    if (levels < 3) {
      s = Math.max(4, s - 2);
      issues.push('内容层级少于 3 层（title/subtitle/location/date/cta）');
    }
    scores.hierarchy = { score: s, issues };
  }

  // ---- typography 排版 ----
  {
    const issues = [];
    let s = 10;
    if (!style?.typography?.fontFamily) {
      s -= 3;
      issues.push('缺少 typography.fontFamily');
    }
    const ratio = style?.typography?.scaleRatio ?? 1.25;
    if (ratio < 1.1 || ratio > 1.5) {
      s -= 2;
      issues.push(`scaleRatio ${ratio} 超出常规范围 1.1–1.5`);
    }
    const estW = String(content.title || '').length * 0.62 * ts.display * titleFactor;
    if (estW > width * 0.98) {
      s -= 3;
      issues.push(`标题估算宽度 ${Math.round(estW)}px 超出画布 ${width}px`);
    }
    scores.typography = { score: Math.max(1, s), issues };
  }

  // ---- composition 构成 ----
  {
    const issues = [];
    let s = 10;
    if (!(content.date || content.location || content.cta)) {
      s -= 4;
      issues.push('缺少日期/地点/CTA 等关键信息');
    }
    if (!content.subtitle) {
      s -= 2;
      issues.push('缺少副标题');
    }
    const margin = Number(style?.layout?.margin ?? 64);
    if (margin < 24) {
      s -= 2;
      issues.push(`边距过小（${margin}px）`);
    }
    const required = ['id="poster"', 'id="title"'];
    if (Array.isArray(content.hotspots) && content.hotspots.length) required.push('id="hotspotPopover"');
    const complete = required.every((m) => html.includes(m));
    if (html && !complete) {
      s -= 3;
      issues.push('渲染输出缺少关键结构（' + required.join('/') + '）');
    }
    scores.composition = { score: Math.max(1, s), issues };
  }

  // ---- contrast 对比度 ----
  {
    const issues = [];
    let s = 10;
    const inkBg = contrast(C.ink, C.bg);
    if (inkBg < 4.5) {
      s -= 4;
      issues.push(`正文/背景对比度不足（${inkBg.toFixed(2)}:1，需 ≥4.5）`);
    } else if (inkBg < 7) {
      s -= 1;
    }
    const accentBg = contrast(C.accent, C.bg);
    if (accentBg < 3) {
      s -= 3;
      issues.push(`强调色/背景对比度不足（${accentBg.toFixed(2)}:1，需 ≥3）`);
    }
    const accentDark = contrast(C.accent, '#05050a');
    if (accentDark < 3) {
      s -= 2;
      issues.push('强调色按钮上的深色文字对比不足');
    }
    scores.contrast = { score: Math.max(1, s), issues };
  }

  // ---- balance 平衡 ----
  {
    const issues = [];
    let s = 8;
    const top = Boolean(content.metadata?.brand || content.metadata?.tag);
    const bottom = Boolean(content.date || content.cta || content.price || (Array.isArray(content.hotspots) && content.hotspots.length));
    if (!top) {
      s -= 2;
      issues.push('顶部缺少 brand/tag 元素');
    }
    if (!bottom) {
      s -= 2;
      issues.push('底部缺少 date/cta 元素');
    }
    if (titleCqw > 12) {
      s -= 2;
      issues.push(`标题过大（${titleCqw.toFixed(1)}cqw），可能挤压版面`);
    }
    scores.balance = { score: Math.max(1, s), issues };
  }

  // ---- brandConsistency 品牌一致性 ----
  {
    const issues = [];
    let s = 10;
    const distinct = new Set(Object.values(C).map((c) => String(c).toLowerCase())).size;
    if (distinct > 6) {
      s -= 3;
      issues.push(`颜色过多（${distinct} 种），建议 ≤6`);
    }
    if (distinct < 3) {
      s -= 2;
      issues.push('颜色过少，视觉单调');
    }
    scores.brandConsistency = { score: Math.max(1, s), issues };
  }

  // ---- readability 可读性 ----
  {
    const issues = [];
    const metaPx = (metaCqw * width) / 100;
    let s = 10;
    if (metaPx < 12) {
      s -= 4;
      issues.push(`元信息字号过小（${metaPx.toFixed(1)}px）`);
    } else if (metaPx < 14) {
      s -= 2;
    }
    scores.readability = { score: Math.max(1, s), issues };
  }

  // ---- originality 原创性（需人工/AI 判断）----
  {
    scores.originality = {
      score: 7,
      issues: ['原创性需由人工或 AI 主观判断（引擎不自动评分）'],
    };
  }

  // ---- color 色彩（TASK-014）----
  {
    const issues = [];
    let s = 10;
    const distinct = new Set(Object.values(C).map((c) => String(c).toLowerCase())).size;
    if (distinct > 6) { s -= 3; issues.push('颜色过多（' + distinct + ' 种，建议 ≤6）'); }
    else if (distinct < 3) { s -= 2; issues.push('颜色过少，视觉单调'); }
    if (contrast(C.accent, C.bg) < 3) { s -= 2; issues.push('强调色/背景对比不足'); }
    scores.color = { score: Math.max(1, s), issues };
  }

  // ---- materiality 材质（TASK-014）----
  {
    const issues = [];
    let s = 8;
    const mat = style?.materiality?.medium;
    if (mat) { s += 1; if (mat === 'digital') issues.push('材质为 digital，物理感弱'); }
    else issues.push('未声明 materiality（默认 digital）');
    scores.materiality = { score: Math.max(1, s), issues };
  }

  // ---- interaction 交互（TASK-014）----
  {
    const issues = [];
    let s = 8;
    const iCount = Object.keys(spec.interactions || {}).length;
    if (iCount === 0) { issues.push('无交互（纯静态可接受）'); s -= 1; }
    else if (iCount > 4) { s -= 2; issues.push('交互/动效堆叠过多（' + iCount + ' 类）'); }
    if (spec.animation?.motionStyle) s += 1;
    scores.interaction = { score: Math.max(1, s), issues };
  }

  // ---- material 素材整合（TASK-024 素材智能）----
  if (style?.imagery?.image?.src) {
    const img = style.imagery.image;
    scores.materialUsage = { score: img.src ? 8 : 4, issues: [img.src ? '素材被用作主图' : '素材缺失'] };
    scores.materialHierarchy = { score: img.hierarchy >= 0.6 ? 9 : img.hierarchy >= 0.3 ? 7 : 5, issues: [img.hierarchy != null ? '素材层级 ' + img.hierarchy : '素材层级未指定'] };
    scores.sourceFidelity = { score: 9, issues: ['源图默认保留（未重新生成）'] };
    const treatmentCount = [img.duotone, img.grain, img.silhouette, img.monochrome, img.threshold].filter(Boolean).length;
    scores.materialIntegration = { score: treatmentCount ? 8 : 6, issues: [treatmentCount ? '素材有 ' + treatmentCount + ' 种处理（非纯贴图）' : '素材仅原样放置（建议加 duotone/grain 处理）'] };
  }

  const weights = {
    hierarchy: 0.18,
    typography: 0.12,
    composition: 0.12,
    contrast: 0.14,
    color: 0.12,
    balance: 0.07,
    brandConsistency: 0.07,
    readability: 0.06,
    materiality: 0.06,
    interaction: 0.06,
    ...(scores.materialUsage ? { materialUsage: 0.04, materialHierarchy: 0.03, sourceFidelity: 0.03, materialIntegration: 0.03 } : {}),
  };
  let overall = 0, wSum = 0;
  for (const [k, w] of Object.entries(weights)) { if (scores[k]) { overall += scores[k].score * w; wSum += w; } }
  if (wSum > 0) overall = overall / wSum;
  overall = Math.round(overall * 10) / 10;

  for (const dim of Object.values(scores)) suggestions.push(...dim.issues);

  const aiNess = detectSpecAi(spec);

  return {
    scores,
    overall,
    aiNess,
    pass: overall >= 7 && aiNess.pass,
    suggestions: [...new Set(suggestions)],
    ai_ness_score: aiNess.score,
    issues: [...new Set(suggestions)],
    recommendations: [...new Set(suggestions)],
  };
}

export default { evaluate };