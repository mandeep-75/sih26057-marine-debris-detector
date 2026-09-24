import { useRef } from 'react'

const TABS = [
  { id: 'upload', label: 'Upload & Run' },
  { id: 'review', label: 'Review Detections' },
  { id: 'insights', label: 'Insights' },
  { id: 'map', label: 'Map & Report' },
]

export default function TabBar({ active, onChange }) {
  const refs = useRef([])

  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
      onChange(TABS[next].id)
      refs.current[next]?.focus()
    }
  }

  return (
    <div className="border-b border-slate-200 bg-surface-1">
      <div
        role="tablist"
        aria-label="Workflow steps"
        className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-6 py-2"
        onKeyDown={onKeyDown}
      >
        {TABS.map((t, i) => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              ref={(el) => (refs.current[i] = el)}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(t.id)}
className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
            isActive
              ? 'bg-accent-700 text-white ring-1 ring-accent-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {t.label}
        </button>
          )
        })}
      </div>
    </div>
  )
}