// The hillside as a height field in scene units: x along the climb, z toward
// the camera, y up. Along z = 0 it is exactly the climbing path from hill.js,
// so the boulder and the statue's feet sit on it; behind, the hill rises a
// little and falls away to the sea; in front it drops toward the viewer.

import { fbm2 } from '../gl/noise.js'
import { pathY } from './climb.js'

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function heightAt(x, z) {
  const p = pathY(x)
  const n = fbm2(x * 0.09 + 3.1, z * 0.11 - 1.7)
  if (z < 0) {
    const d = -z
    const back = d * 0.16 - (d / 24) ** 2 * 10
    return p + back * smooth(0.8, 4, d) + n * 1.4 * smooth(1.2, 6, d)
  }
  const front = -z * 0.3 - (z / 11) ** 2 * 1.5
  return p + front * smooth(0.9, 2.6, z) + n * 0.8 * smooth(1.4, 5, z)
}

// Where the input says the pointer is, and how far the page has pushed.
export const input = { u: 0, nx: 0, ny: 0 }
