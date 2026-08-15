# photo-hotspots — 图片 + 热点，零按钮（✅）

「AURORA」摄影展海报：交互完全长在**图片上**，没有任何按钮。

## 验证的能力
- 图片背景层（`style.imagery.image`）：cover + duotone + 上下渐变压暗（保文字可读）+ 悬停缓慢放大
- 热点系统（`content.hotspots`）：在人物/宠物/画面任意位置定义可点击区域
  - 悬停 → 圆环脉冲 + 标签浮现
  - 点击 → 居中信息卡（标题+详情）；点外部/点卡片关闭
  - 覆盖全图的大热点（r=34）实现"点画面探索"
- 零按钮：不写 `content.cta` / `content.date`，渲染器自动不输出任何按钮
- Critic 已适配无按钮设计（不再因缺 CTA 扣分）

## 渲染命令
```bash
node scripts/render.js examples/photo-hotspots/spec.json --out out/photo-hotspots --critic
```