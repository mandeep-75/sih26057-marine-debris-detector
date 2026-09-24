import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useSession } from './session.jsx'
import { computeReport, toCsv, download } from './report.js'
import { CLASS_COLORS, chipTextColor } from './classes.js'
import EmptyState from './components/EmptyState.jsx'

function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6) })
    },
  })
  return null
}

function markerIcon(cls) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${CLASS_COLORS[cls]};border:2px solid #ffffff;box-shadow:0 0 0 1.5px rgba(15,23,42,.4),0 2px 6px rgba(15,23,42,.25);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function originIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#ffffff;border:3px solid #0e7490;box-shadow:0 0 0 1.5px rgba(15,23,42,.35),0 2px 8px rgba(15,23,42,.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function popupContent(d, image, onView) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: CLASS_COLORS[d.class], color: chipTextColor(d.class) }}
        >
          {d.class}
        </span>
        <span className="font-mono text-sm text-slate-900">{(d.confidence * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-slate-100">
        <div className="h-full" style={{ width: `${d.confidence * 100}%`, background: CLASS_COLORS[d.class] }} />
      </div>
      <dl className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Dimensions</dt>
          <dd className="font-mono text-slate-800">
            {d.length_m != null ? `${d.length_m} × ${d.width_m} m` : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Location</dt>
          <dd className="font-mono text-slate-800">
            {d.lat.toFixed(5)}°, {d.lon.toFixed(5)}°
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Source</dt>
          <dd className="max-w-[10rem] truncate text-slate-700">{image.name}</dd>
        </div>
      </dl>
      <button
        onClick={onView}
        className="mt-2 w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-accent-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
      >
        View in Review →
      </button>
    </>
  )
}

const validLat = (v) => {
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= -90 && n <= 90 ? n : undefined
}
const validLon = (v) => {
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= -180 && n <= 180 ? n : undefined
}
const validMpp = (v) => {
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function BatchLocation({ origin, onApply }) {
  const [draft, setDraft] = useState({
    lat: origin?.lat ?? '',
    lon: origin?.lon ?? '',
    metersPerPixel: origin?.metersPerPixel ?? DEFAULT_MPP,
  })
  useEffect(() => {
    if (origin) setDraft((d) => ({ ...d, lat: origin.lat, lon: origin.lon, metersPerPixel: origin.metersPerPixel }))
  }, [origin])

  const lat = validLat(String(draft.lat))
  const lon = validLon(String(draft.lon))
  const mpp = validMpp(String(draft.metersPerPixel))
  const complete = lat != null && lon != null && mpp != null
  const errors =
    lat === undefined || lon === undefined || mpp === undefined ? 'enter out-of-range values in blue' : ''

  const field = (key, label) => (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft[key]}
        placeholder={key === 'metersPerPixel' ? 'm/px' : ''}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className={`h-9 w-24 rounded-md border bg-white px-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-1 ${
          validOf(key) === undefined && draft[key] !== ''
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40'
            : 'border-slate-300 focus:border-accent-600 focus:ring-accent-600/40'
        }`}
      />
    </label>
  )

  function validOf(key) {
    if (key === 'lat') return validLat(String(draft.lat))
    if (key === 'lon') return validLon(String(draft.lon))
    return validMpp(String(draft.metersPerPixel))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Batch coordinate — one location links every scan</h3>
          <p className="text-xs text-slate-600">Fill the fields, then apply, or click the map to drop the marker.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {field('lat', 'lat')}
          {field('lon', 'lon')}
          {field('metersPerPixel', 'm/px')}
          <button
            onClick={() => complete && onApply({ lat, lon, metersPerPixel: mpp })}
            disabled={!complete}
            className="rounded-md bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            Apply to batch
          </button>
        </div>
      </div>
      {errors && <p className="mt-2 text-xs text-red-600">{errors}</p>}
    </div>
  )
}

const TILE_KEY = import.meta.env.VITE_CARTO_API_KEY

const DEFAULT_MPP = 0.012

const TILES = TILE_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${TILE_KEY}`,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }
  : {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    }

export default function MapTab({ goTo }) {
  const { images, origin, setOrigin, coords, confThreshold, addToast } = useSession()

  const report = useMemo(() => {
    const cloned = images.map((i) => ({
      ...i,
      detections: i.status === 'done' ? i.detections.filter((d) => d.confidence >= confThreshold) : i.detections,
    }))
    return computeReport(cloned, origin, coords)
  }, [images, origin, coords, confThreshold])

  const located = report.detections.filter((d) => d.has_coords)

  const legend = useMemo(() => {
    const c = {}
    for (const d of located) c[d.class] = (c[d.class] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [located])

  const [exported, setExported] = useState(false)

  const doExport = (kind) => {
    setExported(false)
    if (kind === 'json') {
      download(`${report.report_id}.json`, JSON.stringify(report, null, 2), 'application/json')
    } else {
      download(`${report.report_id}.csv`, toCsv(report), 'text/csv')
    }
    setExported(true)
    addToast(`Report downloaded — ${kind.toUpperCase()}`, 'success')
    setTimeout(() => setExported(false), 2500)
  }

  const imageByName = (name) => images.find((i) => i.name === name)

  if (!report.detections.length) {
    return (
      <EmptyState
        title="No report to export"
        body="Generate detections first, then set a batch coordinate on the map to plot the scan."
        primaryLabel="Go to Upload"
        onPrimary={() => goTo('upload')}
      />
    )
  }

  return (
    <div className="grid gap-4">
<BatchLocation
          origin={origin}
          onApply={(o) => {
            setOrigin(o)
            addToast('Batch coordinate set — all objects located', 'success')
          }}
        />
        {report.summary.unlocated_images.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            <span aria-hidden="true">⚠</span>
            <span>
              {report.summary.unlocated_images.length} scanned image{report.summary.unlocated_images.length > 1 ? 's have' : ' has'} no
              coordinates — add them to a sidecar file or set the batch coordinate.
            </span>
          </div>
        )}

      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-surface-1">
        {!located.length && (
          <div className="absolute inset-x-0 top-0 z-[600] flex items-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs text-amber-900">
            <span aria-hidden="true">⚠</span>
            <span>No geolocation yet — load a coordinates file on Upload, or click the map / fill the fields to plot all objects.</span>
          </div>
        )}
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          scrollWheelZoom={true}
          className="h-[560px] w-full"
          style={{ background: '#d8e4ea' }}
        >
          <TileLayer attribution={TILES.attribution} url={TILES.url} />
          <LocationPicker
            onPick={(ll) => {
              setOrigin({ ...ll, metersPerPixel: origin?.metersPerPixel ?? DEFAULT_MPP })
              addToast('Location set on map — batch located', 'success')
            }}
          />
          {origin && <Marker position={[origin.lat, origin.lon]} icon={originIcon()} />}
          {located.map((d) => (
            <Marker
              key={d.id}
              position={[d.lat, d.lon]}
              icon={markerIcon(d.class)}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span style={{ color: CLASS_COLORS[d.class] }}>{d.class}</span>{' '}
                <span className="font-mono">{(d.confidence * 100).toFixed(0)}%</span>
              </Tooltip>
              <Popup>{popupContent(d, imageByName(d.image) || {}, () => goTo('review'))}</Popup>
            </Marker>
          ))}
        </MapContainer>
        {legend.length > 0 && (
          <div className="absolute right-3 top-12 z-[500] w-44 overflow-hidden rounded-lg border border-slate-300 bg-surface-2 p-2 text-xs shadow-lg shadow-slate-900/10">
            <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-slate-600">Legend · {located.length} located</p>
            {legend.map(([cls, n]) => (
              <div key={cls} className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="size-2 shrink-0 rounded-full swatch" style={{ background: CLASS_COLORS[cls] }} />
                <span className="flex-1 text-slate-800">{cls}</span>
                <span className="font-mono text-slate-500">{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-700">
            Report · <span className="font-mono text-slate-800">{report.summary.images}</span> scans ·{' '}
            <span className="font-mono text-slate-800">{report.summary.objects}</span> objects ·{' '}
            <span className="font-mono text-slate-800">{report.summary.located}</span> located
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => doExport('json')}
              className="rounded-md bg-accent-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              Download JSON
            </button>
            <button
              onClick={() => doExport('csv')}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              Download CSV
            </button>
            {exported && <span className="text-xs text-emerald-700" aria-live="polite">✓ generated</span>}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-1">
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Image</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Conf</th>
                <th className="px-4 py-2 font-medium">Lat</th>
                <th className="px-4 py-2 font-medium">Lon</th>
                <th className="px-4 py-2 font-medium">L×W (m)</th>
                <th className="px-4 py-2 font-medium">Area (m²)</th>
              </tr>
            </thead>
            <tbody>
              {report.detections.map((d) => (
                <tr key={d.id} className={`border-b border-slate-200/50 last:border-0 ${d.has_coords ? '' : 'opacity-50'}`}>
                  <td className="max-w-[12rem] truncate px-4 py-2 text-xs text-slate-600">{d.image}</td>
                  <td className="px-4 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="size-2 rounded-sm swatch" style={{ background: CLASS_COLORS[d.class] }} />
                      {d.class}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{(d.confidence * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{d.has_coords ? d.lat.toFixed(5) : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{d.has_coords ? d.lon.toFixed(5) : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">
                    {d.length_m != null ? `${d.length_m} × ${d.width_m}` : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{d.area_m2 != null ? d.area_m2 : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}