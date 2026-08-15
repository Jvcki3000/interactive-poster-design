# Composition（构图 / 排版模式）

通过 `style.layout.mode` 切换 5 种构图，默认 `classic`。

## 模式速查
| mode | 构图 | 适用 | 元素位置 |
| --- | --- | --- | --- |
| classic | 纵向三段 | 通用 | 上 brand/tag，中 title/sub/location，下 date+cta |
| hero | 底部大标题 | 电影/品牌 | 上 meta，中留白，左下大标题 + 右下 date/cta |
| split | 左右分栏 | 杂志编辑 | 左列 meta（上 tag/下 date），右列大标题居中 |
| minimal | 全居中 | 极简 | 所有元素水平居中，大留白 |
| dynamic | 斜切动感 | 运动/潮流 | 标题 skew(-6°) + 中段 rotate(-3°) |

## 网格与留白
- `layout.gridColumns`（默认 12）、`layout.margin`（64，极简 120）
- 负空间：15–25%；hero 模式中部留白最大化
- 与 Z 轴分层结合：background → grid → particles/ball → glow → content → details → cursor-light

## 快速试排版
```bash
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/hero --preset cyberpunk
# 或手动改 spec: style.layout.mode = "split"
```