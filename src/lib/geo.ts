export type LatLon = [number, number]

const R = 6371000
const rad = (d: number) => (d * Math.PI) / 180

/** Distance in metres between two points (haversine). */
export function dist(a: LatLon, b: LatLon): number {
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Compass bearing in degrees from a to b. */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]))
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
    Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Walking minutes for a distance; families with small kids walk slower. */
export function walkMinutes(metres: number, pace: 'family' | 'normal' = 'family'): number {
  const speed = pace === 'family' ? 55 : 75 // metres per minute
  return Math.max(1, Math.round(metres / speed))
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`
}
