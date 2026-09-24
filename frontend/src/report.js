const LA_DEG_PER_M = 1 / 111320
const LO_DEG_PER_M = 1 / 111320

export function geoCenter(g) {
  return { lat: g.lat, lon: g.lon }
}

export function computeDetectionGeo(image, det, geo) {
  const [x1, y1, x2, y2] = det.bbox
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const wPx = (x2 - x1) * image.width
  const hPx = (y2 - y1) * image.height
  const lengthM = wPx * geo.metersPerPixel
  const widthM = hPx * geo.metersPerPixel
  const lonPerM = LO_DEG_PER_M / Math.max(0.15, Math.cos((geo.lat * Math.PI) / 180))
  const dxM = (cx - 0.5) * image.width * geo.metersPerPixel
  const dyM = (cy - 0.5) * image.height * geo.metersPerPixel
  return {
    lat: geo.lat + dyM * LA_DEG_PER_M,
    lon: geo.lon + dxM * lonPerM,
    lengthM: +lengthM.toFixed(3),
    widthM: +widthM.toFixed(3),
    areaM2: +(lengthM * widthM).toFixed(3),
  }
}

export function computeReport(images, origin, coords = {}) {
  const detections = []
  for (const img of images) {
    if (img.status !== 'done') continue
    // Per-image metadata (sidecar) wins; otherwise the batch coordinate applies.
    const geo = coords[img.name] || origin
    const valid =
      geo &&
      Number.isFinite(geo.lat) &&
      Number.isFinite(geo.lon) &&
      (geo.metersPerPixel ?? origin?.metersPerPixel) > 0
    for (const d of img.detections) {
      const res = valid ? computeDetectionGeo(img, d, { ...geo, metersPerPixel: geo.metersPerPixel ?? origin.metersPerPixel }) : null
      detections.push({
        id: d.id,
        image: img.name,
        class: d.class,
        confidence: d.confidence,
        bbox_norm: d.bbox,
        lat: res ? +res.lat.toFixed(6) : null,
        lon: res ? +res.lon.toFixed(6) : null,
        has_coords: !!res,
        length_m: res ? res.lengthM : null,
        width_m: res ? res.widthM : null,
        area_m2: res ? res.areaM2 : null,
      })
    }
  }
  const located = detections.filter((d) => d.has_coords).length
  const unlocatedImages = images.filter((i) => i.status === 'done' && !(coords[i.name] || origin)).map((i) => i.name)
  return {
    report_id: `scan-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-4)}`,
    generated_at: new Date().toISOString(),
    model: 'yolo11s',
    summary: {
      images: images.filter((i) => i.status === 'done').length,
      objects: detections.length,
      located,
      unlocated_images: unlocatedImages,
    },
    detections,
  }
}

export function toCsv(report) {
  const header = [
    'id', 'image', 'class', 'confidence',
    'bbox_x1', 'bbox_y1', 'bbox_x2', 'bbox_y2',
    'lat', 'lon', 'length_m', 'width_m', 'area_m2',
  ]
  const rows = report.detections.map((d) => [
    d.id, d.image, d.class, d.confidence,
    d.bbox_norm[0], d.bbox_norm[1], d.bbox_norm[2], d.bbox_norm[3],
    d.lat ?? '', d.lon ?? '', d.length_m ?? '', d.width_m ?? '', d.area_m2 ?? '',
  ])
  const esc = (v) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}