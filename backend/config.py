import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "fls_sonar_yolo" / "data.yaml"

# FLS fallback class order (matches fls_sonar_yolo/data.yaml and the trained weights).
# Used so the API does not depend on the dataset directory existing.
FALLBACK_CLASSES = [
    "can",
    "bottle",
    "drink-carton",
    "chain",
    "propeller",
    "tire",
    "hook",
    "valve",
    "shampoo-bottle",
    "standing-bottle",
]


def _load_classes():
    if DATA_YAML.exists():
        try:
            import yaml

            with DATA_YAML.open() as f:
                names = yaml.safe_load(f)["names"]
            if names:
                return list(names)
        except Exception:
            pass
    return FALLBACK_CLASSES


CLASSES = _load_classes()
NC = len(CLASSES)

# Two independent scan types — per problem statement 26057 (Side-Scan Sonar) and
# the trained FLS model. Weights are fully SEPARATE per type; there is no cross-type
# fallback. Drop a trained file for each type and it is picked up automatically:
#   backend/yolo11s-ss_best.pt   -> sidescan
#   backend/yolo11s-fls_best.pt  -> forward
# Env pins (applied in order): DETECT_WEIGHTS_SIDESCAN / DETECT_WEIGHTS_FORWARD,
# then a global DETECT_WEIGHTS for a single-model deployment.
SCAN_TYPES = ["sidescan", "forward"]
DEFAULT_SCAN_TYPE = "sidescan"

SCAN_WEIGHTS_HINT = {
    "sidescan": Path(__file__).resolve().parent / "yolo11s-ss_best.pt",
    "forward": Path(__file__).resolve().parent / "yolo11s-fls_best.pt",
}

DEFAULT_MIN_CONFIDENCE = 0.25
IMGSZ = 640


def _check(p):
    return p if p and p.exists() else None


def weights_for(scan_type: str):
    # Explicit per-type env pin (e.g. DETECT_WEIGHTS_SIDESCAN=/path/to/best.pt)
    env = os.environ.get(f"DETECT_WEIGHTS_{scan_type.upper()}")
    if env:
        p = _check(Path(env))
        if p:
            return p
    # Global env pin for a single-model deployment
    genv = os.environ.get("DETECT_WEIGHTS")
    if genv:
        p = _check(Path(genv))
        if p:
            return p
    # Type-specific weights file only — never another scan type's model.
    return _check(SCAN_WEIGHTS_HINT.get(scan_type))