# AI-Powered Marine Debris & Anomaly Detection using Sonar Imagery

**Smart India Hackathon 2026 — PS ID 26057**

Team submission for **Ministry of Earth Sciences (MoES)** / **National Institute
of Ocean Technology (NIOT)**: an end-to-end automated computer-vision pipeline
that ingests side-scan sonar (SSS) and forward-looking sonar (FLS) imagery,
detects man-made debris against a naturally noisy seafloor, and outputs
geolocated, exportable anomaly reports — running locally without cloud
dependencies.

---

## The Problem

Ghost nets and other anthropogenic debris kill marine life, destroy coral
reefs, and damage vessel propellers. Manually scanning thousands of kilometers
of sonar logs is slow and error prone — debris easily blends into rocks,
sand ripples, and ridges, while speckle noise, acoustic shadows, and sensor
dropout (heave/pitch/roll) mask signals. This project automates that review.

## What It Does

- **Detection** — YOLO11s models detect and bound man-made objects:
  - **Side-scan sonar (SSS):** `shipwreck, victim, airplane, cylinder, manta`
  - **Forward-looking sonar (FLS):** `can, bottle, drink-carton, chain, propeller, tire, hook, valve, shampoo-bottle, standing-bottle`
- **Noise filtering** — automatic pre-processing (median blur → CLAHE → normalize)
  suppresses speckle and acoustic shadows, cutting false positives.
- **Confidence scoring** — every detection carries a 0–100% confidence;
  a threshold slider filters weak hits in real time.
- **Geotagging & reporting** — parses per-image sonar metadata (CSV/JSON
  sidecars) into exact lat/lon, derives bounding dimensions (m, m²), and exports
  structured **JSON + CSV** anomaly reports.
- **Real-time dashboard** — upload raw sonar logs, stream detection results
  live over SSE, review overlays, and view all hits geolocated on a map.

## Architecture

```
backend/                 FastAPI + YOLO11s inference API
  yolo11s-ss_best.pt       SSS model (5 classes)
  yolo11s-fls_best.pt      FLS model (10 classes)
  detector.py              pre-processing + inference
  main.py                  /health · /detect · /detect/stream (SSE)
frontend/                React (Vite) dashboard
  src/api.js               scan types, SSE streaming client
  src/MapTab.jsx           Leaflet map + exports
  src/report.js            report / CSV generation
dev.sh · dev.cmd          one-command launchers (macOS / Windows)
SETUP_WINDOWS.txt         full Windows setup guide
```

Models are **strictly per scan type** — there is no cross-type fallback. Both
weights are committed so the repo is fully standalone.

## Quick Start (macOS/Linux)

```bash
# 1. Backend deps (Python 3.12)
python -m venv .venv && source .venv/bin/activate
pip install "ultralytics>=8.3" fastapi "uvicorn[standard]" python-multipart pyyaml pillow numpy

# 2. Frontend deps (Node 20+)
cd frontend && npm install && cd ..

# 3. Run both
./dev.sh
```

Open **http://localhost:5173** — the API runs on :8000 (/health, /detect,
/detect/stream) and Vite proxies requests so no CORS is needed.

## Windows

See `SETUP_WINDOWS.txt` (venv, optional CUDA PyTorch, `dev.cmd`).

## Testing

```bash
cd frontend
npm run build          # production build
npx playwright test    # end-to-end: upload → detect → review → insights → map → export
node e2e/shots.mjs     # regenerates dashboard screenshots
```

## Stack

YOLO11s · Ultralytics · FastAPI · SSE · React 19 · Vite · Tailwind CSS 4 ·
Leaflet / react-leaflet · Playwright

---

_Smart India Hackathon 2026 · PS 26057 · Team Hack_