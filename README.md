# poster-engine

> Skill 是"大脑"，Engine 是"身体"。
> 本仓库是 **Interactive Poster Skill** 的可复用运行核心：接收 **Design Spec**，输出可交互的 HTML/SVG/CSS/JS 海报。

## 架构

```
poster-engine/
├── renderer/          # 渲染核心：Design Spec → HTML ✅ V0.3
├── typography/        # 排版：字号阶梯 / cqw 换算 ✅
├── layout/            # 版式：栅格 / Z 轴分层 ✅
├── critic/            # Design Critic 自检评分（V0.3）✅
├── presets/           # 风格预设 swiss/editorial/minimal/experimental/cyberpunk（V0.3）✅
├── palette/           # 参考图色板 → 角色色（V0.3）✅
├── animation/         # 动画系统（运行时由 renderer 内联）
├── interaction/       # 交互系统（运行时由 renderer 内联）
├── assets/            # 素材（reference/ 参考图）
├── schema/            # 契约：Design Spec 的 JSON Schema ✅
├── scripts/           # render / serve / iterate / palette.py ✅
├── examples/          # event-poster ✅ / music-poster ✅ / brand-poster（占位）
└── tests/             # node --test ✅ 22 个
```

## 快速开始

```bash
npm test                                          # 22 个单元测试

# 渲染（含 Design Critic 自检）
node scripts/render.js examples/event-poster/spec.json --out out/event-poster --critic

# 多风格：同一内容套不同预设
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/cyberpunk --preset cyberpunk
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/editorial --preset editorial

# 参考图取色 → 海报配色
python scripts/palette.py assets/reference/ref.jpg --colors 5 --out assets/reference/ref-palette.json
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/from-reference --palette assets/reference/ref-palette.json

# 自动迭代：render → critic → 自动修复 → 再渲染
node scripts/iterate.js examples/bad-demo-spec.json --max 5 --out out/iterated-bad

# 预览（自动打印真实端口，目录列表可点击）
node scripts/serve.js
```

## 已实现能力

### V0.1
- Text Reveal / Mouse Parallax / Cursor Light / Hover Distortion / Click Expand / Magnetic CTA / Responsive

### V0.2
- Particles（Canvas 粒子）/ 3D Tilt / Scroll Reveal

### V0.3
- **Design Critic 自检评分**：7+1 维度打分（hierarchy/typography/composition/contrast/balance/brandConsistency/readability + originality 人工项），加权总分 ≥7 为 PASS，输出改进建议
- **Style Presets**：5 套风格预设（swiss/editorial/minimal/experimental/cyberpunk），同一内容一键换风格；spec 显式值优先生效
- **Reference Image**：`scripts/palette.py`（PIL）从参考图提取主色板 → `--palette` 映射成 bg/ink/accent 等角色色
- **自动迭代**：`scripts/iterate.js` 循环 render→critic→自动修复（对比度/标题溢出/字号/边距）直到 PASS
- **图形层**（`style.imagery.ball`）：CSS 绘制的可视差图形元素（如篮球），独立深度叠加 3D 视差
- **排版模式**（`style.layout.mode`）：classic / hero / split / minimal / dynamic 五种构图
- **Design Director**（`scripts/directions.js`）：一次生成 6 个不同设计方向（色彩策略 × 排版 × 字体）
- **图片层 + 热点**（`style.imagery.image` / `content.hotspots`）：照片上的无按钮交互（悬停标签、点击信息卡）
- **Anti-AI Design Critic**：AI-ness 评分（0-100）+ <25 门禁，自动迭代降 AI 味
- **Color Strategy**（`color-strategy`）：12 种色彩策略生成器，自动修正对比度

## 开发阶段

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| V0.1 | Static → Interactive 基础能力 | ✅ 完成 |
| V0.2 | + Particles / 3D Tilt / Scroll Reveal | ✅ 完成 |
| V0.3 | + Design Critic / Style Presets / Reference Image / 自动迭代 | ✅ 完成 |
| V0.4 | + Multi-page / Audio reactive / WebGL / Generative graphics | 待开发 |

## 约定

- ES Modules（`"type": "module"`），测试用内置 `node:test`
- 各模块通过 Design Spec 沟通，仅 `renderer` 负责组装
- 输出零依赖、可直接双击打开的 `index.html`