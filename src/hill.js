// Hill geometry, in world units (x right, y down). The world is drawn for a
// viewport H0 tall and scaled to fit the real one. The ridge is flat at the
// foot (where the hero sits), climbs with gentle undulations to a rounded
// summit, then falls away steeply on the far side.

export const H0 = 860
export const R = 150 // boulder radius: the stone stands as tall as the man pushing it
export const X_START = 1100 // foot of the climb
export const CLIMB = 3600 // horizontal length of the climb
export const X_SUMMIT = X_START + CLIMB
export const W = X_SUMMIT + 2400
export const BASE = 1800 // ridge height at the foot
export const H = BASE + 760 // the mountain body runs below the ridge

const CAP = 340 // the last stretch eases flat into the summit
const U0 = CLIMB - CAP

function rise(u) {
  return 0.2 * u + 38 * Math.sin(u / 380) + 16 * Math.sin(u / 150 + 1) - 16 * Math.sin(1)
}

function riseSlope(u) {
  return 0.2 + (38 / 380) * Math.cos(u / 380) + (16 / 150) * Math.cos(u / 150 + 1)
}

const RISE_U0 = rise(U0)
const SLOPE_U0 = riseSlope(U0)
const SUMMIT_Y = BASE - (RISE_U0 + (SLOPE_U0 * CAP) / 2)

export function ground(x) {
  if (x <= X_START) return BASE + (X_START - x) * 0.03
  if (x >= X_SUMMIT) {
    const d = x - X_SUMMIT
    return Math.min(H - 40, SUMMIT_Y + (d * d) / 700)
  }
  const u = x - X_START
  if (u <= U0) return BASE - rise(u)
  const t = u - U0
  return BASE - (RISE_U0 + SLOPE_U0 * t - (SLOPE_U0 * t * t) / (2 * CAP))
}

// dy/dx of the ridge (negative while climbing, since y grows downward).
export function slope(x) {
  return (ground(x + 1) - ground(x - 1)) / 2
}

// Centre of a ball of radius r resting on the ridge at contact x.
export function restingCentre(x, r) {
  const s = slope(x)
  const n = Math.hypot(s, 1)
  return { x: x + (s / n) * r, y: ground(x) - r / n }
}

// Highest (smallest y) and lowest ridge points over [a, b].
export function ridgeRange(a, b) {
  let lo = Infinity
  let hi = -Infinity
  for (let x = a; x <= b; x += 8) {
    const y = ground(x)
    lo = Math.min(lo, y)
    hi = Math.max(hi, y)
  }
  return { top: lo, bottom: hi }
}

export function ridgePoints(step = 8) {
  const pts = []
  for (let x = 0; x <= W; x += step) pts.push(x, ground(x))
  return pts
}
