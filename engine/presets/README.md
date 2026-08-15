# presets — 风格预设

同一份内容，套不同预设即可一键切换视觉风格（spec 显式值优先生效）。

| key | 风格 | 特点 |
| --- | --- | --- |
| `swiss` | 瑞士国际主义 | 米白底 / 红 / 大留白 / 网格 |
| `editorial` | 杂志编辑 | 衬线标题 / 米色 / 杂志质感 |
| `minimal` | 极简 | 黑白 / 大边距 / 少装饰 |
| `experimental` | 实验 | 深紫底 / 荧光粉+绿 |
| `cyberpunk` | 赛博朋克 | 深蓝黑 / 霓虹青+红 |

## 用法
```bash
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/cyberpunk --preset cyberpunk
```

## 新增预设
在 `presets/index.js` 的 `presets` 对象中加一个 key 即可，字段与 Design Spec 的 `style` 对齐。