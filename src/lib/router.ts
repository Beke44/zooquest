import { dist, type LatLon } from './geo'

interface Edge { to: number; w: number }

/**
 * Walking graph built from the park's footpath polylines.
 * Vertices closer than MERGE metres are fused; dangling ends are
 * stitched to the nearest vertex within STITCH metres so small mapping
 * gaps don't break routing.
 */
export class WalkGraph {
  nodes: LatLon[] = []
  adj: Edge[][] = []
  private grid = new Map<string, number[]>()
  private static MERGE = 4
  private static STITCH = 18
  private static CELL = 0.0002 // ~20 m

  constructor(paths: LatLon[][]) {
    const degree: number[] = []
    for (const line of paths) {
      let prev = -1
      for (const p of line) {
        const id = this.addNode(p)
        if (prev !== -1 && prev !== id) {
          this.link(prev, id)
          degree[prev] = (degree[prev] ?? 0) + 1
          degree[id] = (degree[id] ?? 0) + 1
        }
        prev = id
      }
    }
    // stitch dead ends
    for (let i = 0; i < this.nodes.length; i++) {
      if ((degree[i] ?? 0) > 1) continue
      let best = -1
      let bestD = WalkGraph.STITCH
      for (const j of this.near(this.nodes[i], 1)) {
        if (j === i || this.adj[i].some((e) => e.to === j)) continue
        const d = dist(this.nodes[i], this.nodes[j])
        if (d < bestD) { bestD = d; best = j }
      }
      if (best !== -1) this.link(i, best)
    }
    this.bridgeIslands()
  }

  /**
   * Map data often has small disconnected pieces (a gate, a playground loop).
   * Join every island to the main network at its closest point (≤ 150 m),
   * so routing never fails silently – the bridge is a straight walk.
   */
  private bridgeIslands() {
    for (let guard = 0; guard < 50; guard++) {
      const comp = new Int32Array(this.nodes.length).fill(-1)
      const sizes: number[] = []
      for (let s = 0; s < this.nodes.length; s++) {
        if (comp[s] !== -1) continue
        const c = sizes.length
        let size = 0
        const stack = [s]
        comp[s] = c
        while (stack.length) {
          const u = stack.pop()!
          size++
          for (const e of this.adj[u]) if (comp[e.to] === -1) { comp[e.to] = c; stack.push(e.to) }
        }
        sizes.push(size)
      }
      if (sizes.length <= 1) return
      const main = sizes.indexOf(Math.max(...sizes))
      let bestD = Infinity
      let pair: [number, number] = [-1, -1]
      for (let i = 0; i < this.nodes.length; i++) {
        if (comp[i] === main) continue
        for (let j = 0; j < this.nodes.length; j++) {
          if (comp[j] !== main) continue
          const d = dist(this.nodes[i], this.nodes[j])
          if (d < bestD) { bestD = d; pair = [i, j] }
        }
      }
      if (bestD > 150) return
      this.link(pair[0], pair[1])
    }
  }

  private key(p: LatLon, dx = 0, dy = 0) {
    return `${Math.floor(p[0] / WalkGraph.CELL) + dx}:${Math.floor(p[1] / WalkGraph.CELL) + dy}`
  }

  private near(p: LatLon, r: number): number[] {
    const out: number[] = []
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) out.push(...(this.grid.get(this.key(p, dx, dy)) ?? []))
    return out
  }

  private addNode(p: LatLon): number {
    for (const j of this.near(p, 1)) if (dist(p, this.nodes[j]) < WalkGraph.MERGE) return j
    const id = this.nodes.length
    this.nodes.push(p)
    this.adj.push([])
    const k = this.key(p)
    this.grid.set(k, [...(this.grid.get(k) ?? []), id])
    return id
  }

  private link(a: number, b: number) {
    const w = dist(this.nodes[a], this.nodes[b])
    this.adj[a].push({ to: b, w })
    this.adj[b].push({ to: a, w })
  }

  nearest(p: LatLon): { id: number; d: number } {
    let best = -1
    let bestD = Infinity
    for (let r = 1; r <= 6 && best === -1; r += 2) {
      for (const j of this.near(p, r)) {
        const d = dist(p, this.nodes[j])
        if (d < bestD) { bestD = d; best = j }
      }
    }
    if (best === -1) {
      this.nodes.forEach((n, j) => {
        const d = dist(p, n)
        if (d < bestD) { bestD = d; best = j }
      })
    }
    return { id: best, d: bestD }
  }

  /** Shortest walking route; returns polyline and length in metres. */
  route(from: LatLon, to: LatLon): { line: LatLon[]; metres: number } | null {
    if (!this.nodes.length) return null
    const s = this.nearest(from)
    const t = this.nearest(to)
    const n = this.nodes.length
    const d = new Float64Array(n).fill(Infinity)
    const prev = new Int32Array(n).fill(-1)
    d[s.id] = 0
    const heap: [number, number][] = [[0, s.id]]
    while (heap.length) {
      const [du, u] = pop(heap)
      if (u === t.id) break
      if (du > d[u]) continue
      for (const e of this.adj[u]) {
        const nd = du + e.w
        if (nd < d[e.to]) { d[e.to] = nd; prev[e.to] = u; push(heap, [nd, e.to]) }
      }
    }
    if (!isFinite(d[t.id])) {
      return { line: [from, to], metres: dist(from, to) }
    }
    const line: LatLon[] = [to]
    for (let v = t.id; v !== -1; v = prev[v]) line.push(this.nodes[v])
    line.push(from)
    line.reverse()
    return { line, metres: d[t.id] + s.d + t.d }
  }
}

function push(h: [number, number][], x: [number, number]) {
  h.push(x)
  let i = h.length - 1
  while (i > 0) {
    const p = (i - 1) >> 1
    if (h[p][0] <= h[i][0]) break
    ;[h[p], h[i]] = [h[i], h[p]]
    i = p
  }
}

function pop(h: [number, number][]): [number, number] {
  const top = h[0]
  const last = h.pop()!
  if (h.length) {
    h[0] = last
    let i = 0
    for (;;) {
      const l = 2 * i + 1
      const r = l + 1
      let m = i
      if (l < h.length && h[l][0] < h[m][0]) m = l
      if (r < h.length && h[r][0] < h[m][0]) m = r
      if (m === i) break
      ;[h[m], h[i]] = [h[i], h[m]]
      i = m
    }
  }
  return top
}

/**
 * Orders a set of stops into a short walking tour (nearest-neighbour,
 * then 2-opt). Good enough for the 3–12 stops a family picks.
 */
export function orderStops(start: LatLon, stops: { id: string; p: LatLon }[]): string[] {
  const left = [...stops]
  const out: { id: string; p: LatLon }[] = []
  let cur = start
  while (left.length) {
    let bi = 0
    left.forEach((s, i) => { if (dist(cur, s.p) < dist(cur, left[bi].p)) bi = i })
    cur = left[bi].p
    out.push(left.splice(bi, 1)[0])
  }
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < out.length - 1; i++)
      for (let k = i + 1; k < out.length; k++) {
        const a = i === 0 ? start : out[i - 1].p
        const b = out[i].p
        const c = out[k].p
        const e = k + 1 < out.length ? out[k + 1].p : null
        const before = dist(a, b) + (e ? dist(c, e) : 0)
        const after = dist(a, c) + (e ? dist(b, e) : 0)
        if (after + 0.5 < before) {
          out.splice(i, k - i + 1, ...out.slice(i, k + 1).reverse())
          improved = true
        }
      }
  }
  return out.map((s) => s.id)
}
