import { useState } from 'react'
import { SessionProvider, useSession } from './session.jsx'
import Header from './components/Header.jsx'
import TabBar from './components/TabBar.jsx'
import Footer from './components/Footer.jsx'
import Toasts from './components/Toasts.jsx'
import UploadTab from './UploadTab.jsx'
import ReviewTab from './ReviewTab.jsx'
import InsightsTab from './InsightsTab.jsx'
import MapTab from './MapTab.jsx'

function Shell() {
  const [tab, setTab] = useState('upload')
  const { resetSession, addToast } = useSession()

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <Header
        onFreshSession={() => {
          resetSession()
          setTab('upload')
          addToast('Session cleared', 'info')
        }}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {tab === 'upload' && <UploadTab onReview={() => setTab('review')} />}
        {tab === 'review' && <ReviewTab goTo={setTab} />}
        {tab === 'insights' && <InsightsTab goTo={setTab} />}
        {tab === 'map' && <MapTab goTo={setTab} />}
      </main>
      <Footer />
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  )
}