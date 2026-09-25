import { useSession } from '../session.jsx'
import { classesFor, classDotClass } from '../classes.js'

export function ConfidenceSlider() {
  const { confThreshold, setConfThreshold, images } = useSession()
  const pct = Math.round(confThreshold * 100)
  const total = images.flatMap((i) => (i.status === 'done' ? i.detections : [])).length
  const hidden = images.reduce(
    (n, i) => n + (i.status === 'done' ? i.detections.filter((d) => d.confidence < confThreshold).length : 0),
    0,
  )
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="conf-slider" className="whitespace-nowrap text-xs text-slate-700">
        Confidence ≥
      </label>
      <div className="flex flex-1 items-center gap-3">
        <input
          id="conf-slider"
          type="range"
          min={0}
          max={95}
          step={5}
          value={pct}
          aria-valuetext={`minimum ${pct} percent`}
          onChange={(e) => setConfThreshold(Number(e.target.value) / 100)}
          className="h-4 flex-1 cursor-pointer"
        />
        <span className="w-12 text-right font-mono text-sm text-accent-700">{pct}%</span>
      </div>
      {hidden > 0 && total > 0 && (
        <button
          onClick={() => setConfThreshold(0.7)}
          className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
          title="Reset to 70%"
        >
          {hidden} hidden · reset
        </button>
      )}
    </div>
  )
}

export function ClassFilterChips({ counts }) {
  const { classFilter, setClassFilter, scanType } = useSession()
  const classNames = classesFor(scanType)

  const toggle = (cls) => {
    setClassFilter((prev) => {
      if (!cls) return null
      const next = new Set(prev || [])
      if (next.has(cls)) next.delete(cls)
      else next.add(cls)
      return next.size ? next : null
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => toggle(null)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
          !classFilter
            ? 'border-accent-600 bg-accent-50 text-accent-700'
            : 'border-slate-300 bg-transparent text-slate-600 hover:text-slate-800'
        }`}
      >
        all
      </button>
      {classNames.map((cls) => {
        const n = counts[cls] || 0
        const active = classFilter?.has(cls)
        const dim = classFilter && !active
        return (
          <button
            key={cls}
            onClick={() => toggle(cls)}
            aria-pressed={!!active}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
              active
                ? 'border-accent-600 bg-accent-50 text-accent-700'
                : 'border-slate-300 bg-transparent text-slate-600 hover:text-slate-800'
            } ${dim ? 'opacity-40' : ''}`}
          >
            <span className={`size-1.5 rounded-full ${classDotClass(cls)}`} />
            {cls}
            {n > 0 && <span className="font-mono text-[10px] text-slate-500">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}
