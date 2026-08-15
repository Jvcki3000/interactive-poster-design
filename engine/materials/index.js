// materials — 素材智能（Material Intelligence）：类型/角色推断/处理映射/进 DNA
// 原则：不要"把图贴上去"，要"用素材设计"。源图默认保留。

export const MATERIAL_TYPES = ['image', 'logo', 'graphic', 'texture', 'asset'];
export const ROLES = ['hero', 'secondary', 'background', 'texture', 'collage', 'logo', 'information', 'decorative'];
export const ROLE_LABEL = { hero: 'Hero', secondary: '次要', background: '背景', texture: '纹理', collage: '拼贴', logo: 'Logo', information: '信息', decorative: '设计元素' };
export const TREATMENTS = ['original', 'crop', 'cutout', 'duotone', 'monochrome', 'threshold', 'halftone', 'photocopy', 'collage', 'mask'];

/** 从分析结果推断角色（人物→hero、有文字/透明→logo、低复杂均匀→texture/background、小尺寸→decorative） */
export function inferRole(analysis = {}) {
  const a = analysis;
  if (a.logo_presence || a.text_presence) return 'logo';
  if (a.human_presence || a.face_presence) return 'hero';
  if (a.subject_type === 'product' || a.visual_weight >= 0.7) return 'hero';
  if (a.background_complexity <= 0.3 && a.texture >= 0.5) return 'texture';
  if (a.background_complexity <= 0.35) return 'background';
  if (a.width && a.height && a.width < 300 && a.height < 300) return 'decorative';
  return 'secondary';
}

/** 角色 → 建议处理 */
export function treatmentsFor(role) {
  const map = {
    hero: ['original', 'cutout', 'duotone', 'crop'],
    secondary: ['original', 'duotone', 'monochrome'],
    background: ['blur', 'duotone', 'monochrome', 'photocopy'],
    texture: ['photocopy', 'halftone', 'monochrome'],
    collage: ['cutout', 'mask', 'threshold'],
    logo: ['original', 'monochrome'],
    information: ['original', 'duotone'],
    decorative: ['cutout', 'threshold', 'halftone'],
  };
  return map[role] || ['original'];
}

/** 处理 → spec.imagery 选项（渲染器支持的部分） */
export const TREATMENT_SPEC = {
  original: {},
  crop: { zoom: true },
  cutout: { silhouette: true },
  duotone: { duotone: true },
  monochrome: { monochrome: true },
  threshold: { threshold: true, contrast: 1.3 },
  halftone: { grain: true, contrast: 1.15 },
  photocopy: { grain: true, contrast: 1.3 },
  collage: { silhouette: true },
  mask: { silhouette: true },
};

/** 角色/层级 → 放置 */
const ROLE_PLACEMENT = {
  hero: { position: 'full_bleed', scale: 'hero', zoom: true },
  secondary: { position: 'center', scale: 'large' },
  background: { position: 'full_bleed', scale: 'hero' },
  texture: { position: 'full_bleed', scale: 'hero' },
  logo: { position: 'corner', scale: 'small' },
  collage: { position: 'multiple', scale: 'medium' },
  decorative: { position: 'corner', scale: 'small' },
  information: { position: 'corner', scale: 'medium' },
};

/** 素材列表 → spec 增量（imagery.image + 可选 logo 层） */
export function materialsToSpec(materials = []) {
  const out = { imagery: {} };
  const hero = materials.find((m) => m.role === 'hero' || m.role === 'background' || m.role === 'secondary') || materials[0];
  if (hero && hero.source_url) {
    const tr = TREATMENT_SPEC[hero.treatment] || {};
    const pl = ROLE_PLACEMENT[hero.role] || {};
    out.imagery.image = { src: hero.source_url, ...tr, ...pl, hierarchy: hero.hierarchy ?? 0.8 };
  }
  const logos = materials.filter((m) => m.role === 'logo');
  if (logos.length) {
    out.imagery.logo = logos[0].source_url;
    out.imagery.logoPosition = ROLE_PLACEMENT.logo.position;
  }
  const textures = materials.filter((m) => m.role === 'texture');
  if (textures.length && hero && hero.source_url !== textures[0].source_url) {
    out.imagery.textureSrc = textures[0].source_url;
  }
  return out;
}

/** 自然语言素材指令 → { role/treatment/hierarchy } delta（供 refine 用） */
export function materialDelta(text = '') {
  const t = String(text || '');
  const delta = {};
  if (/(双色调|duotone|two.?tone)/i.test(t)) delta.treatment = 'duotone';
  else if (/(黑白|monochrome|grayscale|黑白)/i.test(t)) delta.treatment = 'monochrome';
  else if (/(抠图|cutout|去背景|透明底)/i.test(t)) delta.treatment = 'cutout';
  else if (/(复印|photocopy|xerox)/i.test(t)) delta.treatment = 'photocopy';
  else if (/(半色调|halftone|网点)/i.test(t)) delta.treatment = 'halftone';
  else if (/(裁切|crop|裁)/i.test(t)) delta.treatment = 'crop';
  else if (/(做背景|background|铺底)/i.test(t)) delta.role = 'background';
  else if (/(当Logo|logo)/i.test(t)) delta.role = 'logo';
  else if (/(做纹理|texture|纹理)/i.test(t)) delta.role = 'texture';
  else if (/(做主角|hero|主视觉)/i.test(t)) delta.role = 'hero';
  else if (/(更小|小一点|缩小|放小)/i.test(t)) delta.hierarchy = -0.2;
  else if (/(更大|放大|更突出|突出)/i.test(t)) delta.hierarchy = 0.2;
  return { delta, note: Object.keys(delta).length ? '已按素材指令调整（角色/处理/层级）' : '未识别素材指令，保持原状' };
}

export default { inferRole, treatmentsFor, materialsToSpec, materialDelta, ROLE_LABEL, ROLES, TREATMENTS };
