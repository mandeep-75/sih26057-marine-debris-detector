import { useState } from 'react'
import ModelStatusChip from './ModelStatusChip.jsx'
import { useSession } from '../session.jsx'

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 text-accent-700" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.6" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  )
}

export default function Header({ onFreshSession }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              Marine Debris &amp; Anomaly Detection
            </h1>
            <p className="text-xs text-slate-600">Side-scan acoustic scan · NIOT / MoES · SIH26057</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModelStatusChip />
          <div className="relative">
            <button
              onClick={() => setConfirmOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 8h9M7 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Fresh session
            </button>
            {confirmOpen && (
              <>
                <div className="fixed inset-0 z-[1100]" onClick={() => setConfirmOpen(false)} />
                <div className="absolute right-0 top-11 z-[1200] w-72 rounded-lg border border-slate-300 bg-surface-2 p-4 shadow-lg shadow-slate-900/10">
                  <p className="text-sm text-slate-800">Clear this scan?</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Uploaded images, detections, coordinates, and the report will be removed.
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmOpen(false)}
                      className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setConfirmOpen(false)
                        onFreshSession()
                      }}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Clear session
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}