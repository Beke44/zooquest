// Tiny IndexedDB vault for capture photos (they stay on the family's phone).
const DB = 'zooquest-photos'
const STORE = 'photos'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export async function savePhoto(key: string, dataUrl: string) {
  try {
    const db = await open()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, key)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch {
    /* storage unavailable – the capture still counts, just without a photo */
  }
}

export async function loadPhoto(key: string): Promise<string | null> {
  try {
    const db = await open()
    return await new Promise((res) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key)
      r.onsuccess = () => res((r.result as string) ?? null)
      r.onerror = () => res(null)
    })
  } catch {
    return null
  }
}

/** Downscale a camera image to keep the vault small (~40–80 KB each). */
export function compressImage(file: File, max = 720): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = rej
    img.src = url
  })
}

/**
 * Freshness check used against gallery cheating: a photo whose
 * lastModified is older than 10 minutes was not taken just now.
 */
export function isFreshShot(file: File): boolean {
  return Date.now() - file.lastModified < 10 * 60 * 1000
}
