export default function EmptyState({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tone = 'neutral',
}) {
  const ring =
    tone === 'warn'
      ? 'border-highlight/40'
      : tone === 'error'
        ? 'border-red-300'
        : 'border-slate-300'
  const titleColor =
    tone === 'error' ? 'text-red-700' : tone === 'warn' ? 'text-amber-900' : 'text-slate-800'
  const icon = tone === 'error' ? '⚠' : tone === 'warn' ? '◌' : '○'
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-surface-1 px-6 py-12 text-center">
      <div className={`flex size-12 items-center justify-center rounded-lg border border-dashed ${ring} text-slate-600`}>
        <span className="text-xl">{icon}</span>
      </div>
      <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>
      <p className="max-w-sm text-sm text-slate-600">{body}</p>
      {primaryLabel && (
        <div className="mt-1 flex items-center gap-3">
          <button
            onClick={onPrimary}
            className="rounded-md bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button
              onClick={onSecondary}
              className="rounded-md px-3 py-2 text-sm text-accent-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}