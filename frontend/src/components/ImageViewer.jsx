import { useMemo, useState } from 'react'
import { useSession } from '../session.jsx'
import { CLASS_COLORS, chipTextColor } from '../classes.js'

function BoxOverlay({ img, visible }) {
  const { confThreshold, classFilter, activeDetectionId, setActiveDetectionId } = useSession()

  return (
    <div className="pointer-events-none absolute inset-0">
      {img.detections.map((d) => {
        const [bx1, by1, bx2, by2] = d.bbox
        const belowConf = d.confidence < confThreshold
        const filtered = classFilter && !classFilter.has(d.class)
        const dim = belowConf || filtered
        const active = activeDetectionId === d.id
        const nearTop = by1 * 100 < 12
        return (
          <div
            key={d.id}
            onMouseEnter={() => setActiveDetectionId(d.id)}
            onMouseLeave={() => setActiveDetectionId(null)}
            onFocus={() => setActiveDetectionId(d.id)}
            onBlur={() => setActiveDetectionId(null)}
            className={`absolute border-2 transition-opacity ${dim ? 'opacity-20' : ''} ${active ? 'z-10' : ''}`}
            style={{
              left: `${bx1 * 100}%`,
              top: `${by1 * 100}%`,
              width: `${(bx2 - bx1) * 100}%`,
              height: `${(by2 - by1) * 100}%`,
              borderColor: CLASS_COLORS[d.class],
              boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9), 0 0 0 3px rgba(15,23,42,0.55)',
              pointerEvents: dim ? 'none' : 'auto',
            }}
            tabIndex={0}
            role="button"
            aria-label={`${d.class} ${Math.round(d.confidence * 100)} percent confidence`}
          >
            <span
              className={`absolute left-0 whitespace-nowrap rounded px-1 text-[11px] font-bold uppercase leading-none tracking-wider ${dim ? 'hidden' : ''} ${
                nearTop ? 'bottom-[-13px]' : 'top-[-13px]'
              }`}
              style={{ background: CLASS_COLORS[d.class], color: chipTextColor(d.class) }}
            >
              {d.class} {Math.round(d.confidence * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ImageViewer({ img, index, total, onPrev, onNext }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const srcPos = useMemo(() => {
    if (zoom <= 1) return { x: 0, y: 0 }
    return pan
  }, [zoom, pan])

  const zoomBy = (f) => setZoom((z) => Math.min(4, Math.max(1, +(z * f).toFixed(2))))
  const fit = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-surface-1">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            aria-label="Previous image"
          >
            ‹
          </button>
          <span className="font-mono text-xs text-slate-500">
            {index + 1} / {total}
          </span>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            aria-label="Next image"
          >
            ›
          </button>
          <span className="max-w-[16rem] truncate text-xs text-slate-600">{img.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <button onClick={() => zoomBy(1.25)} className="rounded px-1.5 py-0.5 hover:bg-slate-100">+</button>
          <button onClick={() => zoomBy(0.8)} className="rounded px-1.5 py-0.5 hover:bg-slate-100">−</button>
          <button onClick={fit} className="rounded px-1.5 py-0.5 hover:bg-slate-100">
            fit
          </button>
          <span className="font-mono text-[10px] text-slate-500">{zoom.toFixed(2)}×</span>
        </div>
      </div>

      <div className="relative flex max-h-[560px] justify-center overflow-auto bg-slate-200 p-4">
        <div
          className="relative inline-block"
          style={
            zoom > 1
              ? {
                  transform: `translate(${srcPos.x}px, ${srcPos.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  cursor: 'grab',
                }
              : undefined
          }
          onMouseDown={zoom > 1 ? () => setDragging(true) : undefined}
          onMouseMove={
            zoom > 1 && dragging
              ? (e) => setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }))
              : undefined
          }
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <img
            src={img.url}
            alt={`Side-scan sonar scan ${img.name}; ${img.detections.length} detected object${img.detections.length === 1 ? '' : 's'}`}
            className="block max-h-[520px] w-auto grayscale"
            draggable={false}
          />
          <BoxOverlay img={img} visible />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-2">
        {img.detections.slice(0, 6).map((d) => (
          <span
            key={d.id}
            className="flex items-center gap-1.5 text-xs text-slate-700"
            style={{ color: CLASS_COLORS[d.class] }}
          >
            <span className="size-2 rounded-sm" style={{ background: CLASS_COLORS[d.class] }} />
            {d.class}
            <span className="font-mono text-slate-600">{Math.round(d.confidence * 100)}%</span>
          </span>
        ))}
        {img.detections.length === 0 && <span className="text-xs text-slate-500">No objects above threshold on this scan.</span>}
      </div>
    </div>
  )
}