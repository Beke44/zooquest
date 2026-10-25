import { useCallback, useEffect, useRef, useState } from 'react'
import { dist, type LatLon } from './geo'

export interface GeoState {
  pos: LatLon | null
  accuracy: number | null
  source: 'gps' | 'manual' | 'none'
  /** true when the family is not at the zoo (or GPS is off) → tap-to-set demo mode */
  demo: boolean
  error: string | null
}

/**
 * Live GPS with battery care: uses watchPosition while the map is open,
 * shows the accuracy circle honestly, and lets the user correct the
 * position by tapping the map when the signal is weak (ChatGPT's idea).
 */
export function useGeo(parkCenter: LatLon, parkRadius = 900) {
  const [s, set] = useState<GeoState>({ pos: null, accuracy: null, source: 'none', demo: false, error: null })
  const manual = useRef(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      set((p) => ({ ...p, demo: true, error: 'no-geolocation' }))
      return
    }
    const id = navigator.geolocation.watchPosition(
      (g) => {
        if (manual.current) return
        const pos: LatLon = [g.coords.latitude, g.coords.longitude]
        const far = dist(pos, parkCenter) > parkRadius
        set({ pos: far ? null : pos, accuracy: g.coords.accuracy, source: far ? 'none' : 'gps', demo: far, error: null })
      },
      (e) => set((p) => ({ ...p, demo: true, error: e.message })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [parkCenter, parkRadius])

  const setManual = useCallback((pos: LatLon) => {
    manual.current = true
    set((p) => ({ ...p, pos, accuracy: 8, source: 'manual' }))
    // fall back to GPS again after 2 minutes if it improves
    setTimeout(() => { manual.current = false }, 120000)
  }, [])

  return { ...s, setManual }
}

/** Keeps the screen awake during navigation (DeepSeek: Wake Lock). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [on])
}
