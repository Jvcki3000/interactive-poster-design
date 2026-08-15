# Benchmarking

> 基准与多样性（TASK-018/019/020/024）。

- 数据集：benchmarks/briefs/briefs.json（24 条多样 brief，≥20 验收）；expected/ 期望结果；results/ 报告输出。
- 运行：`node scripts/poster.js bench [--seed N] [--limit M] [--out dir]` → results/report.json。
- 指标：pass 率 / 平均 Critic / 平均 AI-ness / Diversity Score。
- **Diversity Score（TASK-020 官方公式）**：
  `0.25 Layout + 0.20 Color + 0.20 Typography + 0.15 Imagery + 0.10 Graphic + 0.10 Interaction`，每维 ratio = min(1, unique/min(total,8))，目标 ≥0.70。
- 同 brief ×10 多样性测试：tests/diversity/diversity.test.js。
