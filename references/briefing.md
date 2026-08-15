# Briefing — 需求引导问题库

Brief 太模糊时，先问，不要直接开做。**最多 4 个核心问题 + 2 个可选**，
每题给可选项与推荐（用户没耐心就用推荐默认，回答含糊就给推荐项继续）。

## 核心问题（必问，可合并成一次提问）

### 1. 风格 Style（想要什么感觉）
```
a) 瑞士极简（swiss）     b) 杂志编辑（editorial）
c) 极简留白（minimal）   d) 实验潮流（experimental）
e) 赛博霓虹（cyberpunk） f) 自由描述（如"90 年代欧洲地下音乐海报"）
```
- 用户给自由描述 → 由 Agent 把它翻译成 Design Vocabulary 组合（排版/图像/图形原语）
- 用户没想法 → 推荐：品牌=minimal/editorial，音乐=experimental/cyberpunk，展览=swiss

### 2. 内容 Content（写什么文案）
```
标题 / 副标题 / 日期 / 地点 / 价格 / CTA
```
- 用户没给 → 用占位文案（标题取主题词），并明确"文案之后可改，程序化排版保证准确"

### 3. 交互 Interaction（要哪种互动）
```
a) 按钮型：日期展开详情 + CTA 磁吸（默认）
b) 画面型：图片 + 热点，零按钮（点人物/宠物/画面弹信息卡）
c) 炫技型：glitch + 点击炸裂 + 光标环 + 粒子 + 3D 倾斜
d) 克制型：仅视差 + 光标光晕 + 标题悬停
```
- 有"图片/人物/宠物"关键词 → 默认 b
- 音乐/夜店/科技 → 默认 c
- 品牌/展览 → 默认 a 或 d

### 3b. 互动咨询（必问，风格之后紧接着问；不要先入为主）
画面型 / 有"人物主角"时，**必问** 4 件事，且先问"要不要互动"：
1. **要不要互动**：a) 纯静态  b) 轻互动（悬停发光 / 视差）  c) 强互动（弹卡 / 切换 / 触发活动）
2. **互动方式**（给例子，让用户选/描述）：
   a) **高亮 + 信息卡**——鼠标移到人物/元素上 → 高亮 + 弹档案卡（`hotspot mode:hover + interaction:card`）
   b) **按钮型切换海报风格**——点按钮换主题/配色（`style.switchPhases`，engine 已实现）
   c) **点击人物触发活动**——点人物打开链接 / 触发效果（`hotspot action:{type:link,url}`）
   d) 点击展开详情——居中弹窗（`mode:click`）
   e) 炫技型——粒子 / 炸裂 / 3D
   f) 自定义描述（agent 翻译成上面某一种）
3. **触发位置**：a) 人物/动物/主体轮廓（自动抠图）  b) 指定区域（用户圈选/给坐标）  c) 整幅画面
4. **触发方式**：a) 悬停  b) 点击  c) 悬停 + 点击钉住

→ 落 spec：hotspot `mode`（hover/click）+ `interaction`（highlight / card）+ `action`（link）+ x/y/rx/ry，或 `style.switchPhases`；用户没耐心才用默认「人物高亮 + 悬停弹卡」。

### 4. 配色 Color（想要什么颜色）
```
a) Monochrome 单色   b) Duotone 双色      c) Triadic 三角
d) Analogous 相邻    e) Complementary 互补 f) Muted 低饱和
g) High Contrast     h) Black+Accent      i) Warm Neutral 暖灰
j) Cold Neutral      k) Unexpected Accent  l) No Color 黑白
```
- 用户给参考图/品牌色 → 用取色（palette）或直接给色值
- 用户没想法 → 随机 1-3 个方向让用户挑

## 可选问题

### 5. 尺寸与用途
A4 / 16:9 / 9:16 / 1:1 / 1200×1600（默认）

### 6. 参考图 / Logo / 素材（上传了图片但没提要求 → 先问要用哪些元素）

> **生图模型策略（先预检通道，再定路线，别先承诺效果）**：若功能需要"生成式图像模型"（原创插画/背景/改造图），先确认**当前有没有可用生图通道**：① 内置 image_gen ② `OPENAI_API_KEY` ③ OpenAI 兼容中转（`OPENAI_BASE_URL`，如 Agnes `https://api.agnes-ai.cn/v1`）。注意：**中转/低价图模型做大幅图生图改造往往很弱**（常见：构图几乎不变、只加一团光晕）——不要先承诺效果。同时**提前告知用户预期效果**：当前通道能到什么水平（草稿级/插画级/写实级），低配闪速/中转模型出图质量有限；**想要更好的效果，建议使用真正的生图大模型**（内置 image_gen / gpt-image / 更强图模型），否则要么接受当前通道效果，要么走代码合成。
> 三条素材路线让用户选，并讲清优劣：
> - ① **上传素材**：身份 100% 保真，主角已有图时最稳
> - ② **AI 生成**：需要可用通道；**效果不定——先出 1 张草稿给用户确认再继续**；同一需求 ≤2~3 次不满意就**止损**（停止消耗额度/费用），切路线或换服务，并明确告诉用户该通道能力有限
> - ③ **代码合成/改造**：原图 + CSS 滤镜分级（`fx.hue/saturate/contrast`）+ **SVG 覆盖层**（`imagery.overlay`，按相位显示）+ **mediapipe 检测定位**（五官/轮廓坐标，不要猜比例）——身份保真、免费、可无限微调，适合"给现有图加元素/换风格"
> 当前模型不支持生成图片时，明确告知可走 **AI 合成**（代码合成 + 图像处理 + 素材三源），并让用户选。
- **图片里的元素**（可多选）：
  - 主体（人物/动物/产品）→ 抠图（分割模型）+ `silhouette` 剪影高亮 + 热点
  - 背景/场景 → 整图保留
  - 配色 → `palette.py` 取主色板
  - 图中文字/Logo → 程序化重排或裁剪成素材
  - 整体风格 → 仅参考（指纹 → `plan --fingerprint`）
- 参考图 → 主色板（palette.py）；Logo/产品图 → `imagery.image` 或热点主体
- 用户没耐心 → 默认「主体 + 配色」并说明可改

### 7. 动态数据 / 生命周期（进阶，海报要不要"活"起来）
```
a) 时间相位：8AM 明亮 → 2PM 高对比 → 8PM 霓虹 → 2AM 暗颗粒模糊（style.timePhases）
b) 实时天气：定位用户城市 + 实时天气 → 晴/雨/夜每人不一张（style.weather）
c) 无按钮热点：点击人物/宠物/画面弹信息卡（content.hotspots + meta/sections）
d) 纯静态（默认）
```
- 用户说"会变""跟时间/天气走""每个人看到的不一样" → 默认 b（天气）或 a（时间）
- 用户有"人物/宠物/主人公" → 默认 c，且问素材来源（上传 / imagegen / 联网参考）
- 可叠加：如「天气 + 时间」（夜间晴天=星空相位）

## 答案 → Design Spec 映射

| 问题 | 答案 | Spec 字段 |
| --- | --- | --- |
| 风格 | swiss/editorial/... | `presets[key]` → style.colors/typography/layout |
| 风格 | 自由描述 | Agent 拆成 Design Vocabulary → style 覆盖 |
| 内容 | 文案 | `content.title/subtitle/date/location/price/cta` |
| 交互 | 按钮型 | `interactions.date.click=expand` + `content.cta` |
| 交互 | 画面型 | `style.imagery.image` + `content.hotspots`，不写 cta/date |
| 交互 | 炫技型 | `title.effect=glitch` + `click=explode` + `cursor.ring` + `ball.repel` + particles + tilt |
| 配色 | 策略 | `generatePalette(strategy)` → style.colors |
| 配色 | 参考图 | `palette.py` → `--palette` → style.colors |
| 尺寸 | — | `canvas.width/height` |
| 动态 | 时间相位 | `style.timePhases`（4 相位：8/14/20/2） |
| 动态 | 实时天气 | `style.weather`（defaultCity+phases，运行时定位+取数） |
| 动态 | 热点零按钮 | `content.hotspots`（+`meta`/`sections` 弹档案；人物用 `mode:"hover"`+`rx/ry` 高光浮现） |
| 交互 | 零按钮切换 | `style.switchPhases`（相位可带 `image` 换图）+ `hideStyleSwitch:true` + hotspot `action:{type:"phase"}`（点击主体循环） |
| 素材 | 代码合成改造 | `style.imagery.overlay`（SVG 覆盖层，相位>0 显示）+ `fx.hue/saturate/contrast` 滤镜分级 |
| 素材 | 元素定位 | mediapipe FaceLandmarker 检测五官坐标（眼/嘴/鼻），不要用经验比例猜 |

## 示例对话（快捷）
> 用户：做一张音乐节海报
> Agent：想走哪种感觉——赛博霓虹、实验潮流、还是极简？（默认赛博）
> 用户：赛博
> Agent：文案给个标题和日期？（默认"NEON RUSH · 09.12"）
> 用户：就叫 NEON RUSH，9.12
> Agent：交互要炫一点（故障+炸裂+粒子）还是克制（视差+光晕）？（默认炫）
> 用户：炫
> Agent：配色用霓虹青还是随机出 3 个方向给你挑？
> 用户：随机吧
> → 生成 6 方向 → 用户挑 1 → render → critic → 交付

## 工具
```bash
node scripts/poster.js brief                       # 打印问题清单（给 Agent 参考）
node scripts/poster.js brief --style cyberpunk --color high-contrast \
  --interaction showcase --title "NEON RUSH" --date "09.12" \
  --subtitle "SYNTHWAVE NIGHT" --location "TOKYO" --cta "GET TICKETS" \
  --out out/brief --render                        # 答案直接出 spec + 渲染
```