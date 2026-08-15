# Interaction Vocabulary（交互词汇）

通过 `interactions` 按海报类型选用，避免千篇一律的"鼠标视差 + 两个按钮"。

## 已实现的效果

| 类别 | 效果 | 配置方式 |
| --- | --- | --- |
| Cursor 跟随 | 光标环（lerp 跟随，悬停可交互元素放大） | `interactions.cursor = { type: "ring" }` |
| Hover | 变形 | `interactions.title = { effect: "distort" }`（默认） |
| Hover | 故障抖动 | `interactions.title = { effect: "glitch" }` |
| Hover | 变色 | `interactions.title = { effect: "color-shift" }` |
| Hover | 放大 | `interactions.title = { effect: "scale" }` |
| Click | 标题炸裂重组 | `interactions.title = { click: "explode" }` |
| Cursor | 斥力（元素躲开鼠标） | `interactions.ball = { repel: 0.4 }`（自动补球图形） |
| Cursor | 磁吸 | `interactions.cta = { type: "hover", effect: "magnetic" }` |
| Click | 详情展开 | `interactions.date = { type: "click", action: "expand" }` |
| Cursor | 视差 / 3D 倾斜 | `background.parallax` / `poster.tilt3d` |
| 环境 | 粒子 / 光标光晕 / 滚动显现 | `animation.particles` / `glow.cursorLight` / `scroll.reveal` |


## 无按钮设计：图片层 + 热点（hotspots）

用户不想要按钮时，用「图片 + 热点」：

- 图片层：`style.imagery.image = { src, duotone, scrim, zoom }`（可放人物/宠物/产品照片）
- 热点：`content.hotspots = [{ x, y, r, label, detail }]`（x/y 为百分比中心点）
  - 点击 → 居中信息卡弹出；点外部/点卡关闭
- 不写 `content.cta` / `content.date` 就不会渲染任何按钮
- 整幅画面也可设一个覆盖全图的热点（x:50 y:50 r:50）实现"点画面探索"

## 人物/动物高光（热点 mode:hover）

主角是**人物/动物/宠物**时，用悬停模式：鼠标移到角色身上 → **整个人物高光 + 旁边浮现档案卡**，不用点。

```jsonc
{ "x": 50, "y": 38, "rx": 16, "ry": 26, "mode": "hover",
  "label": "THE PROTAGONIST", "meta": "CHARACTER PROFILE",
  "detail": "人物简介…",
  "sections": [{ "heading": "Name", "text": "…" }, { "heading": "Quote", "text": "…" }] }
```

- `rx`/`ry`：椭圆区域（百分比，默认取 `r`）；**推荐配 `imagery.image.silhouette`（人物抠图 PNG）**：用分割模型（如 mediapipe selfie_segmenter / rembg u2net）把人物从背景切出，高光**贴着人物轮廓走**（`.person-glow` 剪影光晕），鼠标命中检测也**按人物形状**（掩膜像素判定），不再用椭圆
- 悬停效果：角色区域**光晕高亮**（`hs-glow`）+ 整张图微微提亮增饱和（`.char-hover`）+ 角色附近**浮动档案卡**浮现（meta + sections）
- **点击可钉住**：点一下卡片固定显示（人物保持高光），再点取消
- 示例：`examples/protagonist-poster/spec.json`（NIAGARA：人物用 hover，场景用 click，两种模式并存）

示例：`examples/photo-hotspots/spec.json`（AURORA 摄影展，零按钮）。


## Interactive Movie Poster（点击海报）

热点支持 `meta`（小标签）与 `sections`（多段内容），可实现电影海报的点击探索：

```jsonc
{ "x": 50, "y": 42, "r": 15, "label": "PAUL ATREIDES", "meta": "CHARACTER PROFILE",
  "detail": "人物简介…",
  "sections": [{ "heading": "House", "text": "…" }, { "heading": "Quote", "text": "…" }] }
```

- 点击人物 → Character Profile（meta + 多段）
- 点击日期 → 上映日 + Trailer / Synopsis / Cast
- 弹卡带关闭按钮（✕），点外部也可关闭
- 示例：`examples/movie-poster/spec.json`（DUNE 风格，9.6 分 / AI-ness 0）

## 互动类型目录（咨询时给用户选）

| 类型 | 例子 | 落 spec |
| --- | --- | --- |
| 高亮 + 信息卡 | 鼠标移到人物/元素 → 高亮 + 弹档案卡 | `hotspot{mode:hover, interaction:card}` |
| 高亮型（不弹窗） | 鼠标移到人物 → 只发光 | `hotspot{mode:hover, interaction:highlight}` |
| 按钮型切换风格 | 点按钮换海报主题/配色 | `style.switchPhases` + 风格切换按钮 |
| 点击人物触发活动 | 点人物打开链接/触发效果 | `hotspot{action:{type:link,url}}` |
| 点击展开详情 | 点人物/日期 → 居中弹详情 | `hotspot{mode:click}` |
| 炫技型 | 粒子 / 炸裂 / 3D / 光标环 | `interactions` + `animation.particles` |

## 按海报类型推荐

| 类型 | 推荐组合 |
| --- | --- |
| 艺术展 | 文字排斥（repel）+ 静默（无粒子） |
| 时尚 | 微妙 3D + cursorRing + color-shift |
| 音乐/夜店 | glitch + explode + 粒子 + 光标环 |
| 科技/品牌 | scale + cursorRing + 信息层展开 |
| 极简 | 只有 distort 或 color-shift，克制 |

## 设计方向差异

`scripts/directions.js` 的 6 个方向各自绑定不同交互（如 d1 霓虹=glitch+环+炸裂+斥力，d2 暖极简=变色）。方向间交互不重复，避免"演示感"。

## 时间生命周期（timePhases）— 海报会"长大"

同一张海报，颜色与效果随真实时间变化（4 相位可自定义任意数量）：

```jsonc
"style": {
  "timePhases": [
    { "hour": 8,  "label": "08:00", "name": "DAWN",  "colors": { "bg": "#f4f1ea", "ink": "#1c1a16", "accent": "#3b6ea5", "…": "…" }, "fx": { "grain": 0.08, "glow": 0.5, "contrast": 1, "brightness": 1.02, "saturate": 0.95, "shadow": 0.25 } },
    { "hour": 14, "label": "14:00", "name": "NOON",  "colors": { "…": "…" }, "fx": { "contrast": 1.35, "shadow": 0.9, "…": "…" } },
    { "hour": 20, "label": "20:00", "name": "NEON",  "colors": { "bg": "#0a0a14", "accent": "#ff2bd6", "…": "…" }, "fx": { "glow": 2.4, "…": "…" } },
    { "hour": 2,  "label": "02:00", "name": "NIGHT", "colors": { "bg": "#050507", "…": "…" }, "fx": { "grain": 0.65, "blur": 0.5, "brightness": 0.72, "saturate": 0.5, "…": "…" } }
  ]
}
```

- `fx` 可用：`grain`（噪点强度）、`glow`（光晕强度，同时驱动标题辉光）、`blur`（整体模糊 cqw）、`contrast/brightness/saturate`（整体滤镜）、`shadow`（投影强度）
- 运行时：进入页面按**真实本地时间**自动匹配最近相位（LIVE，绿点呼吸）；右下角**时间芯片**显示当前相位，单击循环到下一相位、双击回到 LIVE；每 30 秒自动刷新
- 过渡：CSS `@property` 注册颜色/数值变量，相位之间 1.6s 平滑渐变（不支持时自动降级为瞬时切换）
- 交互词汇：`time:cycle`（`vocab compose --interactions time:cycle`，自动带 4 个默认相位）
- 示例：`examples/time-poster/spec.json`（NIAGARA 24H，9.6 分 / AI-ness 0）


## 实时天气海报（weather）— 每个人看到的不一样

海报在打开时获取**用户自己的位置 + 实时天气**，自动切换到对应"天气相位"：

```jsonc
"style": {
  "weather": {
    "defaultCity": "Singapore", "lat": 1.3521, "lon": 103.8198,   // 定位失败时的兜底
    "phases": [
      { "match": { "group": ["clear"], "isDay": true },  "colors": { "bg": "#cfe9f5", "…": "…" }, "fx": { "glow": 0.6 } },
      { "match": { "group": ["clear"], "isDay": false }, "colors": { "bg": "#0a1226", "…": "…" }, "fx": { "stars": 1 } },
      { "match": { "group": ["rain","drizzle","storm"] }, "colors": { "bg": "#26323e", "…": "…" }, "fx": { "rain": 1, "blur": 0.12 } },
      { "name": "NEUTRAL" }   // 无 match = 兜底相位
    ]
  }
}
```

- **match 规则**：`group`（clear/cloud/fog/drizzle/rain/snow/storm，来自 WMO 天气码）可传字符串或数组；`isDay` 可选（true=白天 / false=夜晚）；无 match 的相位作兜底
- **fx 额外几个**：
  - `stars`（星空层）
  - `rain`（**Canvas 深度雨幕**：上百根雨丝分层下落，近景快/粗/亮、远景慢/细/淡，带斜风角度，按相位淡入淡出，尊重 prefers-reduced-motion）
  - `rainDensity`（**雨量分级**：0.45 毛毛雨 / 1 中雨 / 1.6 大雨 / 2+ 暴雨——雨丝数量、速度、长度随之变化；实时天气模式下按 WMO 码自动分级）
  - `fog`（**雾气层**：径向雾气 + 屏幕混合，随雨相位淡入）
- **运行时流程（定位准确性优先）**：
  1. URL `?city=佛山` 手动指定（最可靠，正地理编码 Open-Meteo）
  2. 浏览器 Geolocation（GPS/WiFi，最准）→ 坐标一到就立刻拉天气，**城市名并行反查**（Nominatim → bigdatacloud 兜底），不阻塞渲染
  3. IP 定位（ipwho.is）仅作最后兜底，并明确标注 `· IP`（IP 可能不准，如 VPN/运营商出口）
- **定位来源透明**：问候语末尾显示 `· GPS / · IP / · MANUAL`；点击问候语可**重新定位**；IP 估算时悬停提示「点击重新定位」
- **文案自动更新**：顶部问候 `TONIGHT IN <城市>` / `RIGHT NOW IN <城市>`，天气条 `时间 · 城市 · 温度° · 天气`；标题换成你的城市（≤12 字符）；右下角芯片 `LIVE · 城市 · 温度°`，点击刷新
- **验证**：`node scripts/poster.js weather <城市> --spec <weather spec.json>` 打印实时天气 → 匹配相位
- **无手动演示按钮**：海报只跟真实数据走（GPS → 天气 → 渲染），不提供手动切天气的 UI；调试可用 URL `?city=佛山` 或 `?city=London`
- 交互词汇：`weather:live`（`vocab compose --fx weather:live`，自动带 4 个默认天气相位）
- 示例：`examples/weather-poster/spec.json`（9.4 分 / AI-ness 0）
