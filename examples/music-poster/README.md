# music-poster — 音乐海报示例（V0.3 已跑通 ✅）

「NEON RUSH」合成器之夜。**内容只含文案，视觉完全交给风格预设**，是演示 Style Presets 与 Reference Image 的载体。

## 文件
| 文件 | 说明 |
| --- | --- |
| `spec.json` | Design Spec（纯文案，无显式颜色） |
| `out/music-poster/cyberpunk|editorial|swiss/index.html` | 套不同预设的渲染产物 |
| `out/music-poster/from-reference/index.html` | 用参考图色板渲染 |

## 演示命令
```bash
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/cyberpunk --preset cyberpunk
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/editorial --preset editorial
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/swiss --preset swiss
python scripts/palette.py assets/reference/ref.jpg --colors 5 --out assets/reference/ref-palette.json
node scripts/render.js examples/music-poster/spec.json --out out/music-poster/from-reference --palette assets/reference/ref-palette.json
```