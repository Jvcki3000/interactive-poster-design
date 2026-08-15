# Presets

> 预设库（TASK-024）。

- **Design DNA 预设**：presets/design-presets.json，36 个（≥30 验收）。
- 结构指纹两两唯一（composition/grid/typography/color/imagery/materiality 等关键维度取值多样）。
- **Spec 预设**（风格快捷套用）：engine/presets/index.js（swiss/editorial/minimal/experimental/cyberpunk）。

## 用法

```bash
node scripts/poster.js dna-presets list
node scripts/poster.js dna-presets show swiss-international
node scripts/poster.js dna-presets pick "音乐 演出"
node scripts/poster.js dna-presets mutate swiss-international --color earth --orientation landscape --density 0.7 --seed 7
```
