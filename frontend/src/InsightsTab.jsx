import { useMemo } from 'react'
import { useSession } from './session.jsx'
import { classesFor, classDotClass, CLASS_COLORS } from './classes.js'
import EmptyState from './components/EmptyState.jsx'

function KpiCards({ images, detections }) {
  const { scanType } = useSession()
  const classNames = classesFor(scanType)
  const obj = detections.length
  const avg = obj ? detections.reduce((s, d) => s + d.confidence, 0) / obj : 0
  const classesFound = new Set(detections.map((d) => d.class))
  const firstTwo = classNames.filter((c) => classesFound.has(c)).slice(0, 2)
  const cards = [
    {
      label: 'Images scanned',
      value: images.filter((i) => i.status === 'done').length,
      caption: 'scans processed',
    },
    { label: 'Objects found', value: obj, caption: 'across all scans' },
    {
      label: 'Avg confidence',
      value: `${(avg * 100).toFixed(1)}%`,
      caption: `± ${(Math.max(...detections.map((d) => d.confidence), 0) * 100).toFixed(1)}% max`,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-200 bg-surface-2 p-5">
          <p className="text-xs text-slate-600">{c.label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{c.value}</p>
          <p className="mt-1 text-xs text-slate-500">{c.caption}</p>
        </div>
      ))}
      <div className="rounded-lg border border-slate-200 bg-surface-2 p-5">
        <p className="text-xs text-slate-600">Classes found</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{classesFound.size}/{classNames.length}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          {firstTwo.length ? (
            firstTwo.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                <span className={`size-1.5 rounded-full ${classDotClass(c)}`} />+{c}
              </span>
            ))
          ) : (
            '—'
          )}
        </p>
      </div>
    </div>
  )
}

function ClassDistribution({ detections }) {
  const { scanType } = useSession()
  const classNames = classesFor(scanType)
  const counts = useMemo(() => {
    const c = {}
    for (const d of detections) c[d.class] = (c[d.class] || 0) + 1
    return c
  }, [detections])
  const total = detections.length
  const rows = classNames.filter((c) => counts[c]).sort((a, b) => counts[b] - counts[a])
  const max = Math.max(...rows.map((c) => counts[c]), 1)

  if (!total) {
    return (
      <div className="rounded-lg border border-slate-200 bg-surface-1 p-6 text-center text-sm text-slate-600">
        No objects detected yet — this chart fills after detection.
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">Objects by class</h3>
        <span className="text-xs text-slate-500">total {total}</span>
      </div>
      <div className="grid gap-2">
        {rows.map((c) => (
          <div key={c} className="grid grid-cols-[7rem_1fr_3.5rem_2.5rem] items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className={`size-1.5 rounded-full ${classDotClass(c)}`} />
              {c}
            </span>
            <div className="h-3 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded"
                style={{ width: `${(counts[c] / max) * 100}%`, background: CLASS_COLORS[c] }}
                title={`${c}: ${counts[c]}`}
              />
            </div>
            <span className="text-right font-mono text-slate-700">{counts[c]}</span>
            <span className="text-right font-mono text-slate-500">{Math.round((counts[c] / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopConfidence({ detections, onView }) {
  const top = [...detections].sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  if (!top.length) return null
  return (
    <div className="rounded-lg border border-highlight/40 bg-surface-1 p-4 shadow-[0_0_16px_rgba(180,83,9,0.12)]">
      <div className="mb-3 flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="size-4 text-highlight" fill="currentColor" aria-hidden="true">
          <path d="M8 .5l2.2 4.5 4.9.7-3.5 3.5.8 4.9L8 11.8l-4.4 2.3.8-4.9L.9 5.7l4.9-.7L8 .5z" />
        </svg>
        <h3 className="text-sm font-medium text-slate-900">Top confidence hits</h3>
      </div>
      <div className="grid gap-2">
        {top.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onView(d)}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-surface-2 px-3 py-2 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <span className="font-mono text-lg font-semibold text-highlight">{(d.confidence * 100).toFixed(1)}%</span>
            <span className="flex items-center gap-1.5 text-sm text-slate-800">
              <span className={`size-2 rounded-sm ${classDotClass(d.class)}`} /> {d.class}
            </span>
            <span className="ml-auto truncate text-xs text-slate-500">{d.image}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function InsightsTab({ goTo }) {
  const { images } = useSession()
  const done = images.filter((i) => i.status === 'done')
  const detections = done.flatMap((i) => i.detections)

  if (!done.length || !detections.length) {
    return (
      <div className="grid gap-4">
        <EmptyState
          title={done.length ? 'All clear on this scan' : 'No objects to report on'}
          body={done.length ? 'No objects above 70% confidence in the current batch.' : 'Run detection first — insights fill after processing.'}
          primaryLabel="Go to Upload"
          onPrimary={() => goTo('upload')}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <KpiCards images={done} detections={detections} />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <ClassDistribution detections={detections} />
        <TopConfidence detections={detections} onView={() => goTo('review')} />
      </div>
    </div>
  )
}