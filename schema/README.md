# schema — Skill 与 Engine 的契约

`design-spec.schema.json` 是 **Skill（大脑）→ Engine（身体）** 的接口：

- **Skill 输出** Design Spec（JSON）
- **Engine 消费** Design Spec，渲染成 `index.html`

```
User Brief
   ↓
Skill（AI 分析）→ Design Spec (JSON)
   ↓
Engine（renderer）→ index.html
```

## 字段一览
| 字段 | 说明 |
| --- | --- |
| `canvas` | 输出尺寸（A4 / 16:9 / 9:16 / 1:1…） |
| `content` | 真实文案（标题/日期/地点/价格/CTA） |
| `style` | 视觉 token：颜色/排版/版式/图像处理 |
| `animation` | 动画规则（声明式） |
| `interactions` | 交互地图（声明式） |
| `assets` | 素材引用（本地或 URL） |

## 演进
- V0.1 先支持最小字段集，随版本逐步扩展
- 任何 Skill/Agent 只要输出符合此 Schema 的 JSON，即可复用本 Engine
