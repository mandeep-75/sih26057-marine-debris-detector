import { useEffect, useRef, useState } from 'react'
import { SCAN_TYPES, fetchHealth, scanTypeOf } from '../api.js'
import { useSession } from '../session.jsx'

function Dot({ state }) {
  const base = 'size-2 rounded-full '
  if (state === 'ready') return <span className={`relative flex ${base}`}><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-600 opacity-50 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-emerald-600" /></span>
  if (state === 'down') return <span className={`${base} bg-red-500`} />
  return <span className={`${base} bg-amber-400`} />
}

export default function ModelStatusChip() {
  const { scanType, setScanType } = useSession()
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState(null)
  const rootRef = useRef(null)
  const active = scanTypeOf(scanType)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      const h = await fetchHealth(scanType)
      if (alive) setHealth(h)
    }
    poll()
    const t = setInterval(poll, 10000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [scanType])

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const state = health == null ? 'checking' : health.ready ? 'ready' : 'down'
  const readyOf = (id) => health?.scan_types?.[id]?.ready

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
      >
        <Dot state={state} />
        <span className="font-mono">{active.model}</span>
        <span className="text-slate-500">·</span>
        <span className="max-w-40 truncate">{active.label}</span>
        <svg viewBox="0 0 16 16" className={`size-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul role="listbox" className="absolute right-0 top-11 z-[1200] w-64 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg shadow-slate-900/10">
          <li className="border-b border-slate-200 px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            Model · {health?.source ?? '…'} {health?.weights ? `· ${health.weights.split('/').pop()}` : ''}
          </li>
          {SCAN_TYPES.map((t) => {
            const r = scanType === t.id ? health?.ready : readyOf(t.id)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={scanType === t.id}
                  onClick={() => {
                    setScanType(t.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${scanType === t.id ? 'bg-accent-50' : ''}`}
                >
                  <Dot state={r == null ? 'checking' : r ? 'ready' : 'down'} />
                  <span className="font-mono text-slate-800">{t.model}</span>
                  <span className="flex-1 truncate text-slate-600">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}