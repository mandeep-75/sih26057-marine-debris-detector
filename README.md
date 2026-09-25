# AI-Powered Marine Debris & Anomaly Detection using Sonar Imagery

**Smart India Hackathon 2026 — PS ID 26057**

Team submission for **Ministry of Earth Sciences (MoES)** / **National Institute of Ocean Technology (NIOT)**: a browser-based computer-vision pipeline that ingests side-scan sonar (SSS) and forward-looking sonar (FLS) imagery, detects man-made debris against a naturally noisy seafloor, and outputs geolocated, exportable anomaly reports.

## The Problem

Ghost nets and other anthropogenic debris kill marine life, destroy coral reefs, and damage vessel propellers. Manually scanning thousands of kilometers of sonar logs is slow and error prone — debris easily blends into rocks, sand ripples, and ridges, while speckle noise, acoustic shadows, and sensor dropout (heave/pitch/roll) mask signals. This project automates that review.

## What It Does

- **Detection** — YOLO11s ONNX models detect and bound man-made objects:
  - **Side-scan sonar (SSS):** `shipwreck, victim, airplane, cylinder, manta`
  - **Forward-looking sonar (FLS):** `can, bottle, drink-carton, chain, propeller, tire, hook, valve, shampoo-bottle, standing-bottle`
- **Noise filtering** — median blur, CLAHE, and normalization suppress speckle and acoustic shadows.
- **Confidence scoring** — every detection carries a 0–100% confidence score; a threshold slider filters weak hits in real time.
- **Geotagging & reporting** — parses per-image sonar metadata (CSV/JSON sidecars) into exact lat/lon, derives bounding dimensions (m, m²), and exports structured JSON + CSV reports.
- **Local inference** — the trained ONNX models run in the browser with WebAssembly, so scans do not require a separate inference service.

## Architecture

```
frontend/                React + Vite dashboard
  public/models/         ONNX models and class metadata
  src/onnxDetect.js      browser-side preprocessing, inference, and NMS
  src/api.js             scan types, model metadata, and health checks
  src/MapTab.jsx         Leaflet map + exports
  src/report.js          report and CSV generation
dev.sh · dev.cmd         one-command frontend launchers
SETUP_WINDOWS.txt        Windows setup guide
```

Models are strictly per scan type; there is no cross-type fallback. Both ONNX models are committed so the application is self-contained.

## Quick Start (macOS/Linux)

```bash
cd frontend
npm install
npm run dev
```

Or from the repository root:

```bash
./dev.sh
```

Open **http://localhost:5173**.

## Windows

See `SETUP_WINDOWS.txt` for the Node.js setup and launcher.

## Testing

```bash
cd frontend
npm run build
npx playwright test
node e2e/shots.mjs
```

## Stack

YOLO11s · ONNX Runtime Web · WebAssembly · React 19 · Vite · Tailwind CSS 4 · Leaflet / react-leaflet · Playwright

---

_Smart India Hackathon 2026 · PS 26057 · Team Hack_
