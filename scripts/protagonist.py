#!/usr/bin/env python
"""protagonist — 人物分割 → 抠图/掩膜 + 几何信息

GPU 说明:
  - rembg 默认走 CPU（onnxruntime 1.28），u2net 内部 320x320，单张约 0.27s，够用
  - 若想用 GPU：需先装 CUDA 运行库 + cuDNN（RTX 4060 只装驱动会缺 cublasLt64_13.dll）
    → pip install onnxruntime-gpu 后仍需系统 CUDA，否则 CUDA provider 会静默回落 CPU

用法:
  python protagonist.py --photo <图片> [--out-dir assets/reference] [--name protagonist]
  python protagonist.py --photo <图片> --multi [--count 4] [--names "A,B"]  # 多人/多元素：连通域拆分

输出 JSON（stdout）:
  { "photo": ..., "cutout": ..., "mask": ..., "size": {"w":..,"h":..},
    "bbox": {"x":..,"y":..,"rx":..,"ry":..} }   # x/y/rx/ry 为原图百分比
"""
import argparse, json, os, sys, time, urllib.request
import numpy as np
from PIL import Image

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"

def find_model():
    env = os.environ.get("POSTER_MEDIAPIPE_MODEL")
    if env and os.path.exists(env):
        return env
    home = os.path.expanduser("~")
    cands = [
        os.path.join(home, ".cache", "mediapipe", "selfie_segmenter.tflite"),
        os.path.join(home, ".mediapipe", "selfie_segmenter.tflite"),
    ]
    for c in cands:
        if os.path.exists(c):
            return c
    # try download
    target = cands[0]
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        print("[protagonist] downloading segmentation model ...", file=sys.stderr, flush=True)
        urllib.request.urlretrieve(MODEL_URL, target)
        return target
    except Exception as e:
        print("[protagonist] model download failed: %s" % e, file=sys.stderr)
        print("[protagonist] put selfie_segmenter.tflite at %s or set POSTER_MEDIAPIPE_MODEL" % target, file=sys.stderr)
        return None

def _clean_alpha(alpha, photo_path):
    from PIL import Image, ImageFilter
    import numpy as np
    mimg = Image.fromarray(alpha.astype(np.uint8))
    mimg = mimg.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
    mimg = mimg.filter(ImageFilter.GaussianBlur(1.5))
    alpha2 = np.asarray(mimg).astype(np.uint8)
    cut = Image.open(photo_path).convert("RGBA")
    cut.putalpha(Image.fromarray(alpha2))
    hard = alpha2 > 128
    ys, xs = np.where(hard)
    if len(xs) == 0:
        raise RuntimeError("未分割出人物：请换一张人物更清晰、背景更干净的照片")
    w, h = cut.size
    return cut, Image.fromarray(alpha2), {
        "x": round(((xs.min() + xs.max()) / 2) / w * 100, 1),
        "y": round(((ys.min() + ys.max()) / 2) / h * 100, 1),
        "rx": round((xs.max() - xs.min() + 1) / w * 100, 1),
        "ry": round((ys.max() - ys.min() + 1) / h * 100, 1),
    }

def _seg_rembg(photo_path):
    from rembg import remove, new_session
    from PIL import Image
    import numpy as np
    session = new_session("u2net")
    out = remove(Image.open(photo_path).convert("RGB"), session=session)
    return _clean_alpha(np.asarray(out)[..., 3], photo_path)

def _seg_mediapipe(photo_path, model_path):
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    import numpy as np
    from PIL import Image
    rgb = np.asarray(Image.open(photo_path).convert("RGB"))
    base = mp_python.BaseOptions(model_asset_path=model_path)
    opts = vision.ImageSegmenterOptions(base_options=base, running_mode=vision.RunningMode.IMAGE, output_confidence_masks=True)
    with vision.ImageSegmenter.create_from_options(opts) as seg:
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        conf = seg.segment(img).confidence_masks[0].numpy_view().squeeze().astype(np.float32)
    return _clean_alpha((conf > 0.5) * 255, photo_path)

def segment(photo_path, model_path, engine="mediapipe"):
    # mediapipe=默认(用户验证过) · rembg=更快可对比 · auto=rembg→mediapipe 兜底
    if engine == "rembg":
        return _seg_rembg(photo_path)
    if engine == "auto":
        try:
            return _seg_rembg(photo_path)
        except Exception as e:
            print("[protagonist] rembg 不可用，退回 mediapipe: %s" % e, file=sys.stderr)
    return _seg_mediapipe(photo_path, model_path)

def _bbox_pct(hard, w, h):
    ys, xs = np.where(hard)
    if len(xs) == 0:
        return None
    return {
        "x": round(((xs.min() + xs.max()) / 2) / w * 100, 1),
        "y": round(((ys.min() + ys.max()) / 2) / h * 100, 1),
        "rx": round((xs.max() - xs.min() + 1) / w * 100, 1),
        "ry": round((ys.max() - ys.min() + 1) / h * 100, 1),
    }

def split_multi(alpha, count):
    """把前景掩膜按连通域拆成多个元素（互不重叠的人物/物体）"""
    from scipy import ndimage
    import numpy as np
    hard = alpha > 128
    lab, n = ndimage.label(hard)
    comps = []
    for i in range(1, n + 1):
        m = lab == i
        comps.append((int(m.sum()), m))
    comps.sort(key=lambda x: -x[0])
    return [m for _, m in comps[:count]]

def main():
    from PIL import Image
    ap = argparse.ArgumentParser()
    ap.add_argument("--photo", required=True)
    ap.add_argument("--out-dir", default="assets/reference")
    ap.add_argument("--name", default="protagonist")
    ap.add_argument("--engine", choices=["mediapipe", "rembg", "auto"], default="mediapipe")
    ap.add_argument("--multi", action="store_true", help="多人/多元素：连通域拆分")
    ap.add_argument("--count", type=int, default=4)
    ap.add_argument("--names", default="", help="逗号分隔的元素名")
    a = ap.parse_args()
    t0 = time.time()
    model = find_model()
    if not model:
        sys.exit(2)
    cut, mask, bbox = segment(a.photo, model, a.engine)
    os.makedirs(a.out_dir, exist_ok=True)
    cutout = os.path.join(a.out_dir, a.name + "-cutout.png")
    maskp = os.path.join(a.out_dir, a.name + "-mask.png")
    cut.save(cutout)
    Image.merge("RGBA", [Image.fromarray(np.asarray(mask)), Image.fromarray(np.asarray(mask)), Image.fromarray(np.asarray(mask)), Image.fromarray(np.asarray(mask))]).save(maskp)
    w, h = cut.size
    names = [x.strip() for x in a.names.split(",") if x.strip()]

    if a.multi:
        from PIL import ImageFilter
        alpha = np.asarray(mask)
        comps = split_multi(alpha, a.count)
        items = []
        for i, comp in enumerate(comps):
            mimg = Image.fromarray((comp * 255).astype(np.uint8))
            mimg = mimg.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3))
            mimg = mimg.filter(ImageFilter.GaussianBlur(1.2))
            ca = np.asarray(mimg)
            comp_p = os.path.join(a.out_dir, "%s-m%d.png" % (a.name, i + 1))
            Image.merge("RGBA", [mimg, mimg, mimg, mimg]).save(comp_p)
            bb = _bbox_pct(ca > 128, w, h)
            if not bb:
                continue
            items.append({"mask": os.path.abspath(comp_p), "name": (names[i] if i < len(names) else "element-%d" % (i + 1)), "bbox": bb})
        out = {"photo": os.path.abspath(a.photo), "cutout": os.path.abspath(cutout),
               "mask": os.path.abspath(maskp), "size": {"w": w, "h": h},
               "bbox": bbox, "multi": items}
    else:
        out = {"photo": os.path.abspath(a.photo), "cutout": os.path.abspath(cutout),
               "mask": os.path.abspath(maskp), "size": {"w": w, "h": h}, "bbox": bbox}
    print(json.dumps(out, ensure_ascii=False))
    print("[protagonist] done in %.1fs" % (time.time() - t0), file=sys.stderr)

if __name__ == "__main__":
    main()
