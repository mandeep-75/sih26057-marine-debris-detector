import { useSession } from '../session.jsx'

const ICONS = { success: '✓', error: '✕', info: '○' }

export default function Toasts() {
  const { toasts } = useSession()
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex w-80 flex-col-reverse gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-2 rounded-lg border border-slate-300 bg-surface-2 px-3 py-2.5 text-sm text-slate-800 shadow-lg shadow-slate-900/10"
        >
          <span className={t.kind === 'success' ? 'text-emerald-700' : t.kind === 'error' ? 'text-red-600' : 'text-accent-700'}>
            {ICONS[t.kind]}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}