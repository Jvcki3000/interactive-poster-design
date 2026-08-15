# nike-hoops — Nike 风格互动篮球海报（poster-design skill 示例 ✅）

「FLIGHT」Nike 风格篮球海报，鼠标移动产生 **3D 视差**（海报 3D 倾斜 + 篮球独立视差层）。

## 设计方向
- Nike 品牌调性：纯黑底 / 白字 / **伏特绿** accent（#c7ff00）+ 橙强调
- 窄体加粗标题（Arial Narrow / Impact），全大写 + 大字距
- 图形层：CSS 绘制的篮球（`style.imagery.ball`，深度 0.4 → 独立视差）

## 覆盖的交互
- **3D 倾斜**（`poster.tilt3d` max 7°）——海报随鼠标 rotateX/rotateY
- **篮球视差**（`imagery.ball.depth` 0.4）——篮球比背景移动更大，形成景深
- 背景视差 / 粒子 / 光标光晕 / 标题悬停 / 点击展开详情 / 磁吸 CTA

## 渲染命令
```bash
node scripts/render.js examples/nike-hoops/spec.json --out out/nike-hoops --critic
```