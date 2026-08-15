# brand-poster — 品牌海报示例（试用 Skill 跑通 ✅）

「EMBER」手冲咖啡品牌海报（复古风）。由试用 poster-design skill 的完整流程产出：
Brief → 设计方向（复古色板 + 衬线标题）→ Design Spec → render → critic(9.8) → 浏览器验证。

## 本示例验证的能力
- 品牌化配色（奶油底/深棕/陶土红）与衬线展示字体
- **价格字段**（`content.price`）程序化渲染：「¥38 / CUP」
- 中文 CTA「立即预订」
- 复古调性的交互：视差 + cursorLight(multiply) + 3D 倾斜 + 点击展开详情

## 渲染命令
```bash
node scripts/render.js examples/brand-poster/spec.json --out out/brand-poster --critic
```