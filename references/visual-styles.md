# presets — 风格预设

同一份内容，套不同预设即可一键切换视觉风格（spec 显式值优先生效）。每个预设同时绑定**排版模式**。

| key | 风格 | 排版 | 色板方向 | 字体 | 适用 |
| --- | --- | --- | --- | --- | --- |
| `swiss` | 瑞士国际主义 | classic | 米白/黑/红 | 无衬线 grotesque | 展览、文化、极简 |
| `editorial` | 杂志编辑 | **split** | 米色/砖红/墨绿 | 衬线标题+无衬线正文 | 品牌、内容、电影 |
| `minimal` | 极简 | **minimal** | 黑白+1 强调 | 无衬线 | 高端品牌、产品 |
| `experimental` | 实验 | **dynamic** | 深紫/荧光粉/荧光绿 | 粗黑体 | 音乐、潮流、艺术 |
| `cyberpunk` | 赛博朋克 | **hero** | 深蓝黑/霓虹青/霓虹红 | 粗黑体 | 音乐节、夜店、科技 |

## 用法
```bash
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/cyberpunk --preset cyberpunk
```

## 排版模式（style.layout.mode）
`classic | hero | split | minimal | dynamic`，可单独覆盖：
```bash
node scripts/render.js <spec> --out out/x --preset editorial   # 默认 split
# 在 spec 里写 style.layout.mode = "hero" 即可单独改排版
```