# renderer — 渲染核心

把 **Design Spec** 渲染为最终可交付的 `index.html`。

## 职责
- 校验 Design Spec
- 调用 layout / typography 计算版面与排版
- 生成 CSS（设计 token → CSS variables）
- 注入 animation / interaction 运行时脚本
- 组装完整 HTML 并输出

## 关键原则
- **文字与排版不交给图像模型**：标题、日期、Logo、二维码等一律程序化排版
- 图像模型只负责产出 `assets/` 中的视觉素材/背景
- 输出零依赖、可直接双击打开的 `index.html`
