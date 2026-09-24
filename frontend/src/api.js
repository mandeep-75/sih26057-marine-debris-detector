import { CLASSES } from './classes.js'

/* Scan-type registry. Drop a trained weights file into backend/ (yolo11s-ss_best.pt
   or yolo11s-fls_best.pt / DETECT_WEIGHTS_* env) and it is served automatically. */
export const SCAN_TYPES = [
  {
    id: 'sidescan',
    label: 'Side-scan sonar',
    model: 'yolo11s-ss',
    caption: 'SSS · YOLO11s (PS 26057)',
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
    caption: 'FLS · YOLO11s trained weights',
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
  source: 'ultralytics · yolo11s',
  ready: false,
}

export const SAMPLE_IMAGES = scanTypeOf(DEFAULT_SCAN_TYPE).samples

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Detection ids are unique per image (the backend re-uses d-0, d-1 … per request).
const uniqueIds = (detections, filename) =>
  (detections || []).map((d, i) => ({ ...d, id: `${filename}#${i}` }))

async function postDetect(file, scanTypeId, minConfidence) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const body = new FormData()
    body.append('file', file)
    body.append('scan_type', scanTypeId)
    const url = `${API_URL}/detect?min_confidence=${minConfidence}`
    const res = await fetch(url, { method: 'POST', body, signal: controller.signal })
    if (!res.ok) throw new Error(`backend ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const json = await res.json()
    json.detections = uniqueIds(json.detections, file.name)
    return json
  } finally {
    clearTimeout(timer)
  }
}

/** Run detection on one image (single POST). Rejects on failure. */
export async function runDetect(file, scanTypeId = DEFAULT_SCAN_TYPE, minConfidence = 0.25) {
  return postDetect(file, scanTypeId, minConfidence)
}

/**
 * Streaming batch detection (SSE). Posts many images in one request and invokes
 * onEvent(event) as each frame resolves, so the UI updates in real time:
 *   {event:'batch_start', total}
 *   {event:'image_start', index, total, filename}
 *   {event:'image_done',  index, total, filename, detections, latency_ms, width, height}
 *   {event:'image_error', index, total, filename, message}
 *   {event:'batch_done', total}
 */
export async function detectStream(files, scanTypeId = DEFAULT_SCAN_TYPE, minConfidence = 0.25, onEvent = () => {}) {
  const body = new FormData()
  for (const f of files) body.append('files', f)
  body.append('scan_type', scanTypeId)
  const url = `${API_URL}/detect/stream?min_confidence=${minConfidence}`
  const res = await fetch(url, { method: 'POST', body })
  if (!res.ok) throw new Error(`backend ${res.status}: ${(await res.text()).slice(0, 200)}`)
  if (!res.body) throw new Error('streaming unsupported')
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  const STOP = Symbol('stop')
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let sep
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const part = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      const line = part.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      let ev
      try {
        ev = JSON.parse(line.slice(6))
      } catch {
        continue
      }
      if (ev.event === 'image_done') ev.detections = uniqueIds(ev.detections, ev.filename)
      if (onEvent(ev) === STOP) {
        reader.cancel()
        return
      }
    }
  }
}

export async function fetchHealth(scanTypeId = DEFAULT_SCAN_TYPE) {
  const fallback = { ...MODEL_META, model: scanTypeOf(scanTypeId).model, scan_type: scanTypeOf(scanTypeId).id }
  try {
    const res = await fetch(`${API_URL}/health?scan_type=${scanTypeId}`)
    if (!res.ok) throw new Error()
    return { ...fallback, ...(await res.json()) }
  } catch {
    return fallback
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