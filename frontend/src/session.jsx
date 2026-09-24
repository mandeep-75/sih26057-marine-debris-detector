import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_SCAN_TYPE } from './api.js'

const SessionContext = createContext(null)

let uid = 0
const nextId = () => `f-${++uid}`

export function SessionProvider({ children }) {
  const [images, setImages] = useState([])
  const [origin, setOriginState] = useState(null) // batch fallback {lat, lon, metersPerPixel}
  const [coords, setCoords] = useState({}) // sidecar metadata: filename -> {lat, lon}
  const [confThreshold, setConfThreshold] = useState(0.7)
  const [classFilter, setClassFilter] = useState(null) // null = all, else Set of class names
  const [activeDetectionId, setActiveDetectionId] = useState(null)
  const [scanType, setScanType] = useState(DEFAULT_SCAN_TYPE)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, kind = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const addFiles = useCallback((files) => {
    const allowed = files.filter((f) => /\.(png|jpe?g)$/i.test(f.name))
    if (allowed.length) {
      setImages((prev) => [
        ...prev,
        ...allowed.map((f) => ({
          id: nextId(),
          file: f,
          name: f.name,
          url: URL.createObjectURL(f),
          size: f.size,
          status: 'pending',
          detections: [],
          latency_ms: null,
          width: null,
          height: null,
        })),
      ])
    }
    return allowed.length
  }, [])

  const removeImage = useCallback((id) => {
    setImages((prev) => {
      const img = prev.find((x) => x.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const setImageStatus = useCallback((id, patch) => {
    setImages((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])

  const clearAll = useCallback(() => {
    setImages((prev) => {
      prev.forEach((x) => URL.revokeObjectURL(x.url))
      return []
    })
  }, [])

  const resetSession = useCallback(() => {
    setImages((prev) => {
      prev.forEach((x) => URL.revokeObjectURL(x.url))
      return []
    })
    setOriginState(null)
    setCoords({})
    setConfThreshold(0.7)
    setClassFilter(null)
    setActiveDetectionId(null)
    setToasts([])
  }, [])

  const setOrigin = useCallback((patch) => {
    setOriginState((prev) => (patch === null ? null : { ...(prev || {}), ...patch }))
  }, [])

const value = useMemo(
    () => ({
      images,
      setImages,
      origin,
      setOrigin,
      coords,
      setCoords,
      confThreshold,
      setConfThreshold,
      classFilter,
      setClassFilter,
      activeDetectionId,
      setActiveDetectionId,
      scanType,
      setScanType,
      toasts,
      addToast,
      addFiles,
      removeImage,
      clearAll,
      setImageStatus,
      resetSession,
    }),
    [images, origin, setOrigin, coords, setCoords, confThreshold, classFilter, activeDetectionId, scanType, toasts, addToast, addFiles, removeImage, clearAll, setImageStatus, resetSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function gatedStatus(images, geo) {
  const processed = images.filter((i) => i.status === 'done')
  const detections = processed.flatMap((i) => i.detections)
  const gatedGeo = Object.fromEntries(
    Object.entries(geo).filter(([, v]) => v && Number.isFinite(v.lat) && Number.isFinite(v.lon)),
  )
  return {
    pending: images.some((i) => i.status === 'pending' || i.status === 'processing'),
    processing: images.some((i) => i.status === 'processing'),
    processedCount: processed.length,
    detectionCount: detections.length,
    locatedImages: Object.keys(gatedGeo).length,
  }
}