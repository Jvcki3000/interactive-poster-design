// imagery — 图像处理层（P9 配套）：把 DNA imagery 字段映射成渲染 spec.imagery 选项
// 说明：主角/人物图走 protagonist 流程（scripts/protagonist.js + python 分割）；这里处理风格化处理项。

const TREATMENT_MAP = {
  duotone: { duotone: true },
  tritone: { duotone: true },
  grain: { grain: true },
  threshold: { threshold: true },
  xerox: { grain: true, contrast: 1.25 },
  risograph: { duotone: true, grain: true },
  halftone: { grain: true },
  raw: {},
  posterize: { posterize: true },
  silhouette: { silhouette: true },
  cutout: { silhouette: true },
};

/** DNA imagery → spec.imagery（只生成有实际渲染语义的字段） */
export function imageryToSpec(imagery = {}) {
  const out = {};
  const t = TREATMENT_MAP[imagery.treatment] || {};
  Object.assign(out, t);
  if (imagery.color_treatment === 'duotone') out.duotone = true;
  if (imagery.color_treatment === 'monochrome') out.monochrome = true;
  if (imagery.scale === 'hero') out.zoom = true;
  return out;
}

export default { imageryToSpec, TREATMENT_MAP };
