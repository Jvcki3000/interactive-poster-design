# Typography

## 层级
- 标题（display）：最大，`titleScale`（默认 2.2 × display 级）
- 副标题：`md` 级，标题 ≥2× 副标题
- 元信息（日期/地点/标签）：`sm` 级，≥12px

## 字号比例
- modular scale 1.15–1.4（默认 1.25），baseSize 默认 16
- 一个展示字体 + 一个正文字体，最多两个字体族

## 标题适配
- 大写无衬线约 0.62em/字符宽；估算 `len(title) * 0.62 * 标题px ≤ 画布宽 * 0.96`
- 溢出时降低 `style.typography.titleScale` 或缩短文案
- 长标题可拆行（换行符 `\n` → `<br>`）

## 细节
- 全大写 + letter-spacing（0.2–0.35em）适合活动/展览调性
- 中文标题优先系统字体栈（PingFang SC / Microsoft YaHei / Noto Sans SC）
- 行高：标题 0.9–1.0，正文 1.4–1.6