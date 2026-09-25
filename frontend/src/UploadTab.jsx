import { useCallback, useRef, useState } from 'react'
import { useSession } from './session.jsx'
import { parseCoordinates } from './api.js'
import { detectImageFile, ensureEngine } from './onnxDetect.js'
import { DropZone, SampleGallery } from './components/UploadTabs.jsx'
import FileQueue from './components/FileQueue.jsx'
import { classDotClass } from './classes.js'

export function usePipeline() {
  const { images, setImageStatus, addToast, scanType, confThreshold } = useSession()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const pendingCount = images.filter((i) => i.status === 'pending').length
  const tally = images.reduce((acc, img) => {
    if (img.status === 'done') for (const d of img.detections) acc[d.class] = (acc[d.class] || 0) + 1
    return acc
  }, {})

  const runAll = useCallback(async () => {
    const pending = images.filter((i) => i.status === 'pending')
    if (!pending.length) return
    setRunning(true)
    setProgress({ done: 0, total: pending.length })

    const apply = (imgId, patch) => setImageStatus(imgId, patch)
    let scanStarted = false

    try {
      await ensureEngine(scanType)
      scanStarted = true
      let done = 0
      for (const img of pending) {
        apply(img.id, { status: 'processing' })
        try {
          const res = await detectImageFile(img.file, scanType, confThreshold)
          res.detections = (res.detections || []).map((d, i) => ({ ...d, id: `${img.name}#${i}` }))
          apply(img.id, {
            status: 'done',
            detections: res.detections,
            latency_ms: res.latency_ms,
            width: res.width,
            height: res.height,
          })
        } catch {
          apply(img.id, { status: 'error' })
        }
        done += 1
        setProgress({ done, total: pending.length })
      }
    } catch {
      pending.forEach((img) => apply(img.id, { status: 'error' }))
      setProgress({ done: pending.length, total: pending.length })
      addToast('Embedded model unavailable', 'error')
    } finally {
      setRunning(false)
      if (scanStarted) addToast('Scan complete', 'success')
    }
  }, [images, scanType, confThreshold, setImageStatus, addToast])

  return { running, progress, pendingCount, tally, runAll }
}

export function RunDetectionBar({ running, progress, pendingCount, tally, onReview }) {
  const { images } = useSession()
  const doneCount = images.filter((i) => i.status === 'done').length
  const totalObjects = images.reduce((n, i) => n + (i.status === 'done' ? i.detections.length : 0), 0)
  const barPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onReview}
          disabled={running || pendingCount === 0}
          aria-busy={running}
          className={
            running || pendingCount === 0
              ? 'rounded-md border border-slate-300 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700'
              : 'rounded-md bg-accent-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
          }
        >
          {running ? 'Detecting…' : pendingCount ? `Run detection on ${pendingCount} scan${pendingCount > 1 ? 's' : ''}` : 'Run detection'}
        </button>
        {running && (
          <div className="flex flex-1 items-center gap-3">
            <span className="text-xs font-mono text-accent-700">
              Completed {progress.done} / {progress.total}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-accent-700 transition-all duration-300" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        )}
        {!running && doneCount > 0 && (
          <span className="text-sm text-emerald-700" aria-live="polite">
            Scan complete — {doneCount} image{doneCount > 1 ? 's' : ''}, {totalObjects} object{totalObjects === 1 ? '' : 's'}.
          </span>
        )}
      </div>
      {Object.keys(tally).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="text-xs text-slate-500">Live tally:</span>
          {Object.entries(tally)
            .sort((a, b) => b[1] - a[1])
            .map(([cls, n]) => (
              <span key={cls} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                <span className={`size-1.5 rounded-full ${classDotClass(cls)}`} />
                {cls} <span className="font-mono">{n}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

function CoordinateLoader() {
  const { coords, setCoords, addToast, images } = useSession()
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const count = Object.keys(coords).length
  const matched = count ? images.filter((i) => coords[i.name]).length : 0

  const handleFile = async (file) => {
    setError(null)
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseCoordinates(text, images[0]?.name)
      setCoords({ ...coords, ...parsed })
      addToast(
        `Coordinates loaded — ${Object.keys(parsed).length} file${Object.keys(parsed).length > 1 ? 's' : ''} georeferenced`,
        'success',
      )
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Sonar metadata — per-image coordinates</h3>
          <p className="text-xs text-slate-600">
            Load a sidecar file mapping each scan to its geolocation (<span className="font-mono">filename,lat,lon</span>{' '}
            CSV or <span className="font-mono">{'{filename:{lat,lon}}'}</span> JSON). It overrides the batch coordinate on the map tab.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {count > 0 && (
            <span className="text-xs text-emerald-700">
              {Object.keys(coords).length} loaded · {matched} matched to scanned {matched === 1 ? 'image' : 'images'}
            </span>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            Load coordinates… (.csv / .json)
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
            aria-label="Load sonar coordinate file"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function UploadTab({ onReview, onView }) {
  const { addFiles } = useSession()
  const pipeline = usePipeline()
  return (
    <div className="grid gap-4">
      <DropZone />
      <CoordinateLoader />
      <SampleGallery onLoadSamples={(f) => addFiles([f])} />
      <RunDetectionBar
        running={pipeline.running}
        progress={pipeline.progress}
        pendingCount={pipeline.pendingCount}
        tally={pipeline.tally}
        onReview={pipeline.runAll}
      />
      <FileQueue onView={onView} />
    </div>
  )
}