# critic — Design Critic（自检评分）

对 Design Spec（+ 渲染 HTML）做多维度打分，形成「设计循环」的裁判：

```
render → critic → PASS / NEEDS IMPROVEMENT（附建议）→ 人工或 iterate 修复
```

## 维度与权重
| 维度 | 权重 | 说明 |
| --- | --- | --- |
| hierarchy | 0.20 | 标题/副标题/元信息层级差异 |
| typography | 0.15 | 字体、scaleRatio、标题是否溢出画布 |
| composition | 0.15 | 内容完整性、边距、渲染结构 |
| contrast | 0.20 | WCAG 对比度（正文 ≥4.5:1，强调色 ≥3:1） |
| balance | 0.10 | 顶部/底部元素平衡 |
| brandConsistency | 0.10 | 颜色数量与协调 |
| readability | 0.10 | 元信息字号（≥12px） |
| originality | 0 | 需人工/AI 主观判断，不自动评分 |

总分 ≥7 为 PASS。

## 用法
```bash
node scripts/render.js <spec.json> --critic          # 渲染后评分
node scripts/iterate.js <spec.json>                  # 自动迭代到 PASS
```