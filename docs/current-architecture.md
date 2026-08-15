# 当前架构审计（TASK-001）

> 版本：V0.9→V1.0 前 · 2026-08-16 · 对应 CODEX_TASKS.md TASK-001
> 结论：**V0 引擎功能完好，85/85 测试通过，端到端渲染正常**。V1 不需要重写，只需在现有引擎上补"Design DNA 中枢 + 管线串联"。

---

## 1. 当前数据流

```text
User Brief
   ↓
Skill 大脑（SKILL.md 引导 + Agent 分析）
   ↓
Design Spec (JSON) —— schema/design-spec.schema.json（契约）
   ↓
Engine 身体（poster-engine）
   ├─ renderer（HTML/SVG/CSS 自包含输出）
   ├─ presets / color-strategy / palette / typography / layout
   ├─ critic（评分 + Anti-AI）
   ├─ iterate（自动迭代）
   └─ scripts/*.js（CLI）
   ↓
自包含 index.html（交互海报）
   ↓
serve / export（PNG）/ 浏览器预览
```

关键点：**当前唯一契约是 Design Spec（JSON）**；Design DNA 尚未进入主渲染管线。

---

## 2. 目录与模块（对照 CODEX_TASKS.md 拟议结构）

| 任务文档拟议 | 实际位置 | 说明 |
| --- | --- | --- |
| `schema/design-vocabulary.schema.json` | `poster-engine/design-vocabulary/design-vocabulary.schema.json` | ✅ 已内置（19 维度 Design DNA Schema） |
| `schema/design-vocabulary.md` | `poster-engine/design-vocabulary/design-vocabulary.md` | ✅ 语法文档 |
| `schema/compatibility.json` | `poster-engine/design-vocabulary/compatibility.json` | ✅ 兼容/反 AI 规则（10 条） |
| `presets/design-presets.json` | `poster-engine/design-vocabulary/design-presets.json` | ✅ 36 个 Design DNA 预设 |
| `src/design-dna/` | `poster-engine/design-vocabulary/dna.js` + `dna-presets.js` | ✅ 校验/兼容/风险/挑选/变异（零依赖） |
| `agents/design-director.md` | ⚠️ 部分存在 | `scripts/directions.js`（6 方向）+ `scripts/brief.js` + `design-plan/`；尚无独立 design-director agent 文档 |
| `docs/current-architecture.md` | 本文件 | ✅ TASK-001 交付 |

引擎模块清单：
- **renderer**（核心）：spec → 自包含 HTML/SVG/CSS；支持排版/网格/动效/交互/天气/时间相位/switchPhases(含 image)/SVG overlay/零按钮热点
- **typography / layout**：类型比例、网格与层叠
- **color-strategy / palette / presets**：12 色彩策略、取色、5 风格预设
- **critic**：9 维度评分 + Anti-AI（AI-ness）
- **iterate**：render → critic → 规则修 → 重渲，直到 PASS/上限
- **design-vocabulary**：DNA schema/md/compatibility/design-presets + dna/dna-presets 模块
- **weather / animation / interaction**：数据驱动与交互附件
- **scripts**：render / iterate / directions / brief / vocab / plan / weather / protagonist / imagegen / group / export / detect / dna / dna-presets / serve / palette / analyze
- **tests**：23 个测试文件，85 用例

---

## 3. 当前优势（V0 可复用资产）

1. **纯代码排版**：文字 100% HTML/SVG 程序化输出，不交给图像模型——标题/日期/二维码可精确。
2. **自包含输出**：单文件 index.html，零外部依赖，可直接预览/导出。
3. **零 npm 依赖引擎**：全部 Node 内置模块 + 可选 Python（分割/取色），打包进 exe 容易（PosterStudio 已验证）。
4. **已有 36 个 Design DNA 预设 + 校验/兼容/反 AI 风险工具**（V1.0 刚落地）。
5. **Critic + 自动迭代**：9 维评分 + Anti-AI 检测 + iterate 循环。
6. **交互种类多**：视差/光晕/3D 倾斜/热点(零按钮)/时间/天气/图片级相位切换/SVG overlay。
7. **CLI 完整**：18 个命令覆盖设计全流程 + PNG 导出 + 五官检测。

---

## 4. 当前弱点 / 与 V1 目标的差距

1. **Design DNA 未进主管线**（最大差距）：`directions.js` 用的是"色彩策略/排版/预设"组合生成方向，不是从 Design DNA 出发；`brief → spec` 仍主要靠 Agent 直接写 spec。V1 要求 `Brief → Director → DNA → 兼容检查 → 渲染`。
2. **无独立 Design Director**：没有把"理解 brief → 选运动 → 产出 DNA"固化成 agent 文档/规则（vague 词拦截、受众/基调识别）。
3. **DNA → spec 适配器缺失**：DNA 能校验，但还不能自动映射成渲染 spec（布局/排版/配色/交互）。
4. **方向多样性未量化**：`directions` 生成 6 方向但无 Diversity Score 度量（V1 目标 ≥0.70）。
5. **Motion/Interaction 未语义化**：目前大多"有交互默认加炫技"或按 spec 显式声明，没有"概念 → 交互模式"的映射层（V1：交互必须因概念而生）。
6. **Screenshot QA 非自动**：PNG 导出已做（`export.js`），但未接入 iterate 的自动截图验收。
7. **基准测试缺失**：无 ≥20 条 brief 的 benchmark 套件。
8. **Anti-AI 规则未全自动生效**：compatibility 的 when 字段匹配已升级，但 renderer 仍不会主动规避（如紫青渐变默认值）。

---

## 5. 重复逻辑 / 技术债

1. **路径解析重复**：`render.js/iterate.js/directions.js/...` 各自实现 specPath/flagVal 解析（可抽公共 `cli-utils`）。
2. **spec 构建分散**：`brief.js`、`directions.js`、`protagonist.js`、`weather.js`、GUI(exe) 各有一份 spec 组装逻辑——是 DNA→spec 适配器的天然收口点。
3. **`schema/` 与 `design-vocabulary/` 并存**：spec schema 与 DNA schema 分处两处，V1 应明确"Spec=渲染契约、DNA=设计意图"两个层次。
4. **`out/` 目录被 git 忽略但本地累积**：大量示例输出（可清理/可 gitignore 已配）。
5. **设计词汇有历史重叠**：`design-vocabulary/index.js`（LAYOUT/TYPOGRAPHY/COLOR 原语）与 `design-vocabulary/dna.js`（DNA）概念不同但同目录，需在文档里区分。
6. **critic 的 AI-ness 与 dna.aiRiskScore 两套反 AI 逻辑**：可统一为同一规则源。

---

## 6. 推荐集成点（TASK-002 起，按 CODEX_TASKS.md 顺序）

| 阶段 | 集成点 |
| --- | --- |
| TASK-002 设计 DNA 中枢 | 新增 `poster-engine/design-dna/index.js`：`DesignDNA{ create / validate / serialize / load / toSpec }`，复用现有 `dna.js` 校验；`toSpec()` 即 DNA→spec 适配器 |
| TASK-003 Design Director | `poster-design/agents/design-director.md` + `scripts/director.js`（brief → DNA，拦截 vague 词）；brief.js 改为产出 DNA 再 `toSpec` |
| TASK-004 预设（已有） | 复用 `design-presets.json`（36 个）→ 只需补"结构差异度量"测试 |
| TASK-005 变异引擎（已有） | 复用 `dna-presets.js mutate` → 补确定性测试与 CLI 回归 |
| TASK-006 3 方向 | `directions.js` 改为"pick 3 个预设 → mutate → 各渲染一版对比" |
| TASK-007+ 色彩/排版/版式 | 在 `toSpec()` 内把 DNA.color/typography/composition 映射到 spec.style |
| TASK-013 Critic / TASK-014 Anti-AI | 统一 critic 与 dna.aiRiskScore；规则源 = compatibility.json |
| TASK-015 自动迭代 | iterate 接入 export 截图 QA + DNA 变异重试（上限 3） |
| TASK-019 基准 | 新增 `tests/bench/` ≥20 brief → 全流程跑分 |

---

## 7. 验收核对（TASK-001 Acceptance）

- [x] 现有 V0 仍工作（85/85 测试 + 端到端渲染正常）
- [x] 无无谓重写（本阶段仅新增文档，未改任何引擎代码）
- [x] 架构文档存在（本文件）


---

## 8. V1 进展对照（CODEX_TASKS 推进记录）

| 阶段 | 状态 | 落点 |
| --- | --- | --- |
| TASK-001 审计 | ✅ | 本文档 |
| TASK-002 Design DNA 中枢 | ✅ | `poster-engine/design-dna/index.js`（create/validate/serialize/load/toSpec）+ `dna to-spec` |
| TASK-003 Design Director | ✅ | `agents/design-director.md` + `poster.js director` |
| TASK-004/005 预设 + 变异 | ✅ | `design-presets.json` 36 个 + `dna-presets.js` mutate（结构指纹两两唯一） |
| TASK-006 三方向 | ✅ | `directions.js`：pick 3 预设 → 各变异渲染 |
| TASK-014 Anti-AI 统一 | ✅ | `poster-engine/anti-ai/index.js`（critic + dna 共用规则源） |
| TASK-015/016 迭代截图 QA | ✅ | `iterate.js` 每轮 qa-N.png，上限 3；`export.js` 可复用 capturePoster |
| TASK-017/018/019 基准+多样性 | ✅ | `tests/bench/briefs.json` 24 条 + `poster.js bench`（Diversity 0.75 ≥0.70） |
| Phase 20 Compatibility | ✅ | compatibility + 字段条件匹配（minimalism/high_motion/print_physicality…） |
| Phase 21 SKILL.md | ✅ | 本仓库 SKILL.md 已写入 V1 管线 |
| Phase 22 回归 | ✅ | 99/99 测试 |
| Phase 23 文档 | ✅ | 本文档 + work-progress DoD 对照 |

V1 核心能力一句话：**Brief → Design Director → Design DNA → 兼容检查 → 渲染 → critic → 迭代**，且默认压低 AI 审美（基准 AI-ness 1.3/100）。
