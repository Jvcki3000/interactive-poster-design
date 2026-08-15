# tests — 测试

计划分层：

| 层 | 内容 | 工具 |
| --- | --- | --- |
| Unit | typography（字号阶梯/文本适配）、layout（栅格/Z 轴） | `node --test` |
| Integration | renderer：Design Spec → HTML 结构正确 | `node --test` |
| E2E | 浏览器中验证动画/交互真实生效 | Playwright（V0.2+） |

## 运行
```bash
npm test
```
