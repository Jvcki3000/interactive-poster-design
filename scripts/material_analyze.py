# -*- coding: utf-8 -*-
"""material_analyze — 素材分析（Material Intelligence）。用法: python material_analyze.py <img...> [--out json]"""
import os, sys, json, argparse
import numpy as np
from PIL import Image

def dominant_colors(arr, n=5):
    sample = (arr[::8, ::8].astype(int) // 32 * 32).reshape(-1, 3)
    vals, counts = np.unique(sample, axis=0, return_counts=True)
    idx = np.argsort(-counts)[:n]
    return ["#%02x%02x%02x" % (int(vals[i][0]), int(vals[i][1]), int(vals[i][2])) for i in idx]

def skin_ratio(arr):
    r = arr[:, :, 0].astype(int); g = arr[:, :, 1].astype(int); b = arr[:, :, 2].astype(int)
    m = (r > 90) & (r > g) & (g > b) & (r > 100)
    return float(m.mean())

def analyze(path):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    arr = np.asarray(im).astype(np.float32)
    lum = arr.mean(axis=2)
    bright = float(lum.mean() / 255)
    contrast = float(lum.std() / 255)
    # 边缘密度（背景复杂度 / 纹理）
    gx = np.abs(np.diff(lum, axis=1)); gy = np.abs(np.diff(lum, axis=0))
    edge = float((gx.mean() + gy.mean()) / 255)
    texture = float(np.abs(lum - lum.mean()).std() / 255)
    # 中心视觉权重（中心区域对比度）
    cy0, cy1 = int(H*0.3), int(H*0.7); cx0, cx1 = int(W*0.3), int(W*0.7)
    center = lum[cy0:cy1, cx0:cx1]
    visual_weight = float(np.clip(center.std() / 60, 0, 1))
    # 色彩温度
    mean_rgb = arr.mean(axis=(0,1))
    temp = "warm" if mean_rgb[0] > mean_rgb[2] + 8 else ("cool" if mean_rgb[2] > mean_rgb[0] + 8 else "neutral")
    skin = skin_ratio(arr)
    human_presence = bool(skin > 0.08 and (H > 300))
    face_presence = human_presence and bool(contrast > 0.15)
    # 简单 logo/text 启发：角部边缘密度高 + 色彩种类少
    corner = np.concatenate([lum[:int(H*0.15), :int(W*0.15)].ravel(), lum[:int(H*0.15), -int(W*0.15):].ravel()])
    qq = (arr[::10, ::10].astype(int) // 64).reshape(-1, 3)
    logo_presence = bool(edge > 0.12 and len(np.unique(qq, axis=0)) < 6)
    return {
        "path": path, "width": W, "height": H,
        "orientation": "portrait" if H > W else ("landscape" if W > H else "square"),
        "aspect_ratio": round(W / H, 3),
        "dominant_colors": dominant_colors(arr),
        "color_temperature": temp,
        "brightness": round(bright, 3), "contrast": round(contrast, 3),
        "visual_weight": round(visual_weight, 3),
        "background_complexity": round(float(np.clip(edge * 1.4, 0, 1)), 3),
        "texture": round(texture, 3),
        "human_presence": human_presence, "face_presence": face_presence,
        "logo_presence": logo_presence, "text_presence": bool(edge > 0.2 and len(set((arr[::10, ::10].reshape(-1,3)//48).tolist())) > 12),
        "source_fidelity": 1.0,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", default="material-analysis.json")
    a = ap.parse_args()
    results = [analyze(p) for p in a.images]
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    for r in results:
        print("[ok] %s  %s  %sx%s  colors=%s  contrast=%s  human=%s logo=%s" % (
            r["path"], r["orientation"], r["width"], r["height"], ",".join(r["dominant_colors"][:3]), r["contrast"], r["human_presence"], r["logo_presence"]))

if __name__ == "__main__":
    main()
