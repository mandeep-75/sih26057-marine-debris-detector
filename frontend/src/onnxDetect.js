/* In-browser YOLO11s inference for SSS + FLS sonar imagery.
 *
 * Runs the trained models entirely on the client via onnxruntime-web.
 * Preprocessing, LetterBox, raw ONNX decode, and class-aware NMS all run in
 * the browser.
 */
import { classesFor } from './classes.js'
import { scanTypeOf, DEFAULT_SCAN_TYPE } from './api.js'

const IMGSZ = 640
const NMS_IOU = 0.7
const CLAHE_CLIP = 2.0
const TILES = 8
const FILL = 114
const MAX_SIDE = 2048

let ortPromise = null
let ortConfigured = false
const engineCache = new Map()

async function loadOrt() {
  if (!ortPromise) ortPromise = import('onnxruntime-web')
  const ort = await ortPromise
  if (!ortConfigured) {
    // Single-threaded WASM: Vite resolves onnxruntime's .wasm / worker .mjs
    // siblings itself (see vite.config optimizeDeps.exclude) — no external path
    // or COOP/COEP headers needed.
    ort.env.wasm.numThreads = 1
    ort.env.logLevel = 'error' // quiet onnxruntime's internal warning chatter
    ortConfigured = true
  }
  return ort
}

export const modelUrl = (scanTypeId) => scanTypeOf(scanTypeId).onnx

export async function isEngineReady(scanTypeId = DEFAULT_SCAN_TYPE) {
  try {
    const res = await fetch(modelUrl(scanTypeId), { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

/** Lazy singleton ONNX session + class metadata per scan type. */
export async function ensureEngine(scanTypeId = DEFAULT_SCAN_TYPE) {
  const cached = engineCache.get(scanTypeId)
  if (cached) return cached
  const ort = await loadOrt()
  const url = modelUrl(scanTypeId)
  const session = await ort.InferenceSession.create(url, { executionProviders: ['wasm'] })
  const engine = {
    scanTypeId,
    session,
    input: session.inputNames[0],
    output: session.outputNames[0],
    classes: classesFor(scanTypeId),
  }
  engineCache.set(scanTypeId, engine)
  return engine
}

/* ────────────────────────── preprocessing ────────────────────────── */

function toGray(rgba, w, h) {
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0, j = 0; i < w * h; i += 1, j += 4) {
    gray[i] = (4899 * rgba[j] + 9617 * rgba[j + 1] + 1868 * rgba[j + 2] + 8192) >> 14 // cv2 RGB2GRAY luma
  }
  return gray
}

function medianBlur3(gray, w, h) {
  const out = new Uint8ClampedArray(w * h)
  const idx = (x, y) => (Math.min(Math.max(y, 0), h - 1) * w + Math.min(Math.max(x, 0), w - 1))
  const win = new Uint8Array(9)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let n = 0
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) win[n++] = gray[idx(x + dx, y + dy)]
      // insertion sort (9 elements) → median = index 4
      for (let i = 1; i < 9; i += 1) {
        const v = win[i]
        let j = i - 1
        while (j >= 0 && win[j] > v) {
          win[j + 1] = win[j]
          j -= 1
        }
        win[j + 1] = v
      }
      out[y * w + x] = win[4]
    }
  }
  return out
}

/** CLAHE (clip-limited adaptive histogram equalization), 8×8 tiles, cv2-style. */
function clahe(gray, w, h) {
  const histSize = 256
  const xs = Array.from({ length: TILES + 1 }, (_, x) => Math.floor((x * w) / TILES))
  const ys = Array.from({ length: TILES + 1 }, (_, y) => Math.floor((y * h) / TILES))
  const tileSizeTotal = Math.floor(w / TILES) * Math.floor(h / TILES)
  const clipLimit = Math.max(CLAHE_CLIP, 1.0) * tileSizeTotal / histSize

  const luts = new Float64Array(TILES * TILES * histSize)
  const hist = new Float64Array(histSize)

  for (let ty = 0; ty < TILES; ty += 1) {
    for (let tx = 0; tx < TILES; tx += 1) {
      const y0 = ys[ty]
      const y1 = ys[ty + 1]
      const x0 = xs[tx]
      const x1 = xs[tx + 1]
      hist.fill(0)
      for (let y = y0; y < y1; y += 1) {
        let row = y * w
        for (let x = x0; x < x1; x += 1) hist[gray[row + x]] += 1
      }
      // clip + redistribute surplus (OpenCV clipHistogram)
      let clipped = 0
      for (let i = 0; i < histSize; i += 1)
        if (hist[i] > clipLimit) {
          clipped += hist[i] - clipLimit
          hist[i] = clipLimit
        }
      const batch = Math.floor(clipped / histSize)
      const residual = clipped - batch * histSize
      for (let i = 0; i < histSize; i += 1) hist[i] += batch
      for (let i = 0, step = histSize / residual; i < histSize; i += step) hist[i] += 1
      // CDF → LUT
      const nPix = (y1 - y0) * (x1 - x0)
      let sum = 0
      let min = 0
      for (let i = 0; i < histSize; i += 1) {
        sum += hist[i]
        if (sum > 0 && min === 0) min = sum
        if (sum > 0) {
          const val = Math.round(((sum - min) * (histSize - 1)) / (nPix - min)) || 0
          luts[(ty * TILES + tx) * histSize + i] = Math.max(0, Math.min(255, val))
        } else {
          luts[(ty * TILES + tx) * histSize + i] = 0
        }
      }
    }
  }

  const out = new Uint8ClampedArray(w * h)
  const tileW = xs[1] - xs[0]
  const tileH = ys[1] - ys[0]
  for (let y = 0; y < h; y += 1) {
    const t0 = Math.min(TILES - 1, Math.max(0, Math.floor((y - ys[0]) / tileH)))
    const t1 = Math.min(TILES - 1, t0 + 1)
    const f = (y - ys[t0]) / Math.max(1, ys[t1] - ys[t0])
    for (let x = 0; x < w; x += 1) {
      const s0 = Math.min(TILES - 1, Math.max(0, Math.floor((x - xs[0]) / tileW)))
      const s1 = Math.min(TILES - 1, s0 + 1)
      const g = (x - xs[s0]) / Math.max(1, xs[s1] - xs[s0])
      const v = gray[y * w + x]
      const a = luts[(t0 * TILES + s0) * histSize + v]
      const b = luts[(t0 * TILES + s1) * histSize + v]
      const c = luts[(t1 * TILES + s0) * histSize + v]
      const d = luts[(t1 * TILES + s1) * histSize + v]
      out[y * w + x] = Math.round(a * (1 - g) * (1 - f) + b * g * (1 - f) + c * (1 - g) * f + d * g * f)
    }
  }
  return out
}

function normalizeMinMax(gray) {
  let lo = 255
  let hi = 0
  for (let i = 0; i < gray.length; i += 1) {
    const v = gray[i]
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  if (hi - lo < 1) return gray
  const span = hi - lo
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i += 1) out[i] = Math.round(((gray[i] - lo) * 255) / span)
  return out
}

function grayToRgba(gray) {
  const out = new Uint8ClampedArray(gray.length * 4)
  for (let i = 0, j = 0; i < gray.length; i += 1, j += 4) {
    out[j] = gray[i]
    out[j + 1] = gray[i]
    out[j + 2] = gray[i]
    out[j + 3] = 255
  }
  return out
}

async function decodeToRgba(file) {
  const bmp = await createImageBitmap(file)
  let { width: w, height: h } = bmp
  if (Math.max(w, h) > MAX_SIDE) {
    const scale = MAX_SIDE / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return { rgba: ctx.getImageData(0, 0, w, h).data, w, h }
}

export async function preprocessFile(file) {
  const t0 = performance.now()
  const { rgba, w, h } = await decodeToRgba(file)
  let gray = toGray(rgba, w, h)
  gray = medianBlur3(gray, w, h)
  gray = clahe(gray, w, h)
  gray = normalizeMinMax(gray)
  const rgb = grayToRgba(gray)
  const prepMs = Math.round(performance.now() - t0)

  // LetterBox((640,640), auto=false, scaleup=true, center=true)
  const r = Math.min(IMGSZ / w, IMGSZ / h)
  const newW = Math.round(w * r)
  const newH = Math.round(h * r)
  const dw = (IMGSZ - newW) / 2
  const dh = (IMGSZ - newH) / 2
  const left = Math.round(dw - 0.1)
  const top = Math.round(dh - 0.1)

  const canvas = document.createElement('canvas')
  canvas.width = IMGSZ
  canvas.height = IMGSZ
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = `rgb(${FILL},${FILL},${FILL})`
  ctx.fillRect(0, 0, IMGSZ, IMGSZ)
  const src = new ImageData(rgb, w, h)
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = w
  srcCanvas.height = h
  srcCanvas.getContext('2d').putImageData(src, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(srcCanvas, 0, 0, w, h, left, top, newW, newH)

  const pixels = ctx.getImageData(0, 0, IMGSZ, IMGSZ).data
  const tensor = new Float32Array(3 * IMGSZ * IMGSZ)
  for (let i = 0, j = 0; i < IMGSZ * IMGSZ; i += 1, j += 4) {
    tensor[i] = pixels[j] / 255
    tensor[IMGSZ * IMGSZ + i] = pixels[j + 1] / 255
    tensor[2 * IMGSZ * IMGSZ + i] = pixels[j + 2] / 255
  }
  return { tensor, left, top, ratio: r, w, h, prepMs }
}

/* ─────────────────────────── decode + NMS ─────────────────────────── */

function decode(output, classes, minConf, { left, top, ratio, w, h }) {
  const nc = classes.length
  const anchors = output.length / (nc + 4)
  const cx = output
  const cy = output.subarray(anchors, 2 * anchors)
  const bw = output.subarray(2 * anchors, 3 * anchors)
  const bh = output.subarray(3 * anchors, 4 * anchors)
  const cands = []
  for (let a = 0; a < anchors; a += 1) {
    let best = 0
    let cls = 0
    for (let c = 0; c < nc; c += 1) {
      const s = output[(4 + c) * anchors + a]
      if (s > best) {
        best = s
        cls = c
      }
    }
    if (best < minConf) continue
    const x1 = (cx[a] - bw[a] / 2 - left) / ratio
    const y1 = (cy[a] - bh[a] / 2 - top) / ratio
    const x2 = (cx[a] + bw[a] / 2 - left) / ratio
    const y2 = (cy[a] + bh[a] / 2 - top) / ratio
    cands.push([best, cls, x1, y1, x2, y2])
  }

  cands.sort((A, B) => B[0] - A[0])
  const picked = []
  for (const c of cands) {
    let suppress = false
    for (const p of picked) {
      if (c[1] !== p[1]) continue
      const ix1 = Math.max(c[2], p[2])
      const iy1 = Math.max(c[3], p[3])
      const ix2 = Math.min(c[4], p[4])
      const iy2 = Math.min(c[5], p[5])
      const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1)
      const union = (c[4] - c[2]) * (c[5] - c[3]) + (p[4] - p[2]) * (p[5] - p[3]) - inter
      if (union > 0 && inter / union > NMS_IOU) {
        suppress = true
        break
      }
    }
    if (!suppress) picked.push(c)
  }

  return picked.map(([score, cls, x1, y1, x2, y2]) => ({
    class: classes[cls],
    class_id: cls,
    confidence: Math.round(score * 10000) / 10000,
    bbox: [
      Math.round(Math.min(1, Math.max(0, x1 / w)) * 10000) / 10000,
      Math.round(Math.min(1, Math.max(0, y1 / h)) * 10000) / 10000,
      Math.round(Math.min(1, Math.max(0, x2 / w)) * 10000) / 10000,
      Math.round(Math.min(1, Math.max(0, y2 / h)) * 10000) / 10000,
    ],
  }))
}

/** Run YOLO11s on a single image file entirely in the browser. */
export async function detectImageFile(file, scanTypeId = DEFAULT_SCAN_TYPE, minConf = 0.7) {
  const engine = await ensureEngine(scanTypeId)
  const ort = await loadOrt()
  const t0 = performance.now()
  const { tensor, left, top, ratio, w, h, prepMs } = await preprocessFile(file)
  const feeds = { [engine.input]: new ort.Tensor('float32', tensor, [1, 3, IMGSZ, IMGSZ]) }
  const outputs = await engine.session.run(feeds)
  const out = outputs[engine.output]
  const detections = decode(out.data, engine.classes, minConf, { left, top, ratio, w, h })
  return {
    detections,
    latency_ms: Math.round(performance.now() - t0),
    preprocess_ms: prepMs,
    preprocess: true,
    width: w,
    height: h,
    model: scanTypeOf(scanTypeId).model,
    embedded: true,
  }
}