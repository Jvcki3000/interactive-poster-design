# Critic

> 设计评审（TASK-014/024）。

- 模块：engine/critic/index.js；Agent 文档：agents/design-critic.md。
- 10 维度：hierarchy / typography / composition / contrast / color / balance / brandConsistency / readability / materiality / interaction（各 0–10）。
- 返回：`{ scores, overall, aiNess, pass, suggestions, ai_ness_score, issues, recommendations }`。
- Anti-AI：engine/color/anti-ai.js（spec 级 + DNA 级统一规则源），AI-ness <25 才 PASS。
- CLI：`poster.js render --critic`；自动迭代 `poster.js iterate`（上限 3，每轮截图 QA）。
