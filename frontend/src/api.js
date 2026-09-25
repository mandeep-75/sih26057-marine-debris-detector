import { CLASSES, classesFor } from './classes.js'

/* Scan-type registry. Each type bundles an ONNX model exported from the trained
   YOLO11s model and served from public/models/.
   Inference runs fully in-browser via onnxruntime-web. */
export const SCAN_TYPES = [
  {
    id: 'sidescan',
    label: 'Side-scan sonar',
    model: 'yolo11s-ss',
    caption: 'SSS · YOLO11s (PS 26057)',
    onnx: '/models/ss.onnx',
    weights: 'ss.onnx',
    samples: [
      'ss-victim-024.png',
      'ss-ship-014.png',
      'ss-plane-036.png',
      'ss-mixed-048.png',
      'ss-ship-028.png',
      'ss-plane-022.png',
    ],
  },
  {
    id: 'forward',
    label: 'Forward-looking sonar',
    model: 'yolo11s-fls',
    caption: 'FLS · YOLO11s ONNX model',
    onnx: '/models/fls.onnx',
    weights: 'fls.onnx',
    samples: [
      'marine-debris-aris3k-324.png',
      'marine-debris-aris3k-609.png',
      'marine-debris-aris3k-1073.png',
      'marine-debris-aris3k-1176.png',
      'marine-debris-aris3k-1245.png',
      'marine-debris-aris3k-1376.png',
    ],
  },
]

export const DEFAULT_SCAN_TYPE = 'sidescan'

export const scanTypeOf = (id) => SCAN_TYPES.find((t) => t.id === id) || SCAN_TYPES[0]

export const MODEL_META = {
  model: scanTypeOf(DEFAULT_SCAN_TYPE).model,
  classes: CLASSES.slice(),
  source: 'onnxruntime-web · yolo11s',
  ready: false,
  embedded: true,
}

export const SAMPLE_IMAGES = scanTypeOf(DEFAULT_SCAN_TYPE).samples

export const N_CLASSES_BY_TYPE = Object.fromEntries(SCAN_TYPES.map((t) => [t.id, classesFor(t.id).length]))

/**
 * Availability of the embedded (in-browser) models. Each scan type is ready
 * when its ONNX weights are served from public/models/.
 */
export async function fetchHealth(scanTypeId = DEFAULT_SCAN_TYPE) {
  const perType = {}
  for (const t of SCAN_TYPES) {
    let ok = false
    try {
      const res = await fetch(t.onnx, { method: 'HEAD' })
      ok = res.ok
    } catch {
      ok = false
    }
    perType[t.id] = { ready: ok }
  }
  const active = scanTypeOf(scanTypeId)
  return {
    model: 'yolo11s',
    classes: classesFor(scanTypeId).slice(),
    source: 'onnxruntime-web · yolo11s',
    ready: perType[scanTypeId]?.ready ?? false,
    scan_type: scanTypeId,
    scan_types: perType,
    weights: active.weights,
    embedded: true,
  }
}

/** Parse a sonar coordinate sidecar (.csv | .json) into {filename: {lat, lon}}. */
export function parseCoordinates(text, fallbackName) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Empty coordinate file.')
  const out = {}
  const put = (name, lat, lon) => {
    const n = Number(lat)
    const m = Number(lon)
    if (!Number.isFinite(n) || !Number.isFinite(m) || n < -90 || n > 90 || m < -180 || m > 180) {
      throw new Error(`Invalid coordinates for ${name || '<unnamed>'}: lat=${lat}, lon=${lon}`)
    }
    out[name] = { lat: n, lon: m }
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const data = JSON.parse(trimmed)
    if (Array.isArray(data)) {
      for (const row of data) put(row.filename ?? row.image ?? fallbackName, row.lat, row.lon)
    } else {
      for (const [name, v] of Object.entries(data)) {
        put(name, Array.isArray(v) ? v[0] : v.lat, Array.isArray(v) ? v[1] : v.lon)
      }
    }
  } else {
    const rows = trimmed.split(/\r?\n/)
    const header = rows[0].toLowerCase()
    const hasHeader = /file|image|name/.test(header) && /lat/.test(header) && /lon/.test(header)
    const list = hasHeader ? rows.slice(1) : rows
    for (const row of list) {
      const cells = row.split(',').map((c) => c.trim())
      if (cells.length < 3 || (cells.length === 1 && !cells[0])) continue
      put(cells[0] || fallbackName, cells[1], cells[2])
    }
  }
  if (!Object.keys(out).length) throw new Error('No coordinates parsed — expected "filename,lat,lon" per line.')
  return out
}