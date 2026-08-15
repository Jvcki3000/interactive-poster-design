# Design System

> 设计系统说明（TASK-024）。

## Design Vocabulary（schema/design-vocabulary.md）

19 个维度：composition / grid / visual_hierarchy / typography / color / imagery / graphic_language / texture / depth / motion / interaction / density / negative_space / materiality / branding / design_tension / constraints / era / design_movements。

数值约定：0..1（0=无，1=最大）；tension 轴 0=前者，1=后者。

## 渲染引擎能力

- **Grid**：engine/layout + renderer 支持 4/6/8/12/baseline/modular/broken/custom + breakGrid。
- **Typography-as-Image**：titleVertical / titleRotate / titleCrop / titleOverlap / titleOversize。
- **Color**：engine/color/strategy.js（21 策略）+ palette.js + anti-ai.js（Color Guard 自动换色）。
- **Graphic**：engine/graphics（grid/number/barcode/coordinate/annotation/diagram，decorative 默认不渲染）。
- **Texture**：engine/texture（paper/xerox/risograph/screen_print/film/newspaper/magazine）。
- **Motion**：engine/motion + animation.motionStyle（8 种独立动效）。
- **Interaction**：engine/interaction + interactions.*（spotlight/morph/expand/…）。
