# Reference Analysis — 参考海报分析

用户上传参考海报时，**先分析、再提问**：
`poster.js analyze <图>` → 设计指纹 JSON → 结合用户要求 → 引导提问。

## 用法
```bash
node scripts/poster.js analyze <参考海报.png> --colors 5
# 输出设计指纹：主色板 / 明暗 / 色温 / 布局猜测 / 密度 / 文字带 / 策略猜测
# 指纹里的 palette 可直接喂给 render --palette
```

## 指纹字段含义（估计值，用于引导，非精确测量）

| 字段 | 含义 | 引导示例 |
| --- | --- | --- |
| `palette` | 5 个主色 + 占比 | "参考图以 X 色为主，要不要延续？" |
| `background` / `is_dark` | 背景色 / 是否深色 | 深色 → 霓虹/高对比方向 |
| `temperature` | warm / cold / neutral | 暖 → 复古/杂志；冷 → 科技/赛博 |
| `saturation` | 高/中/低 | 低饱和 → 极简/复古 |
| `contrast` | 高/中/低 | 高对比 → black-accent/high-contrast |
| `layout.guess` | centered / split / hero / dynamic / classic | 居中 → minimal；底部重 → hero |
| `density` / `negative_space` | 信息密度 / 留白 | 高密度 → 杂志；大留白 → 极简 |
| `text_bands` / `has_large_type` | 文字带数量 / 是否大字 | 大字 → 保留大标题冲击力 |
| `strategy_guess` | 色彩策略猜测 | 直接作为 --color 候选 |

## 分析 → 引导提问（示例）

> 用户：上传海报 + "帮我做一个类似的"
> Agent（先 analyze）→ 指纹：深色底、居中、高对比、红强调、大留白
> 提问：
> 1. "参考图是深色+居中+高对比+红色强调，想完全延续这个方向，还是只保留配色？"
> 2. "文案内容是什么？（标题/日期/地点/CTA）"
> 3. "交互要按钮型、画面型（图片+热点）还是炫技型？"
> 4. "配色直接用参考图的主色板，还是换个策略（如 Duotone）？"

## 与 Briefing 的关系
参考海报分析是 Briefing 的**输入增强**：用户上传参考图 → 分析 → 带着对参考图的理解去问剩下的问题，避免"用户上传了参考图你还问想要什么风格"。

## 局限
布局/文字带为启发式估计（基于亮度分布），不适用于：抽象插画、无文字纯图形、多图拼贴。此时以"配色 + 明暗 + 密度"为准，布局请用户确认。