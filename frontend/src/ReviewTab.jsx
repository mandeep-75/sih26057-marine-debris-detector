import { useMemo, useState } from 'react'
import { useSession } from './session.jsx'
import ImageViewer from './components/ImageViewer.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import { ConfidenceSlider, ClassFilterChips } from './components/Controls.jsx'
import EmptyState from './components/EmptyState.jsx'

function useClassCounts(images) {
  return useMemo(() => {
    const counts = {}
    for (const img of images) {
      if (img.status === 'done') for (const d of img.detections) counts[d.class] = (counts[d.class] || 0) + 1
    }
    return counts
  }, [images])
}

export default function ReviewTab({ goTo }) {
  const { images } = useSession()
  const counts = useClassCounts(images)

  const done = images.filter((i) => i.status === 'done')
  const [selectedId, setSelectedId] = useState(null)
  const idx = done.findIndex((i) => i.id === selectedId)
  const selected = idx >= 0 ? done[idx] : done[0]

  if (!selected) {
    return (
      <EmptyState
        title="Nothing to review yet"
        body="Run detection on the Upload tab first."
        primaryLabel="Go to Upload"
        onPrimary={() => goTo('upload')}
      />
    )
  }

  const allDetections = done.flatMap((i) => i.detections)

  return (
    <div className="grid gap-4 xl:grid-cols-[5fr_4fr]">
      <div className="xl:sticky xl:top-20 xl:self-start">
        <ImageViewer
          img={selected}
          index={Math.max(0, idx)}
          total={done.length}
          onPrev={() => setSelectedId(done[Math.max(0, idx > 0 ? idx - 1 : 0)].id)}
          onNext={() => setSelectedId(done[Math.min(done.length - 1, idx >= 0 ? idx + 1 : 0)].id)}
        />
      </div>
      <div className="grid gap-4 content-start">
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-surface-1 p-4">
          <ConfidenceSlider />
          <ClassFilterChips counts={counts} />
        </div>
        <ResultsTable rows={allDetections} />
      </div>
    </div>
  )
}