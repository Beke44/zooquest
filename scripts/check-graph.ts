// Sanity check: every POI must be reachable from the main gate.
import { BUDAPEST } from '../src/data/budapest'
import { WalkGraph } from '../src/lib/router'
const g = new WalkGraph(BUDAPEST.paths)
const gate = BUDAPEST.pois.find((p) => p.id === 'main-gate')!
let worst = 0
for (const p of BUDAPEST.pois) {
  const r = g.route([gate.lat, gate.lon], [p.lat, p.lon])!
  const snap = g.nearest([p.lat, p.lon]).d
  const straight = r.line.length === 2
  if (straight || snap > 40) console.log('WEAK', p.id, p.name.hu, 'snap', snap.toFixed(0), 'm', straight ? 'NO-ROUTE' : '')
  worst = Math.max(worst, snap)
}
console.log('nodes', g.nodes.length, 'pois', BUDAPEST.pois.length, 'worst snap', worst.toFixed(0), 'm')
