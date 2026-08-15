---
name: poster-design
description: Create interactive HTML/SVG posters (event, music, film, brand, social, exhibition) that combine AI design direction with code-driven animation and interaction. Use when the user asks to design/generate a poster, interactive/motion poster, event flyer, album cover, or poster-like visual; or wants a poster that reacts to mouse/hover/click/scroll. Drives the poster-engine (engine/ + renderer/ 内嵌) to turn a Design Spec into a self-contained index.html, scores it with a Design Critic, and iterates until it passes.
---

# Poster Design

## What this skill does

Turn a poster brief into a **self-contained interactive `index.html`** (responsive, animated, mouse/click/scroll-reactive). 大脑是本 Skill（设计方向 + 工作流），身体是 **engine + renderer**（渲染 + 评分 + 迭代）。

Workflow: `Brief → 需求引导（4 问）→ Design Director（6 个方向）→ 选择 → Design Spec → render → critic → iterate → 交付`


## 从 GitHub 安装（给其他 agent）

用 skill-installer 从本仓库装 **一个目录**（engine 内嵌在 skill 里，装完即完整可用）：
```bash
python ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Jvcki3000/interactive-poster-design --ref main --path poster-design
```
或直接说：**"用 skill-installer 从 Jvcki3000/interactive-poster-design（分支 main）安装 poster-design"**。
装到 `~/.codex/skills/poster-design` 后新开 agent 会话即自动发现；引擎定位 `POSTER_ENGINE_DIR → <skill>（内置：engine/ renderer/ scripts/）→ 相邻 → 兜底`。

## Engine location

- Engine root: `<skill>`（**内嵌 engine/ renderer/ scripts/，自包含**），或环境变量 `POSTER_ENGINE_DIR` 覆盖
- 所有命令统一走 `scripts/poster.js`（自动定位 engine，无需关心 cwd）

## Workflow

### 0. 需求引导 Briefing（先问，别直接开做）

Brief 含糊时，先向用户确认 4 个核心问题（每题给选项 + 推荐默认，最多 4+2 问，别轰炸）：

1. **风格**：swiss / editorial / minimal / experimental / cyberpunk / 自由描述
2. **内容**：标题 / 副标题 / 日期 / 地点 / 价格 / CTA（没给就用占位，强调可改）
3. **交互（必问，风格之后紧接着问）**：先问"要不要互动"，再问方式/位置/触发——
   - **互动方式**（给例子让用户选）：a) 鼠标移到人物/元素 → 高亮 + 弹信息卡  b) **按钮型切换海报风格**（点按钮换主题） c) **点击人物触发活动**（打开链接/触发效果） d) 点击展开详情 e) 炫技型
   - **触发位置**：人物/动物轮廓（自动抠图）/ 指定区域（圈选·坐标）/ 整幅画面
   - **触发方式**：悬停 / 点击 / 悬停+点击钉住
   - 落 spec：hotspot `mode`/`interaction`/`action` + 坐标，或 `style.switchPhases`；详见 references/briefing.md 3b
4. **配色**：12 种色彩策略挑一 / 参考图 / 品牌色 / 随机出几个方向让用户挑

可选：尺寸（默认 1200×1600）、参考图/Logo、**动态数据**（时间相位 `--time` / 实时天气 `--weather 城市` / 无按钮热点——用户说"会变/跟时间走/每人不一张"就选这里，详见 references/briefing.md 第 7 问）。

**有主人公/角色？先问用户选哪条路**（若当前模型不支持生图，明确告知可用 AI 合成替代，见 Rules）：① 用户上传角色图（放进 `imagery.image`，热点对准角色）；② 用 imagegen 生成原创角色插画（需要生图模型，先征得用户同意）；③ 联网找参考图。角色档案用热点 `meta`/`sections`（参考 references/web-research.md）。

**用户上传了图片但没提要求？先问「图片里要用哪些元素」**——不要默认主角就是人物/整张图都要：
- ① **主体**（人物/动物/产品）→ 抠图（分割模型）+ `imagery.image.silhouette` 剪影高亮 + 热点档案
- ② **背景/场景** → 整图保留，只取背景氛围
- ③ **配色** → `analyze`/`palette` 取主色板进方案
- ④ **图中文字/Logo**（若图内有）→ 程序化重排或裁剪成素材
- ⑤ **整体风格** → 仅作参考（指纹 → `plan --fingerprint`）
- ⑥ **全都要** / 拿不准
最多问一次、每题给选项；用户没耐心 → 默认「主体 + 配色」并在交付时说明可改。

**想找类似海报做参考？** 用联网搜索找 1-3 张 → 下载到 assets/reference/web/ → `poster.js analyze` 出指纹 → `plan --fingerprint` 进方案（参考 references/web-research.md）。

**用户上传了参考海报？先分析再问**：
```bash
node scripts/poster.js analyze <参考图>
```
拿到设计指纹（主色板/明暗/色温/布局猜测/密度/文字带/策略猜测）后，带着对参考图的理解去提问，例如：
- "参考图是深色+居中+高对比+红色强调，完全延续还是只留配色？"
- "配色直接用参考图主色板，还是换策略？"
指纹中的 palette 可直接 `render --palette`。详见 references/reference-analysis.md。

规则：用户没耐心 → 全用推荐默认；用户给了自由描述（如"90 年代欧洲地下海报"）→ 由你翻译成 Design Vocabulary。
完整问题库与答案→spec 映射见 references/briefing.md；也可用 `node scripts/poster.js brief ...` 把答案直接生成 spec。

### 1. Parse the brief
从用户请求提取：
- 主题 / 标题、文案（标题/副标题/日期/地点/价格/CTA）
- 尺寸（默认 1200×1600；A4/16:9/9:16/1:1 换算成 px）
- 场景（活动/音乐/电影/品牌/社交/展览）→ 影响构图与调性
- 风格关键词；参考图（可选，用于取色）；Logo/产品图（可选）

### 2. Design Director：一次出 6 个方向（再选择）

也可以直接用**统一词表**组合设计语言（不翻代码）：
```bash
node scripts/poster.js vocab list        # 40 原语 + 5 风格
node scripts/poster.js vocab compose --layout split --type serif --color duotone --fx hover:glitch --graphic ball --out out/x --render
node scripts/poster.js vocab validate <spec.json>
```
详见 references/design-vocabulary.md。

选定方向后，先输出 **9 维度设计方案** 给用户确认，再生成：
```bash
node scripts/poster.js plan <spec.json> --fingerprint <指纹.json> --out out/design-plan.md
# 输出：Visual Direction / Typography / Color / Composition / Image / Grid / Hierarchy / 留白 / 纹理
```
尺寸可用预设：`--size A4|A3|16:9|9:16|1:1|3:4|2:3`（或直接 WxH）。


不要只出一个设计。先用 directions 生成 6 种**设计逻辑**（色彩策略 × 排版 × 字体 × 动效）：

```bash
node scripts/poster.js directions <spec.json> --seed 2026 --render --out out/directions
# 打印对比表 → 打开 out/directions/d0..d5/ 挑 1 个 → 如需微调再 render --pick N
```

方向由 12 种**色彩策略**（monochrome/duotone/triadic/analogous/complementary/muted/high-contrast/
black-accent/warm-neutral/cold-neutral/unexpected-accent/no-color）× 5 种排版 × 4 种字体组合而成，
同 seed 可复现。

用户有明确风格时（如"90 年代欧洲地下海报"）：
### 2. Choose design direction

- 无明确风格 → 按场景选预设：`swiss | editorial | minimal | experimental | cyberpunk`（见 references/visual-styles.md）
- 品牌类 → 定义一个 ≤6 色小色板 + 1 个展示字体 + 1 个正文字体，保证系列一致
- 给参考图 → 用 `poster.js palette` 取主色再合并进 spec

### 3. Write Design Spec
按 `../engine/schema/design-spec.schema.json` 写 JSON（必填：canvas / content.title / style.colors+typography）。
- `content` 放**真实文案**（HTML 程序化排版，绝不把文字画进位图）
- 排版模式：`style.layout.mode` ∈ `classic | hero | split | minimal | dynamic`（默认 classic）
- `animation`：`title.reveal=chars`、`particles={count}`、`scroll.reveal=true`
- `interactions`：`background.parallax`、`glow.cursorLight`、`poster.tilt3d`、`date.click=expand`、`cta.hover=magnetic`
- 交互词汇：标题 `effect=distort|glitch|color-shift|scale`、`click=explode`、`cursor.type=ring`、`ball.repel`（详见 references/interactions.md）
- **时间生命周期**：`style.timePhases = [{hour,label,name,colors,fx}, …]` 4 个相位，海报按真实时间自动切换配色/滤镜（8AM 明亮 → 2PM 高对比 → 8PM 霓虹 → 2AM 暗颗粒模糊），右下角时间芯片：单击循环相位、双击回到 LIVE
- **实时天气海报**：`style.weather = { defaultCity, lat, lon, phases:[{match:{group,isDay}, colors, fx}] }`，打开时定位城市 → 拉 Open-Meteo 实时天气 → 匹配相位（晴/云/雨/雪/风暴 × 昼夜），雨幕/星空随相位开合；标题会换成你的城市，右下角芯片显示「LIVE · 城市 · 温度」（详见 references/interactions.md）
- 图形层：`style.imagery.ball = { depth }` 可加一个 CSS 绘制的可视差图形（如篮球）
- 无按钮交互：`content.hotspots = [{x,y,r,label,detail}]`（图片/画面上点击区域）+ `style.imagery.image = { src, duotone, scrim, zoom }` 图片层；不写 cta/date 即零按钮
- **人物/动物高光**：热点加 `mode:"hover"` + `rx/ry` 椭圆区域——鼠标移到角色身上 → 人物高光 + 档案卡浮现（点击可钉住），详见 references/interactions.md

### 4. Render + self-check + iterate
```bash
node scripts/poster.js render <spec.json> --out out/<name> --critic     # 渲染 + Design Critic 评分
node scripts/poster.js iterate <spec.json> --max 5 --out out/<name>     # 自动迭代到 PASS
```
Critic 提示 NEEDS IMPROVEMENT 时：优先修 对比度 / 标题溢出（降 `style.typography.titleScale`）/ 字号，然后重跑。

Critic 还会输出 **AI-ness 分数（0-100）**：检测通用紫粉配色 / 霓虹组合 / 装饰堆叠 / 居中构图 / 层次不足。**AI-ness ≥25 判为不合格**（即使设计分 ≥7），用 iterate 自动降 AI 味（改色相、减装饰、换非居中排版）后重跑。

### 5. Preview & verify
```bash
node scripts/poster.js serve out/<name> [port]
```
在浏览器里实际验证：hover 变形、鼠标视差/倾斜、点击展开、滚动显现。交付前截图（可用 Playwright/系统浏览器截图工具）。

## poster.js 命令

| 命令 | 作用 |
| --- | --- |
| `render <spec> --out <dir> [--preset x] [--palette p.json] [--critic]` | 渲染（可选套预设/色板/评分） |
| `iterate <spec> --max n --out <dir>` | 自动迭代到 PASS |
| `palette <image> --colors n --out p.json` | 参考图取主色（需 Python + PIL） |
| `protagonist <照片 | --generate 描述> [--title 片名] [--engine mediapipe|rembg|auto] [--multi] [--names A,B] [--out dir] [--critic]` | 一键主角电影海报（分割→剪影高亮→hover 档案卡；`--multi` 多人/多元素；`--generate` 无图时用 imagegen 生成主角） |
| `imagegen <prompt> [--out png] [--size WxH]` | 生图桥接（需 image_gen 工具或 OPENAI_API_KEY；否则输出 AI 合成方案） |
| `group <合影> [--out dir]` | 多人圈选命名页 → 下载 labels.json → `protagonist --labels` 生成每人档案卡 |
| `export <spec.json> --out poster.png [--width 1200]` | 渲染 + **无头 Chrome 导出 PNG**（零依赖，自动探测系统 Chrome/Edge，可设 `CHROME_PATH`） |
| `detect <图片> --out coords.json` | mediapipe **五官坐标**（眼睛/嘴/鼻/下巴，代码合成 overlay 定位用） |
| `dna <dna.json> \| --template` | **Design DNA** 校验（schema）+ 风格兼容规则 + 反 AI 审美风险 |
| `director "<brief>" [--preset key] [--title X] [--render]` | **Design Director**：brief → 选预设 → 变异 → DNA → spec → 渲染（空泛词拦截） |
| `bench [--seed N] [--limit M] [--out dir]` | 基准：24 条多样 brief → 多样性/质量报告（Diversity ≥0.70） |
| `serve [dir] [port]` | 本地预览（自动找可用端口） |

### 切换 & 零按钮交互（高级 spec 字段）

- `style.switchPhases[].image`：每个相位可指定**图片 URL**——点击切换时图片与配色/相位同步变化（如人物本体换装、场景切换）
- `style.hideStyleSwitch: true`：**零按钮**——不渲染 STYLE 按钮，改为点击主体切换（hotspot `action:{ type:"phase" }` 循环相位）
- hotspot `quiet: true` + `dot: false`：隐藏圆点/脉冲装饰，让"点击本体"而不是"点按钮"
- `style.layout.middleAlign`（如 `"32%"`）：标题竖向定位到画面指定高度（如人物头部居中）
- `style.typography.titleBlend`（如 `"screen"`）：标题与底图融合（mix-blend-mode）
- `style.typography.titleNowrap: true`：标题**强制单行**（配合 `titleScale` 控制大小；标题要"一行/顶端/头部"时用）
- `fx.hue`（如 `12`）：相位级**色相旋转**，配合 `saturate/contrast` 做霓虹/电影调色
- `style.imagery.overlay`（SVG 字符串）：**代码合成覆盖层**，仅相位>0 显示——墨镜/枪/烟雾/激光等元素用 SVG 精确定位（坐标用 mediapipe FaceLandmarker 检测，别猜比例）
- 参考示例：`examples/mona-two-faces/spec.json`（蒙娜丽莎 原画↔赛博朋克，点击她本人切换）

## Rules

- 文字一律程序化排版（HTML/SVG），不交给图像模型；标题/日期/Logo/二维码必须 100% 准确
- 色板 ≤6 色；正文/背景对比度 ≥4.5:1，强调色 ≥3:1（critic 会检查）
- 标题必须放进画布：溢出时降低 `titleScale` 或缩短文案
- 保持层级：标题 ≥2× 副标题字号
- 尊重 `prefers-reduced-motion`（engine 已处理）
- 交付内容：`index.html` 路径 + 浏览器截图（如能截图）
- **生图模型策略（先预检通道，再定路线，别先承诺效果）**：当功能需要"生成式图像模型"（原创角色插画/背景生成等）时，**先确认当前有没有可用生图通道**：① 内置 image_gen 工具 ② `OPENAI_API_KEY` ③ OpenAI 兼容中转（`OPENAI_BASE_URL`，如 Agnes `https://api.agnes-ai.cn/v1`）；注意**中转/低价图模型做大幅图生图改造往往很弱**（构图几乎不变、只加光晕是常见症状），不要先承诺效果。**生成前提前告知用户预期效果**（当前通道能到什么水平），**想要更好效果建议使用真正的生图大模型**（内置 image_gen / gpt-image / 更强图模型），否则接受当前通道效果或走代码合成。然后**先询问用户意见**（要上传素材、还是要 AI 生成、还是要联网参考），不要擅自决定。**AI 生成必须先出 1 张草稿给用户确认再继续**；同一需求 ≤2~3 次不满意就**止损**（停止消耗额度/费用），切路线或换服务，并明确告知用户该通道能力有限。若当前环境/模型**不支持生成图片**，**明确告知用户**仍可通过 **AI 合成** 完成：① **代码合成**（原图 + CSS 滤镜分级 `fx.hue/saturate/contrast` + SVG 覆盖层 `imagery.overlay` 按相位显示 + **mediapipe 检测坐标定位**覆盖元素，身份保真、免费可迭代）② 图像处理（分割抠图/滤镜/取色/裁剪）③ 素材三源（用户上传 / imagegen 生成 / 联网参考），并让用户选路径

## V1 管线（Design DNA 优先）

```text
Brief
  → Design Director（poster.js director）：理解 brief → 选 2-4 设计运动 → 预设起点 → 变异
  → Design DNA（engine/design-dna：create/validate/serialize/load/toSpec）
  → 兼容检查（poster.js dna：schema 校验 + compatibility + 反 AI 风险）
  → dna to-spec（DNA → 渲染 spec）
  → Renderer → Motion/Interaction（语义化映射）
  → Design Critic + Anti-AI（engine/anti-ai 统一规则源）
  → iterate（每轮截图 QA，上限 3）
  → Final Poster
```

核心原则：风格标签只是灵感来源；**每个海报必须有 Design DNA**；交互因概念而生；反 AI 默认（紫青渐变/过量光晕/粒子/居中一切需明确要求才用）。

```text
node scripts/poster.js director "地下电子音乐节海报" --render   # 一条命令出海报
node scripts/poster.js bench                                     # 多样性/质量基准
```


## Design DNA（v1，可选进阶）

把"风格关键词"升级为结构化设计决策。资源在 `engine/design-vocabulary/`：
- `design-vocabulary.schema.json` — Design DNA JSON Schema（19 个维度：composition/grid/typography/color/…）
- `design-vocabulary.md` — 给 Agent 的设计语法说明（决策顺序、数值约定、反 AI 默认）
- `compatibility.json` — 风格兼容规则 + 反 AI 反模式
- `dna.js` — 零依赖校验/兼容/风险模块；CLI：`node scripts/poster.js dna <dna.json> | --template`
- `design-presets.json` + `dna-presets.js` — **36 个差异化 Design DNA 预设库**（swiss-international / japanese-experimental / brutalist-editorial / luxury-fashion / art-school-poster / 90s-tech / underground-music / contemporary-museum / experimental-typography / photocopy-punk / risograph / neo-editorial / minimal-luxury / anti-design / information-dense / cinematic / techno-rave / vaporwave / …），CLI：`node scripts/poster.js dna-presets [list|show <key>|pick <需求>|mutate <key> --color x --orientation x --density n --interaction static|showcase --seed n]`

生成流程建议：Brief → **`dna-presets pick` 选预设起点 → `dna-presets mutate` 按用户需求变异** → `dna` 校验/兼容检查 → 渲染 → critic → 迭代。

## 渲染引擎能力（P7–P12，spec 可选字段）

- **Grid Engine**：`style.layout.gridType` = `4_column/6_column/8_column/12_column/baseline/modular/broken/custom/none` + `breakGrid`（0..1，破格叠加层）+ `gridVisible`
- **Typography-as-Image**：`style.typography.titleVertical / titleRotate / titleCrop(0..1) / titleOverlap / titleOversize`——标题可纵向、旋转、裁切、重叠、超大
- **Materiality**：`style.materiality = { medium: paper|xerox|risograph|screen_print|film|newspaper|magazine, imperfection, grain }`——纸纹/复印噪点/孔版错版/网点/胶片颗粒
- **Semantic Graphics**：`style.graphics[]`（SVG）——`grid/number/barcode/coordinate/annotation/diagram`；decorative 默认不渲染
- **Motion**：`animation.motionStyle` = `subtle/organic/mechanical/kinetic/fluid/cinematic/glitch/elastic`——每种独立 CSS 动效；静态预设不加
- **Interaction**：`interactions.spotlight`（追光层）、标题效果 `morph / expand`（typography_expand）；交互强度高时 DNA→morph+spotlight
- 以上全部由 Design DNA 自动映射（`dna to-spec` / `director`），无需手写。

## 完整工作流（TASK-022：15 步）

```text
1.  Understand Brief
2.  Select Design Presets
3.  Generate Design DNA
4.  Validate Compatibility
5.  Generate 3 Design Directions
6.  Select Direction
7.  Generate Visual Assets
8.  Render Layout
9.  Add Motion
10. Add Interaction
11. Run Design Critic
12. Run Anti-AI Check
13. Mutate if necessary
14. Render Again
15. Final Validation
```

> **Do not optimize for "pretty". Optimize for coherent visual decisions, meaningful variation, strong hierarchy, and low generic-AI aesthetics.**

## 首次使用引导（First-Time UX）

> **Don't prompt the poster. Art-direct it.** 首次体验像和艺术总监合作，不是配置 AI 生图器。
> 完整规范：`docs/first-time-ux.md`；意图→DNA 翻译：`engine/intent/index.js`；目标：<90s 出结果、生成前 ≤2–4 个决策。

**新用户必走流程（Agent 引导，隐藏所有内部术语）**：

```text
Welcome（MAKE SOMETHING WORTH LOOKING AT / Start creating / Surprise me）
→ Brief（你要做什么？一句话 + 类别 + 可选 标题/日期/地点/品牌/CTA）
→ Mood（它应该是什么感觉？选 2–3 个词：RAW/LOUD/SPARSE/PHYSICAL…）
→ Explore（三个方向我们都可以试试 → `poster.js explore "<brief>" --moods A,B`）
→ Choose（好选择，我们再推进一步）
→ Refine（我们要改什么？`poster.js refine <dna.json> "<反馈>"`，自然语言→定向 DNA 变异）
→ Generate（静态 / 动态 / 交互）
→ Evolve（不从头再来，版本可回退）
```

**文案**：用 "How should it feel? / Three ways we could take this. / What should we change? / Let's push it further."；禁止 "Select your Design DNA preset" 等技术话术。
**错误态**：保留用户选择（"That direction didn't come together. 你的选择都还在。"），绝不抹掉当前 DNA。
**老用户**：跳过引导，显示 "What are we making today?"。

**素材智能（Material Intelligence）**：用户上传图片/Logo/纹理成为一等设计素材——
- `poster.js materials <图片...>` —— 上传板 + 分析（尺寸/朝向/主色/对比/人物/Logo）+ 角色推断 + 处理建议
- `explore/director --image <path> [--role hero] [--treatment duotone]` —— 素材进入 3 方向 / 单海报（同一素材不同处理）
- `refine "把它做成双色调"` —— 自然语言素材指令 → 改 role/treatment/hierarchy
- 源图默认保留（source fidelity）；Critic 有素材整合维度；evolve 不重新生成源图
- 详情：`docs/material-intelligence-ux.md`
**Phase D/E（已完成）**：`poster.js evolve`（演化 + 版本历史可回退）/ `poster.js surprise`（随机主题 3 方向）/ `poster.js lab`（高级 Design Lab）。

## References

按需读取（不要一次性全读）：
- `references/poster-design-principles.md` — 设计循环与批判维度
- `references/typography.md` — 排版层级/字号比例/适配
- `references/composition.md` — 构图/网格/Z 轴分层
- `references/color.md` — 配色角色与对比度
- `references/visual-styles.md` — 风格预设速查与适用场景