# examples — 示例海报

每个示例 = 一份 Design Spec（JSON）+ 渲染产物（index.html），用于验证 Engine 与 Skill。

| 目录 | 场景 | 状态 |
| --- | --- | --- |
| `event-poster/` | 活动海报（V0.1+V0.2 全特性） | ✅ 9.8 分 |
| `music-poster/` | 音乐海报（预设/参考图/6 方向） | ✅ |
| `brand-poster/` | 品牌海报（EMBER 复古咖啡，含价格） | ✅ |
| `nike-hoops/` | Nike 篮球海报（3D 视差 + 篮球图形层） | ✅ |
| `photo-hotspots/` | 摄影展海报（图片层 + 热点，零按钮） | ✅ 本次新增 |
| `movie-poster/` | 互动电影海报（点击人物/日期/星球弹内容） | ✅ 本次新增 |
| `bad-demo-spec.json` | 故意做坏的 spec（iterate 演示） | ✅ |

## 渲染示例
```bash
node scripts/render.js examples/photo-hotspots/spec.json --out out/photo-hotspots --critic
```