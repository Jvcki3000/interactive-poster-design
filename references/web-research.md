# Web Research — 联网参考调研 + 主人公处理

引擎是本地代码生成，但**调研能力可以联网**：找类似海报 → 下载 → 分析指纹 → 进设计方案。

## 什么时候用
- 用户说"类似 XX 风格的海报" / "参考网上那种" → 联网找参考
- 用户有**主人公/角色** → 上传角色图，或生成/搜索角色参考图

## 流程（联网找参考）
1. **搜索**：用联网搜索找 1-3 张类似海报（关键词=场景+风格，如 "minimal sci-fi movie poster design"）
2. **下载**：把图保存到 `assets/reference/web/`（优先可直链的图床/CC 图）
3. **分析**：
   ```bash
   node scripts/poster.js analyze assets/reference/web/ref-1.jpg --colors 5
   ```
4. **指纹进方案**：
   ```bash
   node scripts/poster.js plan <spec.json> --fingerprint <指纹.json>
   ```
5. 让用户确认延续/偏离，再进 Design Director

## 生图模型策略（需要"生成式图像模型"时）

- **先问用户**：需要原创角色插画/背景生成时，先询问用户走哪条路（① 上传素材 ② AI 生成 ③ 联网参考），不擅自决定
- **模型不支持生成图片时，明确告知**：仍可走 **AI 合成** 完成——
  1. **代码合成**：HTML/SVG/Canvas 程序化视觉与动画（渐变/几何/数据驱动）
  2. **图像处理**：分割抠图（mediapipe selfie_segmenter）、滤镜、取色、裁剪
  3. **素材三源**：用户上传 / imagegen 生成（需 API key）/ 联网找 CC 参考图
- 本环境无 image_gen 工具或 key 时，一律走"代码合成 + 图像处理 + 三源素材"，并说明替代路径

## 主人公/角色图（三种来源）
| 来源 | 做法 | 适用 |
| --- | --- | --- |
| 用户上传 | `style.imagery.image.src = <角色图>` + 热点打在角色上 | 已有角色设定图 |
| **AI 生成** | 用 imagegen 生成角色插画 → 保存 → 同上（**先征得用户同意**；需 imagegen 工具或 API key，否则告知走 AI 合成替代） | 无图、想要原创角色 |
| 搜索参考 | 联网找角色参考图（注意版权） | 需要视觉参考 |

角色图放进海报后：热点（x/y 对准角色位置）+ `meta`/`sections` 放角色档案，实现"点击人物看档案"。

## 一键主角电影海报（protagonist）
```bash
node scripts/poster.js protagonist <照片> [--title 片名] [--engine mediapipe|rembg|auto] [--multi] [--names A,B] [--out out/<名字>] [--critic]
# 自动：mediapipe 分割 → 抠图/掩膜 → cover 换算热点 → 生成 spec（silhouette 剪影高亮 + hover 档案卡）→ render + critic
```
- 需要 Python 环境已装 `mediapipe`（脚本会自动探测）；模型缺失会尝试下载 selfie_segmenter.tflite；`--engine rembg` 用 u2net（更快，需先下载 u2net.onnx 到 ~/.u2net/）
- `--multi --names A,B`：把照片里多个分离的人物/元素拆成各自掩膜热点，悬停各自高光+档案卡
- 生成后编辑 `out/<名字>/spec.json` 改片名/档案内容，或重新传 `--title`

## 已落地示例（2026-08-14）
- 联网参考海报：`poster-design/assets/reference/web/ref-swiss-la-isla.jpg`
  （cinematerial.com 瑞士版《沼泽地 La isla mínima》海报，瑞士极简风）
  指纹：`poster-design/assets/reference/web/ref-swiss-la-isla.fingerprint.json`
  → 已通过 `plan --fingerprint` 进入 NIAGARA 方案（`poster-engine/out/protagonist-poster/design-plan.md`）
- 主人公图（公有领域电影剧照 → PIL 裁剪为 900×1350 竖版）：
  `poster-engine/assets/reference/protagonist.jpg`
  → 示例 `poster-engine/examples/protagonist-poster/spec.json`：热点点击出角色档案

## 演示命令（可直接复现）
```bash
# ① 分析联网参考海报 → 指纹
node poster-design/scripts/poster.js analyze poster-design/assets/reference/web/ref-swiss-la-isla.jpg --colors 5 --out poster-design/assets/reference/web/ref-swiss-la-isla.fingerprint.json
# ② 指纹进 9 维度设计方案
node poster-design/scripts/poster.js plan poster-engine/examples/protagonist-poster/spec.json --fingerprint poster-design/assets/reference/web/ref-swiss-la-isla.fingerprint.json --out poster-engine/out/protagonist-poster/design-plan.md
# ③ 渲染 + 自检评分
node poster-design/scripts/poster.js render poster-engine/examples/protagonist-poster/spec.json --out poster-engine/out/protagonist-poster --critic
# ④ 预览
# http://localhost:8080/protagonist-poster/
```
