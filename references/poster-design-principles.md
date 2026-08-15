# Poster Design Principles

## 核心原则
1. **AI 负责设计，代码负责运动**：AI 输出 Visual Assets + Layout + Animation Rules + Interaction Rules；动画/交互/渲染由代码完成。
2. **文字不交给图像模型**：标题、日期、Logo、二维码、价格一律程序化排版，保证准确、可选中、可复制。
3. **设计循环**：Brief → Design Direction → Design Concept → Visual → Layout → Critic → Pass/Improve → Regenerate。

## Design Critic 维度（0–10，总分 ≥7 PASS）
| 维度 | 检查点 |
| --- | --- |
| hierarchy | 标题/副标题/元信息字号差异（标题 ≥2× 副标题） |
| typography | 字体、scaleRatio(1.1–1.5)、标题是否溢出画布 |
| composition | 内容完整（日期/地点/CTA）、边距、渲染结构 |
| contrast | 正文/背景 ≥4.5:1，强调色/背景 ≥3:1 |
| balance | 顶部(brand/tag)与底部(date/cta)元素平衡 |
| brandConsistency | 颜色数量 ≤6 |
| readability | 元信息字号 ≥12px |
| originality | 需人工/AI 主观判断 |

## Anti-AI Design Critic（AI-ness 门禁）

交付前用 `render --critic` 检查 AI 味，**AI-ness ≥25 禁止输出**：

| 信号 | 权重 | 触发条件 |
| --- | --- | --- |
| 通用紫粉 | +20 | 强调色 hue 250–330° 且高饱和 |
| 霓虹青+品红 | +15 | 青强调 + 高饱和品红副色 |
| 装饰堆叠 | +15/+8 | 粒子+光晕+光标环+炸裂+3D ≥3 项 |
| 居中构图 | +10 | layout.mode=minimal/centered |
| 层次不足 | +10 | 标题/副标题 <1.8:1 |
| Duotone+紫粉 | +10 | 图片双色调+紫粉强调 |
| 无语义粒子 | +5 | 有粒子但无图形/图片 |

修复：`node scripts/poster.js iterate <spec>` 自动改色/减装饰/换排版；或手动调整 spec 后重跑。

## 参考图管线
参考图 → 主色板（palette.py）→ 角色色（bg/surface/ink/accent/accent2/muted）→ spec → 渲染。