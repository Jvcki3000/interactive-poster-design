# Design Vocabulary — 设计语言词表

统一词表：`design-vocabulary/index.js`（renderer / directions 已引用，单一来源）。

## 词表规模（共 45 条 = 40 原语 + 5 风格组合）

| 维度 | 数量 | 原语 |
| --- | --- | --- |
| layout 排版 | 5 | classic · hero · split · minimal · dynamic |
| typography 字体 | 4 | grotesque · condensed · serif · mono |
| color 色彩 | 12 | monochrome · duotone · triadic · analogous · complementary · muted · high-contrast · black-accent · warm-neutral · cold-neutral · unexpected-accent · no-color |
| interaction 交互 | 14 | hover: distort/glitch/color-shift/scale · click: explode/expand · cursor: ring/magnetic/repel/parallax/light/tilt3d · scroll: reveal · env: particles |
| graphic 图形 | 3 | ball · image · hotspot |
| style 风格预设 | 5 | swiss · editorial · minimal · experimental · cyberpunk（组合层） |

## 用法

```bash
node scripts/poster.js vocab list                                          # 打印全部词表
node scripts/poster.js vocab compose --layout dynamic --type condensed \
  --color unexpected-accent --fx hover:glitch --fx cursor:ring \
  --graphic ball --title "X" --out out/lang --render                       # 组合原语 → spec + 渲染
node scripts/poster.js vocab validate <spec.json>                          # 校验 spec 用到的词表是否合法
```

## 组合设计语言（chat2 第 ③ 点落地）

不再翻代码找能力，直接选原语组合：
```bash
# 例：broken-grid 感 → dynamic + condensed + black-accent + repel + 篮球
node scripts/poster.js vocab compose --layout dynamic --type condensed --color black-accent \
  --fx hover:glitch --fx cursor:repel --graphic ball --title "COURT" --out out/court --render
```

## 代码用法
```js
import { listVocabulary, compose, validateCombo } from '../design-vocabulary/index.js';
const spec = compose({ layout: 'split', type: 'serif', color: 'duotone', interactions: ['hover:glitch'], graphics: ['ball'] });
validateCombo(spec); // { valid, issues }
```


## 尺寸预设（输入层）

| key | 尺寸 px | 用途 |
| --- | --- | --- |
| a4 / a3 | 794×1123 / 1123×1587 | 打印（@96dpi） |
| 16:9 / 9:16 | 1920×1080 / 1080×1920 | 横屏 / 竖屏 Story |
| 1:1 / 3:4 / 2:3 | 1080×1080 / 1080×1440 / 1080×1620 | 社交 / 经典竖版 / 电影海报 |

- vocab compose / brief 均支持 --size A4|A3|16:9|9:16|1:1|3:4|2:3 或 WxH

## 9 维度设计方案（设计分析 Agent 输出）

选定方向后输出设计方案给用户确认：

```bash
node scripts/poster.js plan <spec.json> --fingerprint <指纹.json> --out out/design-plan.md
```

涵盖：Visual Direction / Typography / Color System / Composition / Image Treatment / Grid / Hierarchy / Negative Space / Texture + 交互 + AI-ness 提示。支持 --json 输出结构化方案。

## 维护约定
- 新增原语：往 `design-vocabulary/index.js` 的对应字典加一条（带 name/hint/spec 或 apply）
- renderer 的排版模式、directions 的字体已改为引用本模块 → 改词表即全局生效，避免多处漂移