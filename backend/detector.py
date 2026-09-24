import io
import threading
import time

import numpy as np
from PIL import Image

_lock = threading.Lock()
_models = {}
_yolo_available = None

# Noise-suppression stage (PS 26057): median blur kills speckle, CLAHE lifts low-
# contrast sonar shadows/ripples, then normalize. Applied before inference when
# preprocess=True so the model sees a de-noised, contrast-stretched image.
_CLAHE = None


def _get_clahe():
    global _CLAHE
    if _CLAHE is None:
        import cv2

        _CLAHE = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return _CLAHE


def enhance(img):
    import cv2

    t0 = time.perf_counter()
    arr = np.asarray(img)
    if arr.shape[2] == 4:  # RGBA -> RGB
        arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2RGB)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    gray = cv2.medianBlur(gray, 3)
    eq = _get_clahe().apply(gray)
    norm = cv2.normalize(eq, None, 0, 255, cv2.NORM_MINMAX)
    rgb = cv2.cvtColor(norm, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(rgb), int((time.perf_counter() - t0) * 1000)


def yolo_available():
    global _yolo_available
    if _yolo_available is None:
        try:
            import ultralytics  # noqa: F401

            _yolo_available = True
        except ImportError:
            _yolo_available = False
    return _yolo_available


def get_model(weights):
    key = str(weights)
    with _lock:
        if key not in _models:
            from ultralytics import YOLO

            _models[key] = YOLO(weights)
    return _models[key]


def detect_bytes(img_bytes, weights, min_conf, imgsz=640, preprocess=True):
    t0 = time.perf_counter()
    model = get_model(weights)
    pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = pil.size
    prep_ms = 0
    if preprocess:
        pil, prep_ms = enhance(pil)
    arr = np.asarray(pil)
    results = model.predict(arr, conf=min_conf, imgsz=imgsz, verbose=False)
    names = model.names
    detections = []
    if results and results[0].boxes is not None:
        for box in results[0].boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            cx, cy, bw, bh = box.xywhn[0].tolist()
            x1 = max(0.0, min(1.0, cx - bw / 2))
            y1 = max(0.0, min(1.0, cy - bh / 2))
            x2 = max(0.0, min(1.0, cx + bw / 2))
            y2 = max(0.0, min(1.0, cy + bh / 2))
            detections.append(
                {
                    "id": f"d-{len(detections)}",
                    "class": names.get(cls, str(cls)),
                    "class_id": cls,
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)],
                }
            )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    return {
        "detections": detections,
        "latency_ms": latency_ms,
        "preprocess_ms": prep_ms,
        "preprocess": bool(preprocess),
        "width": w,
        "height": h,
    }