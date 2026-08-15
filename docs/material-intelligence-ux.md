# 素材智能（Material Intelligence）—— 上传素材流程引导

> 版本 1.0.0 · 对应 MATERIAL_INTELLIGENCE_UX.md · 核心理念：**"Don't just place the material. Art-direct it."**
> 用户上传的图片/Logo/图形/纹理是**一等设计素材**，不是附件。系统要"理解它、给它角色、设计它"。

## 0. 管线

```text
User Material → Material Intelligence → Material Analysis → Material Role → Material Treatment → Design Direction → Design DNA → Poster
```

用户心智：**"我把素材给了 AI，它真的用素材设计了"**（而不是"AI 把照片塞进模板"）。

## 1. 首次流程（素材可选，插入 Brief 之后）

```text
Welcome → Brief → [Materials] → Mood → Explore 3 方向 → Choose → Refine → Generate → Static/Animated/Interactive → Evolve
```

- 无素材：Brief → Mood（原流程不变）
- 有素材：Brief → **Materials（上传/选择）→ Material Intelligence（分析/角色/处理）** → Mood

### Materials 屏
- 问：**"你有没有想用的东西？"** 副文案："照片、Logo、图形、纹理——把你的素材带进来。"
- 动作：[ 上传图片 ] [ 上传 Logo ] [ 上传素材 ] [ 不带素材继续 ]
- 禁止技术文案（"上传源资产/配置素材管线"）。

### Material Board
- 展示：预览 + 文件名 + 类型 + 移除；"再加一个素材"。
- 每个素材有：id / source_type / source_url / filename。
- 默认不暴露分析元数据。

## 2. Material Intelligence（分析）

上传后分析（尽量支持）：subject / subject_type / orientation / aspect_ratio / dominant_colors / color_temperature / brightness / contrast / visual_weight / composition / background_complexity / texture / depth / human_presence / face_presence / brand_elements / logo_presence / text_presence / potential_crops。

引擎：`scripts/material_analyze.py`（PIL；可选 mediapipe 人脸）→ JSON。

## 3. Material Role（角色，可被用户改）

内部角色：hero / secondary / background / texture / collage / logo / information / decorative。

用户面选项（不用技术名）：**Hero / 背景 / 设计元素 / 纹理 / 给我惊喜**。

示例：人物照→hero；Logo→logo；纸纹理→texture；产品图→hero；小插画→decorative。

## 4. Material Treatment（处理，不改源图）

只做渲染器支持的：original / crop / cutout(抠图) / duotone / monochrome / threshold / halftone / photocopy / collage / mask。

映射：duotone→imagery.duotone；cutout→imagery.silhouette；halftone/photocopy→grain+contrast；monochrome→saturate 0；crop/zoom→imagery.zoom。

**默认保留源图**（source fidelity）；产品/Logo/源素材不得被静默改写。

## 5. 素材进入 Design DNA

DNA 增加 `materials` 数组：`[{ id, source_type, source_url, filename, role, treatment, hierarchy, placement }]`。

- role：hero / background / texture / logo / collage / decorative…
- hierarchy：0..1（视觉层级权重）
- placement：center / edge / corner / full_bleed / multiple
- toSpec：`materialsToSpec()` 把素材映射到 `spec.imagery.image`（hero/background）或叠加层（texture/logo/collage）。

## 6. 素材感知的能力

- **3 方向**：同一素材可产生 3 个不同方向（角色/处理/层级/构图不同，不只换色）。
- **细化**：自然语言素材指令（"把它做成双色调""素材太大"）→ 定向 DNA 变异（改 role/treatment/hierarchy）。
- **Critic**：新增 4 维——Material Usage / Material Hierarchy / Source Fidelity / Material Integration。
- **演化**：`poster.js evolve` 保留源素材（只变 role/treatment/布局，不重新生成源图）。

## 7. 命令行

```bash
poster.js materials <图片...>                 # 上传板 + 分析 + 角色 + 处理建议
poster.js explore "<brief>" --image <path> --role hero --treatment duotone
poster.js director "<brief>" --image <path> --render
poster.js refine <dna.json> "把它做成双色调"
```

## 8. 验收（DoD）

- 可上传 1 张 / 多张 / 移除素材；无素材流程不变。
- 上传图被分析；类型/视觉属性/角色被推断；角色可改。
- 素材进入 DNA；同一素材可出 3 个不同方向；处理可变；层级可变；演化不重新生成源图。
- Critic 评估素材整合；Anti-AI 检测"贴图式"布局；源保真默认开启。
- 现有 V0 / 无素材 / 导出 / 测试全部保持。
