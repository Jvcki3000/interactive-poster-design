# Mutation

> 受控变异引擎（TASK-005/024）。

- 模块：engine/design-dna/dna-presets.js（mutateDna）。
- 输入：Preset + 用户参数（color/orientation/density/movements/interaction/seed）。
- 机制：
  1. 先按 seed 做**确定性数值抖动**（0..1 浮点字段 ±6%）；
  2. **受控结构变异**：~30% 换构图结构、~25% 换网格/字体/配色、~20% 开关动效交互——同预设+不同 seed 会产生不同布局；
  3. 显式用户参数最后覆盖（用户指定优先）。
- 验收：同一 brief ×10 → 布局至少 3 种、Diversity ≥0.70（tests/diversity/diversity.test.js）。
