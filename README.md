# Interactive Poster Design — 交互式海报生成 Skill

![test](https://github.com/Jvcki3000/interactive-poster-design/actions/workflows/test.yml/badge.svg)

把「输入需求 → 引导 → 设计方向 → 生成 → 自检 → 迭代」变成一条命令的 **Codex Skill**。

> **Don't prompt the poster. Art-direct it.** —— 首次体验像和艺术总监合作，而不是配置 AI 生图器。

## 一句话

仓库根目录即完整 Skill（`SKILL.md` 在此）：**一个目录，零外部依赖，装进去就能用**。

```
Brief → Design Director → Design DNA → 兼容检查 → 3 方向 → Renderer → Motion/Interaction → Critic → Anti-AI → 迭代
```

## 能力

- **Design DNA 中枢**：schema 校验 / 36 个结构化预设 / 受控变异 / DNA→spec 适配器
- **Design Director**：一条命令出海报（`poster.js director "<brief>" --render`）
- **首次使用引导**：Welcome → Brief → Mood → 3 方向 → 细化 → 生成 → 演化（隐藏内部术语，<90s 出结果）
- **渲染引擎**：Grid / Typography-as-Image / 语义图形 / 物理材质 / 8 种动效 / 零按钮交互
- **质量闭环**：Design Critic（10 维）+ Anti-AI（统一规则源）+ 自动迭代（≤3，截图 QA）+ 基准（Diversity ≥0.70）

## 安装（其他 Agent）

```bash
git clone https://github.com/Jvcki3000/interactive-poster-design.git
# 链接到 ~/.codex/skills/poster-design（Windows mklink /J，macOS/Linux ln -s）
# 或 codex skills install --repo Jvcki3000/interactive-poster-design --ref main
```

依赖：Node ≥ 18（可选 Python + pillow/mediapipe/rembg，用于取色/分割）。

## 快速开始

```bash
cd <repo>
node scripts/poster.js director "地下电子音乐节海报" --render    # 一条命令出海报
node scripts/poster.js explore "<brief>" --moods RAW,LOUD        # 首次体验：3 个方向
node scripts/poster.js bench                                      # 基准 + 多样性报告
node scripts/poster.js dna-presets list                           # 查看 36 个设计预设
```

## 文档

- `docs/first-time-ux.md` — 首次使用引导
- `docs/architecture.md` / `design-system.md` / `presets.md` / `mutation.md` / `critic.md` / `interaction.md` / `benchmarking.md`
- `agents/` — design-director / design-critic / interaction-director
