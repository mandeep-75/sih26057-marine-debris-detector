import { useSession } from '../session.jsx'
import { classDotClass } from '../classes.js'

function formatSize(bytes) {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

function StatusRow({ img, onView }) {
  const { setImageStatus, removeImage } = useSession()
  if (img.status === 'pending') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="size-1.5 rounded-full bg-slate-400" />
        Pending
      </div>
    )
  }
  if (img.status === 'processing') {
    return (
      <div className="flex items-center gap-2 text-xs text-accent-700" aria-busy="true">
        <svg className="size-3.5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Detecting…
      </div>
    )
  }
  if (img.status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600">
        <span>✕ Detection failed — the model could not process this image.</span>
        <button onClick={() => setImageStatus(img.id, { status: 'pending' })} className="rounded px-1.5 py-0.5 text-accent-700 hover:bg-slate-100">
          Retry
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-emerald-700">
      <span>✓ {img.detections.length} object{img.detections.length === 1 ? '' : 's'}</span>
      <button onClick={() => onView(img)} className="rounded px-1.5 py-0.5 text-accent-700 hover:bg-slate-100">
        View
      </button>
    </div>
  )
}

export default function FileQueue({ onView }) {
  const { images, removeImage, clearAll } = useSession()
  const busy = images.some((i) => i.status === 'processing')
  if (!images.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-surface-1 p-6 text-center text-sm text-slate-600">
        Scan queue empty — drop images above, or load samples.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-surface-1">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-medium text-slate-600">
          Scan queue — {images.length} {images.length === 1 ? 'scan' : 'scans'}
        </span>
        <button
          onClick={clearAll}
          disabled={busy}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          Clear all
        </button>
      </div>
      <div className="divide-y divide-slate-200">
        {images.map((img) => (
        <div key={img.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50" tabIndex="0" data-queue-item>
          <img src={img.url} alt={img.name} className="size-12 rounded object-cover grayscale" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-slate-800">{img.name}</p>
              <span className="shrink-0 text-xs text-slate-500">{formatSize(img.size)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <StatusRow img={img} onView={onView} />
              {img.latency_ms != null && (
                <span className="font-mono text-[10px] text-slate-500">{img.latency_ms} ms</span>
              )}
            </div>
            {img.status === 'done' && img.detections.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {img.detections.slice(0, 4).map((d) => (
                  <span key={d.id} className="flex items-center gap-1 text-[10px] text-slate-600">
                    <span className={`size-1.5 rounded-full ${classDotClass(d.class)}`} />
                    {d.class} <span className="font-mono">{Math.round(d.confidence * 100)}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {img.status !== 'processing' && (
            <button
              onClick={() => removeImage(img.id)}
              className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              aria-label={`Remove ${img.name}`}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 4h10M6.5 4V2h3v2m-6 2 .5 8h6l.5-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
      </div>
    </div>
  )
}