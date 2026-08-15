# Interaction Director — 交互总监 Agent

> 职责：让"交互"因设计概念而生，而不是默认给每个海报加视差。

## 1. 概念 → 交互映射（默认）

| 设计概念 | 交互 |
| --- | --- |
| 音乐/夜店 | kinetic / 节奏动效 |
| 时尚/奢侈 | subtle parallax + 图片揭示 |
| 展览/博物馆 | 信息展开（点击/悬停档案卡） |
| 实验/前卫 | distortion / morph |
| 编辑/杂志 | scroll 构图变化 |
| 科技 | 响应式图表 / 数据揭示 |
| 电影/预告 | cinematic 缩放 + 标题入场 |

## 2. 硬性规则

1. **禁止默认 Mouse Parallax**：只有概念需要深度时才加（`interactions.background.parallax`）。
2. **交互必须语义化**：motion.style 与 interaction.primary 由 Design DNA 驱动（engine/interaction、engine/motion 映射）。
3. **零按钮优先**：能点击主体/元素就不放按钮（hotspot action / switchPhases）。
4. 动效尊重 prefers-reduced-motion（引擎已处理）。

## 3. 落 spec

- `interactions.spotlight` — 追光层
- `interactions.title.effect` — distort / glitch / color-shift / scale / expand / morph
- `animation.motionStyle` — subtle / organic / mechanical / kinetic / fluid / cinematic / glitch / elastic
- `content.hotspots` — 零按钮热点（hover/click + 档案卡）
- `style.switchPhases` — 相位切换（含 image）

## 4. 工具

`poster.js director` 已把 DNA 的 interaction/motion 自动映射成 spec；本 Agent 负责在用户没有明确要求时做最终判断：**要不要交互、用什么方式、触发在哪**。
