import { useMemo, useState } from 'react'
import { useSession } from '../session.jsx'
import { CLASS_COLORS } from '../classes.js'

function confClass(c) {
  if (c >= 0.8) return 'text-emerald-700'
  if (c >= 0.5) return 'text-accent-700'
  return 'text-amber-700'
}

const SORT = {
  none: null,
  class: (a, b) => a.class.localeCompare(b.class),
  conf: (a, b) => b.confidence - a.confidence,
  box: (a, b) => a.bbox[0] - b.bbox[0],
  image: (a, b) => a.image.localeCompare(b.image),
}

export default function ResultsTable({ rows }) {
  const { confThreshold, classFilter, activeDetectionId, setActiveDetectionId } = useSession()
  const [sortKey, setSortKey] = useState('conf')
  const [asc, setAsc] = useState(false)

  const cols = [
    { key: 'class', label: 'Class' },
    { key: 'conf', label: 'Confidence' },
    { key: 'box', label: 'Box (x1,y1,x2,y2)' },
    { key: 'image', label: 'Image' },
  ]

  const rowsArr = useMemo(() => {
    const filtered = rows.filter((r) => r.confidence >= confThreshold && (!classFilter || classFilter.has(r.class)))
    const sorter = SORT[sortKey]
    if (!sorter) return filtered
    const sorted = [...filtered].sort(sorter)
    return asc ? sorted : sortKey === 'conf' ? sorted : sorted.reverse()
  }, [rows, confThreshold, classFilter, sortKey, asc])

  const total = rows.length
  const shown = rowsArr.length
  const hidden = total - shown

  const toggleSort = (key) => {
    if (sortKey === key) {
      if (key === 'conf') return // conf stays desc
      setAsc((a) => !a)
    } else {
      setSortKey(key)
      setAsc(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-surface-1">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h3 className="text-sm font-medium text-slate-800">Detections</h3>
        {hidden > 0 && <span className="text-xs text-amber-700">{hidden} hidden below threshold / filter</span>}
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {shown === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {total === 0 ? 'No detections in this batch.' : 'No rows match the current threshold / filter.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-1">
              <tr className="border-b border-slate-200 text-xs text-slate-600">
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-medium">
                    <button
                      onClick={() => toggleSort(c.key)}
                      aria-sort={sortKey === c.key ? (asc ? 'ascending' : 'descending') : 'none'}
                      className="flex items-center gap-1 uppercase tracking-wide hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                    >
                      {c.label}
                      {sortKey === c.key && <span className="text-accent-700">{asc ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsArr.map((r) => {
                const [bx1, by1, bx2, by2] = r.bbox
                const active = activeDetectionId === r.id
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setActiveDetectionId(r.id)}
                    onMouseLeave={() => setActiveDetectionId(null)}
                    className={`border-b border-slate-200/60 last:border-0 ${active ? 'bg-accent-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-sm swatch" style={{ background: CLASS_COLORS[r.class] }} />
                        {r.class}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-mono text-xs ${confClass(r.confidence)}`}>
                      {Math.round(r.confidence * 100)}%
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {bx1.toFixed(2)} {by1.toFixed(2)} {bx2.toFixed(2)} {by2.toFixed(2)}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-xs text-slate-600">{r.image}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}