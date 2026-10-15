// From the summit into the vase. Once Sisyphus lets go, the boulder is
// thrown up and over, falls through the dusk between the hill and the hall,
// bursts into many small chrome boulders, and those fall into the mouth of
// the amphora as the hall rises to meet them.
//
// Everything here is a pure function of scroll position, so scrolling back
// up plays it in reverse, exactly. Screen pixels, y down.

import { CLIMB } from './hill.js'
import { hall as gallery } from './vase/hall.js'

export const SHARDS = 28
const SPLIT = 0.46 // timeline point where the boulder bursts

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Deterministic per-shard character: where it bursts to, when it lands.
function rand(i, k) {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const SEEDS = Array.from({ length: SHARDS }, (_, i) => {
  const a = (i / SHARDS) * Math.PI * 2 + rand(i, 1) * 0.6
  return {
    dir: [Math.cos(a), Math.sin(a) * 0.75 - 0.25],
    burst: 0.16 + rand(i, 2) * 0.26,
    size: 0.15 + Math.pow(rand(i, 3), 1.6) * 0.2,
    delay: rand(i, 4) * 0.55,
    off: [Math.cos(a) * rand(i, 5), Math.sin(a) * rand(i, 6)],
    land: (rand(i, 7) - 0.5) * 0.5,
  }
})

export const descent = {
  active: false, // the throw has taken over from the climb
  t: 0, // 0 at release .. 1 when the hall's stage locks in place
  start: null, // where the boulder was (screen) when it was let go
  big: { x: 0, y: 0, r: 0, visible: false, spin: 0 },
  flash: { x: 0, y: 0, k: 0 },
  mouth: { x: 0, y: 0 },
  shards: SEEDS.map(() => ({ x: 0, y: 0, r: 0, visible: false })),
}

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

// released: is the boulder past the summit; at: its screen position and
// radius right now (used to start the throw from where it really is).
export function stepDescent({ released, at, vw, vh }) {
  const d = descent
  const sy = window.scrollY
  const hall = document.getElementById('record')
  const hallTop = hall ? hall.getBoundingClientRect().top : vh * 2
  const S0 = CLIMB + 40
  const S1 = sy + hallTop // where the hall's stage locks to the top
  const t = clamp((sy - S0) / Math.max(1, S1 - S0), 0, 1)
  d.t = t

  if (!released || sy < S0) {
    d.active = false
    d.start = null
    d.big.visible = false
    d.flash.k = 0
    for (const s of d.shards) s.visible = false
    return d
  }
  if (!d.start) d.start = { x: at.x, y: at.y, r: at.r }
  d.active = true

  // The mouth of the vase, as the hall's stage slides up into view.
  d.mouth.x = gallery.active && gallery.mouth ? gallery.mouth.x : vw / 2
  d.mouth.y = gallery.active && gallery.mouth ? gallery.mouth.y : hallTop + vh / 2

  // The throw: a toss up and over, then a long fall held near the middle of
  // the screen while the hill scrolls away above it.
  const s = d.start
  const toss = smooth(0, 0.12, t)
  const fall = smooth(0.1, SPLIT, t)
  // Forward and a little up, over the far side of the summit and clear of
  // the title above, then back to the middle as it falls.
  const peak = Math.min(s.y, vh * 0.66) - vh * 0.08
  const y1 = mix(s.y, peak, toss)
  const ahead = s.x + vw * 0.17
  d.big.x = mix(mix(s.x, ahead, toss), vw / 2, smooth(0.16, 0.4, t))
  d.big.y = mix(y1, vh * 0.5, fall)
  d.big.r = s.r * (1 + 0.12 * Math.sin(Math.PI * clamp(t / SPLIT, 0, 1)))
  d.big.spin = t * 9
  d.big.visible = t < SPLIT

  // The burst: a ring of light, and the shards.
  const after = clamp((t - SPLIT) / (1 - SPLIT), 0, 1)
  d.flash.x = d.big.x
  d.flash.y = d.big.y
  d.flash.k = t >= SPLIT ? Math.max(0, 1 - after / 0.16) : 0

  const R = s.r
  const unit = Math.min(vw, vh)
  d.shards.forEach((sh, i) => {
    const q = SEEDS[i]
    const start = [d.big.x + q.off[0] * R * 0.55, d.big.y + q.off[1] * R * 0.55]
    const c1 = [start[0] + q.dir[0] * q.burst * unit, start[1] + q.dir[1] * q.burst * unit - unit * 0.08]
    const end = [d.mouth.x + q.land * vh * 0.08, d.mouth.y]
    const c2 = [end[0] + q.dir[0] * unit * 0.12, end[1] - vh * 0.42]
    const k = clamp((after - q.delay * 0.4) / (0.6 + q.delay * 0.3), 0, 1)
    const e = k * k * (3 - 2 * k)
    const [x, y] = bezier(start, c1, c2, end, e)
    sh.x = x
    sh.y = y
    // Pop out of the burst, then shrink as it drops into the mouth.
    sh.r = R * q.size * smooth(0, 0.08, after) * (1 - smooth(0.86, 1, k))
    sh.visible = t >= SPLIT && k < 1 && sh.r > 0.5
  })
  return d
}
