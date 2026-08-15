# interaction — 交互系统

AI 生成视觉时同时生成 **Interaction Map**，本模块负责把映射变成真实交互。

## V0.1 计划能力
| 类型 | 说明 |
| --- | --- |
| `parallax` | 鼠标移动产生多 Z 轴视差 |
| `hover` | 悬停动画 / 磁吸按钮 |
| `click` | 点击展开信息 / 触发动画 |
| `cursorLight` | 光标跟随光晕 |
| `scroll` | 滚动驱动动画 |

## 示例 Interaction Map
```js
{
  title:    { type: 'hover',    effect: 'distortion' },
  portrait: { type: 'parallax', depth: 0.4 },
  background:{ type: 'cursorLight', blend: 'screen' },
  date:     { type: 'click',    action: 'expand' },
  cta:      { type: 'hover',    effect: 'magnetic' }
}
```
