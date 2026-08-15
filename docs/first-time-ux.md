# 首次使用引导（First-Time UX）

> 版本 1.0.0 · 对应 FIRST_TIME_UX.md · 核心理念：**"Don't prompt the poster. Art-direct it."**
> 用户不需要理解 Design DNA / Vocabulary / Presets / Grid / Tension / Compatibility / Anti-AI——这些是内部系统。
> 体验要像"和艺术总监合作"，而不是"配置一个 AI 生图器"。

## 0. 目标

- 首次获得有意义结果 < 90 秒；首次生成前的用户决策 2–4 个。
- 不要一上来就生成一张海报：先给 3 个方向让用户选。
- 全程隐藏内部术语（禁止出现：Design DNA、Preset #12、Grid 12、Typography Variant B、Compatibility、Anti-AI score）。

## 1. 首次旅程（Agent 引导）

```text
Welcome → Brief → Mood → Explore 3 Directions → Choose → Refine → Generate → Static/Animated/Interactive → Evolve
```

### Welcome（开场）
- 一句卖点：**"MAKE SOMETHING WORTH LOOKING AT. — 一个 AI 艺术总监。"**
- 两个动作：**[ 开始创作 ]** → Brief；**[ 给我惊喜 ]** → 随机类别 + 3 个故意不同的方向（不要立刻出通用海报）。

### Brief（要做什么）
- 问：**"你要做什么？"** 一个大输入框 + 快捷类别（Music / Fashion / Exhibition / Film / Product / Event / Editorial / Restaurant / Other）。
- 可选补充：标题 / 日期 / 地点 / 品牌 / CTA。
- 占位示例："An experimental electronic music festival in Shanghai. Dark, energetic, and slightly chaotic."

### Mood（什么感觉）
- 问：**"它应该是什么感觉？选 2–3 个词。"**（最多 3 个）
- 词表：RAW / REFINED / LOUD / QUIET / DENSE / SPARSE / PLAYFUL / SERIOUS / CHAOTIC / PRECISE / DIGITAL / PHYSICAL / EDITORIAL / EXPERIMENTAL / CINEMATIC / INTIMATE。
- 可选滑块（不显示数值）：Quiet↔Loud、Order↔Chaos、Clean↔Raw、Digital↔Physical。
- 内部映射（用户不可见）：
  - RAW → precision_vs_imperfection↑、materiality.imperfection↑
  - LOUD → hierarchy.scale↑、density↑、contrast↑
  - SPARSE → negative_space.amount↑、density.overall↓
  - PHYSICAL → materiality.physicality↑、texture.presence↑
  - （完整映射见 engine/intent/index.js）

### Explore（三个方向）
- 问：**"这三个方向我们都可以试试。"** 生成 3 个**结构上不同**的方向（构图/网格/层级/字体/图像/密度/材质至少 3 项不同；只换颜色不算）。
- 每个方向给：**概念名** + 一句话概念 + 2–4 个视觉描述 + 预览。禁止技术名。
  - 例："Concrete Noise — 粗野主义 / 字体主导 / 高张力"；"After Midnight — 电影感 / 摄影 / 氛围"；"Printed Chaos — 复印 / 实验字体 / 物理质感"。
- 内部管线：BriefContext → Design Director → Preset 选择 → 受控变异 → Direction A/B/C（每个都含完整 DNA）。

### Choose
- 选中后：**"好选择。我们再推进一步。"** 不要重启整个管线；以选中 DNA 为基底继续。

### Refine（细化）
- 问：**"我们要改什么？"** 快捷按钮：更实验 / 少点数字感 / 标题更大 / 更多留白 / 更高对比 / 更物理 / 更电影 / 更意外。
- 自由输入："告诉我哪里不对劲…"（例："标题太小"、"太像科技创业公司了"、"更像独立杂志"、"人物太抢眼"、"再怪一点"）。
- 自然语言 → 定向 DNA 变异（engine/intent/index.js），例如：
  - "太像科技创业公司" → digital_vs_physical↓、graphic 元素简化、材质↑
  - "标题太小" → typography.scale↑ / titleScale↑

### Generate & Modes
- 生成最终海报；提供 **静态 / 动态 / 交互** 三种模式选择。

### Evolve
- 不从头再来：在现有版本上继续演化，保留版本历史（可回退）。

## 2. 文案原则

- 用：**How should it feel? / Three ways we could take this. / What should we change? / Let's push it further. / Where should we take it next?**
- 禁：Configure your Design Vocabulary. / Select your Composition Schema. / Choose a Design DNA preset. / Adjust your Visual Hierarchy.

## 3. 错误状态

- 坏："Generation failed."
- 好："That direction didn't come together. 你的选择都还在。试试另一个方向。"
- 动作：[ 重试 ] / [ 换一个方向 ]。**绝不抹掉当前 DNA。**

## 4. 老用户

- 跳过引导，显示："What are we making today?" + 动作：新海报 / 继续上一个 / 演化一个设计 / Design Lab / 给我惊喜。

## 5. 实现阶段（按 FIRST_TIME_UX.md §23）——已全部完成（Phase A–E）

- Phase D：`poster.js evolve <dna.json> "<反馈>" --out workspace` —— 版本历史 v1/v2… + versions.json（可回退）
- Phase E：`poster.js surprise`（随机主题→3 方向）；`poster.js lab`（Advanced Design Lab，高级用户显式进入）


- Phase A：Welcome → Brief → Mood
- Phase B：Explore 3 Directions → Choose
- Phase C：Refine → Generate → Final
- Phase D：Evolve → Version History
- Phase E：Surprise Me → Design Lab（Design Lab 必须在核心流程可用后再做）

## 6. 验收（FIRST_TIME_UX.md §24）

- 新用户无需文档即可开始；一句话描述海报；无术语选 Mood；系统给 3 个真正不同的方向；可选中方向；可自然语言细化；反馈变成定向 DNA 变异；最终海报过 Design Critic；Anti-AI 自动运行；静态/动态/交互可选；可演化不重来；版本可回退；老用户跳过引导；V0 功能保持。
