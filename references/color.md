# Color

## 角色色（Design Spec 的 style.colors）
| 角色 | 用途 |
| --- | --- |
| bg | 背景主色 |
| surface | 背景渐变/次级面 |
| ink | 正文/标题 |
| accent | 强调（按钮/高亮） |
| accent2 | 次级强调 |
| muted | 次要文字 |

## 规则
- 总颜色 ≤6（critic 检查），保持品牌一致
- 正文/背景对比度 ≥4.5:1；强调色/背景 ≥3:1（WCAG）
- 深色底（bg 亮度 <0.3）：ink 用近白，accent 用高亮霓虹
- 浅色底：ink 用近黑，accent 用高饱和色（瑞士红 #e30613、编辑砖红 #b3422f）
- 参考图取色：`node scripts/poster.js palette <img> --colors 5 --out p.json`，再 `render --palette p.json`


## 色彩策略（Color Strategy，替代"想一个颜色"）

不直接给模型颜色描述，先选策略再生成整套角色色（color-strategy 模块，自动修正对比度）：

| 策略 | 特征 |
| --- | --- |
| monochrome / no-color | 单色相 / 纯黑白灰 |
| duotone / complementary / triadic / analogous | 双色 / 互补 / 三角 / 相邻 |
| muted / warm-neutral / cold-neutral | 低饱和、暖灰、冷灰 |
| high-contrast / black-accent / unexpected-accent | 强对比、黑白+强调、突兀亮色 |

快速用：node scripts/poster.js directions <spec> --seed N --render，让 Design Director 组合这些策略产出 6 个方向。

## 快速检查
对比度可用 `poster-engine` 的 critic 自动判断；手算用 luminance：`L=0.2126R+0.7152G+0.0722B`（线性化后），对比度=(max+0.05)/(min+0.05)。