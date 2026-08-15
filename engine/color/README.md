# palette — 参考图配色

「参考图 → 海报配色」管线：

```
参考图
  ↓ scripts/palette.py（PIL 取主色）
palette.json（5 个主色 + 占比）
  ↓ palette/index.js（映射角色色）
bg / surface / ink / accent / accent2 / muted
  ↓ renderer
海报
```

## 用法
```bash
python scripts/palette.py assets/reference/ref.jpg --colors 5 --out assets/reference/ref-palette.json
node scripts/render.js <spec.json> --out out/x --palette assets/reference/ref-palette.json
```

## 角色色映射规则
- `bg` = 最暗色；`surface` = 次暗色
- `ink` = 最亮色（亮度不足 0.4 时回退近白）
- `accent` = 中间亮度色；`accent2` = 次亮色
- `muted` = 最亮与最暗的混合