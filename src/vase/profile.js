// The amphora's silhouette, as one closed profile (r, y) turned on a lathe:
// up the outside from the centre of the base, over the lip, and down the
// inside of the neck into the body. Units: the vase is about 3 tall, sitting
// on y = 0.
//
// Texture v runs along this profile, but not evenly: almost all of it goes to
// the painted outside, a sliver to the base and the dark interior.

import { CatmullRomCurve3, Vector2, Vector3 } from 'three'

const OUTER = [
  [0.0, 0.0], [0.5, 0.0], [0.585, 0.012], [0.61, 0.045], [0.6, 0.09], [0.585, 0.13],
  [0.6, 0.18], [0.66, 0.26], [0.76, 0.4], [0.88, 0.6], [0.99, 0.88], [1.075, 1.22],
  [1.115, 1.55], [1.1, 1.82], [1.035, 2.06], [0.92, 2.28], [0.78, 2.44], [0.67, 2.55],
  [0.625, 2.66], [0.635, 2.77], [0.69, 2.87], [0.78, 2.95], [0.865, 3.0], [0.89, 3.03],
]
const INNER = [
  [0.875, 3.065], [0.8, 3.075], [0.72, 3.055], [0.66, 3.0], [0.595, 2.86], [0.58, 2.7],
  [0.62, 2.52], [0.75, 2.36], [0.92, 2.12], [1.02, 1.8], [1.03, 1.4], [0.92, 0.9],
  [0.6, 0.45], [0.0, 0.38],
]

export const HEIGHT = 3.075
export const MOUTH_Y = 3.05
export const MOUTH_R = 0.6
export const SAMPLES = 420

const BASE_V = 0.012 // v at the outer edge of the base
const LIP_V = 0.972 // v at the top of the painted outside

function build() {
  const all = [...OUTER, ...INNER]
  const curve = new CatmullRomCurve3(all.map(([r, y]) => new Vector3(r, y, 0)), false, 'centripetal')
  // Dense polyline, remembering where the base edge and the lip fall on it.
  const dense = []
  const per = 40
  const segs = all.length - 1
  let baseAt = 0
  let lipAt = 0
  for (let i = 0; i <= segs * per; i++) {
    if (i === 2 * per) baseAt = dense.length
    if (i === (OUTER.length - 1) * per) lipAt = dense.length
    const p = curve.getPoint(i / (segs * per))
    dense.push(new Vector2(Math.max(0, p.x), p.y))
  }
  const len = [0]
  for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + dense[i].distanceTo(dense[i - 1]))
  const total = len[len.length - 1]
  const sBase = len[baseAt]
  const sLip = len[lipAt]

  // Resample at equal arc length.
  const points = []
  const s = []
  let k = 0
  for (let j = 0; j < SAMPLES; j++) {
    const target = (j / (SAMPLES - 1)) * total
    while (k < dense.length - 2 && len[k + 1] < target) k++
    const t = (target - len[k]) / Math.max(1e-9, len[k + 1] - len[k])
    points.push(new Vector2().lerpVectors(dense[k], dense[k + 1], Math.min(1, Math.max(0, t))))
    s.push(target)
  }
  points[0].x = 0
  points[SAMPLES - 1].x = 0

  const vOf = (x) => {
    if (x <= sBase) return (x / sBase) * BASE_V
    if (x <= sLip) return BASE_V + ((x - sBase) / (sLip - sBase)) * (LIP_V - BASE_V)
    return LIP_V + ((x - sLip) / (total - sLip)) * (1 - LIP_V)
  }
  const vs = s.map(vOf)

  // Outside only, for height lookups: (y, r, v), y increasing.
  const outer = []
  for (let j = 0; j < SAMPLES; j++) {
    if (s[j] < sBase || s[j] > sLip) continue
    const p = points[j]
    if (outer.length && p.y <= outer[outer.length - 1].y) continue
    outer.push({ y: p.y, r: p.x, v: vs[j] })
  }
  return { points, vs, outer, outsideArc: sLip - sBase }
}

export const PROFILE = build()

function lookup(y, key) {
  const o = PROFILE.outer
  if (y <= o[0].y) return o[0][key]
  for (let i = 1; i < o.length; i++) {
    if (o[i].y >= y) {
      const t = (y - o[i - 1].y) / (o[i].y - o[i - 1].y)
      return o[i - 1][key] + (o[i][key] - o[i - 1][key]) * t
    }
  }
  return o[o.length - 1][key]
}

export const vAtY = (y) => lookup(y, 'v')
export const rAtY = (y) => lookup(y, 'r')
