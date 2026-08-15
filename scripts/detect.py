# -*- coding: utf-8 -*-
"""detect — 用 mediapipe FaceLandmarker 检测图片五官坐标（代码合成 overlay 定位用）。
用法: python detect.py <image> [--out coords.json]
输出: {width, height, face: {leftIris, rightIris, eyeCenter, eyeSpan, mouth, nose, chin}}
"""
import os, sys, json, argparse, urllib.request
import numpy as np
from PIL import Image

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"

def find_model():
    env = os.environ.get("POSTER_FACE_MODEL")
    cands = ([env] if env else []) + [
        os.path.join(os.path.expanduser("~"), ".cache", "mediapipe", "face_landmarker.task"),
        os.path.join(os.path.expanduser("~"), ".mediapipe", "face_landmarker.task"),
    ]
    for c in cands:
        if c and os.path.exists(c) and os.path.getsize(c) > 100000:
            return c
    target = os.path.join(os.path.expanduser("~"), ".cache", "mediapipe", "face_landmarker.task")
    print("[detect] 下载 face_landmarker.task ...", file=sys.stderr)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    try:
        req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as r:
            data = r.read()
        with open(target, "wb") as f:
            f.write(data)
        return target
    except Exception as e:
        print("[detect] 模型下载失败: %s；请手动放置 face_landmarker.task 到 ~/.cache/mediapipe/ 或设置 POSTER_FACE_MODEL" % e, file=sys.stderr)
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--out", default="face-coords.json")
    a = ap.parse_args()
    model = find_model()
    if not model:
        sys.exit(1)
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    im = Image.open(a.image).convert("RGB")
    W, H = im.size
    opts = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )
    with vision.FaceLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(im)))
        if not res.face_landmarks:
            print("[detect] 未检测到人脸", file=sys.stderr)
            sys.exit(1)
        pts = res.face_landmarks[0]
        def P(i): return [round(pts[i].x * W, 1), round(pts[i].y * H, 1)]
        left_iris, right_iris = P(468), P(473)
        mouth = P(13); nose = P(1); chin = P(152)
        eye_center = [round((left_iris[0]+right_iris[0])/2, 1), round((left_iris[1]+right_iris[1])/2, 1)]
        eye_span = round(((right_iris[0]-left_iris[0])**2 + (right_iris[1]-left_iris[1])**2) ** 0.5, 1)
        out = {"width": W, "height": H, "face": {
            "leftIris": left_iris, "rightIris": right_iris,
            "eyeCenter": eye_center, "eyeSpan": eye_span,
            "mouth": mouth, "nose": nose, "chin": chin,
        }}
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print("[ok] 已写入 %s（眼睛中心 %s，眼距 %s）" % (a.out, eye_center, eye_span))

if __name__ == "__main__":
    main()
