# event-poster — 活动海报示例（V0.2 已跑通 ✅）

「NIGHT OF SOUND」音乐活动海报，验证 Engine 的 V0.1 + V0.2 能力。

## 文件
| 文件 | 说明 |
| --- | --- |
| `spec.json` | Design Spec（输入，已开启粒子/3D/滚动） |
| `index.html` | 渲染产物（输出，自包含零依赖） |
| `shot-default.png` / `shot-hover.png` / `shot-details.png` / `shot-scrolled.png` | 浏览器实测截图 |

## 本示例覆盖的交互
- V0.1：标题逐字显现、背景视差、光标光晕、悬停变形、点击展开详情、磁吸 CTA
- V0.2：粒子背景（Canvas）、3D 倾斜（鼠标驱动）、滚动显现底部信息

## 渲染命令
```bash
node scripts/render.js examples/event-poster/spec.json --out out/event-poster
node scripts/serve.js out/event-poster   # 预览 http://localhost:8080
```