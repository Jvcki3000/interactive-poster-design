"""从参考图提取主色板。

用法:
    python scripts/palette.py <image> [--colors N] [--out palette.json]

输出 JSON:
    { "source": "...", "palette": [ { "hex": "#rrggbb", "count": n, "share": 0.xx }, ... ] }
"""
import argparse
import json
import sys

from PIL import Image


def extract(path, n):
    img = Image.open(path).convert("RGB")
    img.thumbnail((96, 96))
    q = img.quantize(colors=max(n * 3, 8))
    pal = q.getpalette()
    counts = {}
    # Pillow >= 12 用 get_flattened_data，旧版回退 getdata
    values = q.get_flattened_data() if hasattr(q, "get_flattened_data") else list(q.getdata())
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    total = q.width * q.height
    out = []
    for idx, cnt in ranked[:n]:
        r, g, b = pal[idx * 3], pal[idx * 3 + 1], pal[idx * 3 + 2]
        out.append({"hex": "#%02x%02x%02x" % (r, g, b), "count": cnt, "share": round(cnt / total, 4)})
    return out


def main():
    ap = argparse.ArgumentParser(description="从参考图提取主色板")
    ap.add_argument("image", help="图片路径或 URL")
    ap.add_argument("--colors", type=int, default=5, help="输出颜色数量（默认 5）")
    ap.add_argument("--out", default=None, help="输出 JSON 路径")
    args = ap.parse_args()

    try:
        palette = extract(args.image, args.colors)
    except Exception as e:  # noqa: BLE001
        print("palette 提取失败:", e, file=sys.stderr)
        sys.exit(1)

    result = {"source": args.image, "palette": palette}
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print("palette ->", args.out)
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()