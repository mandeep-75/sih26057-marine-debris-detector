import asyncio
import json

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.responses import StreamingResponse

from . import detector
from .config import (
    CLASSES,
    DEFAULT_MIN_CONFIDENCE,
    DEFAULT_SCAN_TYPE,
    IMGSZ,
    SCAN_TYPES,
    weights_for,
)

app = FastAPI(
    title="Marine Debris Detection API",
    description="YOLO11s inference for side-scan and forward-looking sonar (SIH26057 · MoES/NIOT).",
    version="0.3.0",
)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"


@app.get("/")
def root():
    return {
        "name": "marine-debris-detection-api",
        "endpoints": ["/health", "/detect", "/detect/stream"],
        "scan_types": SCAN_TYPES,
        "classes": CLASSES,
    }


@app.get("/health")
def health(scan_type: str = DEFAULT_SCAN_TYPE):
    if scan_type not in SCAN_TYPES:
        scan_type = DEFAULT_SCAN_TYPE
    per_type = {t: {"ready": bool(weights_for(t)) and detector.yolo_available()} for t in SCAN_TYPES}
    weights = weights_for(scan_type)
    return {
        "model": "yolo11s",
        "classes": CLASSES,
        "source": "ultralytics · yolo11s" if (weights and detector.yolo_available()) else "weights not ready",
        "ready": per_type[scan_type]["ready"],
        "scan_type": scan_type,
        "scan_types": per_type,
        "weights": str(weights) if weights else None,
    }


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    scan_type: str = Form(DEFAULT_SCAN_TYPE),
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    preprocess: bool = True,
):
    if scan_type not in SCAN_TYPES:
        scan_type = DEFAULT_SCAN_TYPE
    weights = weights_for(scan_type)
    if weights is None or not detector.yolo_available():
        raise HTTPException(
            status_code=503,
            detail=f"Trained weights for '{scan_type}' not ready — training still in progress or DETECT_WEIGHTS_{scan_type.upper()} is unset.",
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload.")
    result = detector.detect_bytes(data, weights, min_confidence, imgsz=IMGSZ, preprocess=preprocess)
    return {"filename": file.filename, "scan_type": scan_type, "preprocess": result["preprocess"], **result}


@app.post("/detect/stream")
async def detect_stream(
    files: list[UploadFile] = File(...),
    scan_type: str = Form(DEFAULT_SCAN_TYPE),
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    preprocess: bool = True,
):
    if scan_type not in SCAN_TYPES:
        scan_type = DEFAULT_SCAN_TYPE
    weights = weights_for(scan_type)
    if weights is None or not detector.yolo_available():
        raise HTTPException(
            status_code=503,
            detail=f"Trained weights for '{scan_type}' not ready — training still in progress or DETECT_WEIGHTS_{scan_type.upper()} is unset.",
        )

    async def generator():
        total = len(files)
        yield _sse({"event": "batch_start", "scan_type": scan_type, "total": total})
        for idx, f in enumerate(files):
            data = await f.read()
            yield _sse({"event": "image_start", "index": idx, "total": total, "filename": f.filename})
            if not data:
                yield _sse({"event": "image_error", "index": idx, "total": total, "filename": f.filename, "message": "empty file"})
                continue
            result = await asyncio.to_thread(
                detector.detect_bytes, data, weights, min_confidence, IMGSZ, preprocess
            )
            yield _sse({"event": "image_done", "index": idx, "total": total, "filename": f.filename, "scan_type": scan_type, **result})
        yield _sse({"event": "batch_done", "total": total})

    return StreamingResponse(generator(), media_type="text/event-stream")