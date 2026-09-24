import { useRef, useState } from 'react'
import { useSession } from '../session.jsx'
import { scanTypeOf } from '../api.js'

export function DropZone() {
  const { addFiles, addToast, scanType } = useSession()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  const accept = (files) => {
    if (!files?.length) return
    const n = addFiles(Array.from(files))
    if (n) {
      setError(null)
      addToast(`${n} scan${n > 1 ? 's' : ''} added to queue`, 'success')
    } else {
      setError('Unsupported format — PNG / JPG only.')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          accept(e.dataTransfer.files)
        }}
        className={`flex h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed transition-colors ${
          dragOver ? 'border-accent-500 bg-accent-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-10 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium text-slate-800">
          {dragOver ? 'Release to add to the scan queue' : 'Drop sonar scans here'}
        </p>
        <p className="text-xs text-slate-600">PNG / JPG · single or batch · max 50 files</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Browse scan files
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          multiple
          className="hidden"
          onChange={(e) => {
            accept(e.target.files)
            e.target.value = ''
          }}
          aria-label="Choose sonar image files"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Model: <span className="font-mono text-slate-600">{scanTypeOf(scanType).model}</span> · {scanTypeOf(scanType).label} · 10 classes ·
        pre-processing: speckle filter + contrast enhancement · streamed inference
      </p>
    </div>
  )
}

export function SampleGallery({ onLoadSamples }) {
  const { addToast, scanType } = useSession()
  const [loading, setLoading] = useState(false)
  const samples = scanTypeOf(scanType).samples

  const load = (names) => {
    setLoading(true)
    // Fetch from public/ so real imagery (with object URLs) reaches the queue.
    Promise.all(
      names.map(async (n) => {
        const res = await fetch(`/samples/${n}`)
        const blob = await res.blob()
        return new File([blob], n, { type: 'image/png' })
      }),
    )
      .then((realFiles) => {
        for (const f of realFiles) onLoadSamples(f)
        addToast(`${realFiles.length} sample scans loaded`, 'success')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">
          Sample scans — {scanTypeOf(scanType).label} ·{' '}
          <span className="font-mono text-slate-600">{scanTypeOf(scanType).model}</span>
        </h3>
        <button
          onClick={() => load(samples)}
          disabled={loading}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:opacity-50"
        >
          {loading ? 'Loading…' : `Load all ${samples.length}`}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {samples.map((n) => (
          <button
            key={n}
            onClick={() => load([n])}
            className="group overflow-hidden rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            aria-label={`Load sample ${n}`}
          >
            <img
              src={`/samples/${n}`}
              alt={n}
              loading="lazy"
              className="aspect-square w-full object-cover grayscale transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    </div>
  )
}