"""分析参考海报 -> 设计指纹 JSON

用法:
    python scripts/analyze_poster.py <image> [--colors 5] [--out fingerprint.json]

输出（估计值用 guess 标注，用于引导提问，非精确测量）:
    source / size(含比例) / palette(主色+占比) / background / is_dark /
    temperature(warm|cold|neutral) / saturation / contrast /
    layout.guess(centered|split|hero|dynamic|classic) / density / negative_space /
    text_bands(文字带估计) / strategy_guess(色彩策略猜测) / palette(可直接喂给 --palette)
"""
import argparse
import json
import sys
from collections import Counter

from PIL import Image


def lum(px):
    return 0.299 * px[0] + 0.587 * px[1] + 0.072 * px[2]


def hsv_hue(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60


def analyze(path, colors):
    img = Image.open(path).convert("RGB")
    W, H = img.size
    import math
    g = math.gcd(W, H)
    ratio = "%d:%d" % (W // g, H // g)
    small = img.copy()
    small.thumbnail((96, 96))
    sw, sh = small.size
    px = small.load()

    # 主色板
    q = small.quantize(colors=max(colors * 3, 8))
    pal = q.getpalette()
    counts = Counter(q.get_flattened_data() if hasattr(q, "get_flattened_data") else list(q.getdata()))
    total = sw * sh
    palette = []
    for idx, cnt in counts.most_common(colors):
        r, g, b = pal[idx * 3], pal[idx * 3 + 1], pal[idx * 3 + 2]
        palette.append({"hex": "#%02x%02x%02x" % (r, g, b), "count": cnt, "share": round(cnt / total, 4)})

    # 背景 = 边缘像素众数
    borders = [px[x, y] for x in range(sw) for y in (0, sh - 1)] + [px[x, y] for y in range(sh) for x in (0, sw - 1)]
    bg = max(set(borders), key=borders.count)
    bg_hex = "#%02x%02x%02x" % bg
    bg_l = lum(bg)

    # 明暗 / 对比度
    lums = [lum(px[x, y]) for x in range(sw) for y in range(sh)]
    avg_l = sum(lums) / (sw * sh)
    ink = [v for v in lums if abs(v - bg_l) > 40]
    max_dev = max((abs(v - bg_l) for v in ink), default=0)
    contrast = "high" if max_dev > 120 else ("mid" if ink else "low")

    # 色温 / 饱和度
    top = palette[0]["hex"] if palette else "#808080"
    hue = hsv_hue(top)
    temperature = "warm" if hue is not None and 15 <= hue < 60 else ("cold" if hue is not None and 180 <= hue < 260 else "neutral")
    sat_avg = sum((max(px[x, y]) - min(px[x, y])) for x in range(sw) for y in range(sh)) / (sw * sh) / 255
    saturation = "high" if sat_avg > 0.35 else ("mid" if sat_avg > 0.15 else "low")

    # 布局：3x3 网格 ink 质量 + 猜测
    g3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    ink_n = 0
    for x in range(sw):
        for y in range(sh):
            if abs(lum(px[x, y]) - bg_l) > 40:
                g3[min(y * 3 // sh, 2)][min(x * 3 // sw, 2)] += 1
                ink_n += 1
    density = round(ink_n / (sw * sh), 3)
    total_g = max(ink_n, 1)
    top_m = sum(g3[0]) / total_g
    mid_m = sum(g3[1]) / total_g
    bot_m = sum(g3[2]) / total_g
    left_m = sum(g3[r][0] for r in range(3)) / total_g
    right_m = sum(g3[r][2] for r in range(3)) / total_g
    center_c = g3[1][1] / total_g

    if bot_m > 0.42 and top_m < 0.25:
        layout = "hero"
    elif left_m > 0.3 and right_m > 0.3 and center_c < 0.3:
        layout = "split"
    elif center_c > 0.45 and top_m + bot_m < 0.5:
        layout = "centered"
    elif (g3[0][2] + g3[2][0]) / total_g > 0.3 and (g3[0][0] + g3[2][2]) / total_g < 0.15:
        layout = "dynamic"
    elif max(top_m, mid_m, bot_m) < 0.5:
        layout = "classic"
    else:
        layout = "classic"

    # 文字带估计（连续行中 ink 占比高的行）
    row_ink = [sum(1 for x in range(sw) if abs(lum(px[x, y]) - bg_l) > 40) for y in range(sh)]
    bands = 0
    prev = False
    for v in row_ink:
        cur = v > sw * 0.3
        if cur and not prev:
            bands += 1
        prev = cur
    has_large_type = bands >= 1 and max(row_ink) > sw * 0.5

    # 色彩策略猜测（启发式）
    sat_hexes = [p["hex"] for p in palette]
    n_neutral = sum(1 for h in sat_hexes if hsv_hue(h) is None)
    if saturation == "low" and n_neutral >= max(2, len(sat_hexes) - 1):
        strategy = "muted" if palette[0]["share"] > 0.25 else "no-color"
    elif n_neutral >= len(sat_hexes) - 1 and saturation in ("mid", "high"):
        strategy = "black-accent"
    elif contrast == "high" and avg_l < 110:
        strategy = "high-contrast"
    elif len(palette) >= 3 and abs((hsv_hue(palette[0]["hex"]) or 0) - (hsv_hue(palette[2]["hex"]) or 0)) % 360 > 100:
        strategy = "complementary"
    else:
        strategy = "unknown"

    return {
        "source": path,
        "size": {"width": W, "height": H, "ratio": ratio},
        "background": bg_hex,
        "is_dark": bool(avg_l < 110),
        "temperature": temperature,
        "saturation": saturation,
        "contrast": contrast,
        "density": density,
        "negative_space": round(1 - density, 3),
        "layout": {"guess": layout, "top": round(top_m, 2), "middle": round(mid_m, 2), "bottom": round(bot_m, 2)},
        "text_bands": bands,
        "has_large_type": bool(has_large_type),
        "strategy_guess": strategy,
        "palette": palette,
    }


def main():
    ap = argparse.ArgumentParser(description="分析参考海报 -> 设计指纹")
    ap.add_argument("image")
    ap.add_argument("--colors", type=int, default=5)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    try:
        result = analyze(args.image, args.colors)
    except Exception as e:  # noqa: BLE001
        print("分析失败:", e, file=sys.stderr)
        sys.exit(1)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print("fingerprint ->", args.out)
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()