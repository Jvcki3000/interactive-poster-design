# Architecture

> 架构文档（TASK-024）。详见 current-architecture.md（TASK-001 审计）。

## 分层

```text
Brief
 → Design Director（agents/design-director.md + scripts/director.js）
 → Design DNA（engine/design-dna：dna.js 校验 / dna-presets.js 预设+变异 / index.js DesignDNA+toSpec）
 → Compatibility（schema/compatibility.json + engine/design-dna/dna.js checkCompatibility）
 → 3 Directions（scripts/directions.js）
 → Visual Assets（engine/imagery + engine/color/anti-ai 守卫）
 → Renderer（renderer/html/index.js，消费 Design Spec）
 → Motion / Interaction（engine/motion + engine/interaction + renderer 动效类）
 → Critic + Anti-AI（engine/critic + engine/color/anti-ai.js）
 → Iterate（scripts/iterate.js，上限 3，截图 QA renderer/screenshot）
 → Final Poster
```

## 关键契约

- **Design DNA**（schema/design-vocabulary.schema.json）— 设计意图
- **Design Spec**（schema/design-spec.schema.json）— 渲染契约（renderer 只认它）
- DNA → Spec：engine/design-dna/index.js 的 toSpec()

## 目录

- engine/ — 设计/渲染逻辑（design-dna/color/typography/layout/imagery/graphics/texture/motion/interaction/critic/weather/presets/design-plan）
- renderer/html/ — HTML/CSS 渲染器；renderer/svg/ — SVG 表面；renderer/screenshot/ — 截图 QA
- scripts/ — CLI（poster.js 统一入口）
- schema/ presets/ agents/ benchmarks/ tests/ examples/ assets/
