// The climb's state, stepped once per frame by the hero scene. Hill units
// (from hill.js, y down) for the physics; F converts them to scene units.
//
// Scrolling pushes: one pixel of scroll is one hill unit of climb. Stop and
// the boulder slips back a little. Past the summit it rolls away down the far
// side; scroll back and it's yours again.

import { createFigure, drawFigure } from '../figure.js'
import { BASE, CLIMB, R, X_START, X_SUMMIT, ground, restingCentre, slope } from '../hill.js'

export const F = 3.4 / 290 // the statue stands ~290 hill units, 3.4 scene units
export const R3 = R * F
export const toX = (x) => (x - X_START) * F
export const toY = (y) => (BASE - y) * F
export const pathY = (x3) => toY(ground(X_START + x3 / F))

const GRAVITY = 2600
const SLIP_MAX = 60
const SLIP_AFTER = 0.9

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Story beats along the climb (u = hill units from the foot). Each one is a
// stele below the path; the bird's ribbon carries the line above.
export const BEATS = [
  { u: 0, ribbon: 'ERGON · THE RECORD OF EVERYDAY WORK' },
  { u: 380, ribbon: 'THE WAITING LINE · EVERY CITY HAS ONE', title: 'The waiting line', lines: ['Before sunrise, at every labour naka,', 'the corner fills with skilled hands.'] },
  { u: 1080, ribbon: 'THE HILL OF THE HIRED', title: 'Kolonos Agoraios · Athens', lines: ['Day labourers waited on this hill to be hired.', 'Twenty-five centuries on, the line looks the same.'] },
  { u: 1780, ribbon: 'WORK THAT LEAVES NO TRACE', title: 'Fourteen years. No paper.', lines: ['Skill that was never written down', 'cannot be shown to the next contractor.'] },
  { u: 2480, ribbon: 'FAIR TERMS ARE A RUMOUR', title: 'Terms by word of mouth', lines: ['Rate, hours and payday, agreed on a roadside.', 'When pay comes short, there is nothing to point to.'] },
  { u: CLIMB - 260, ribbon: 'WHAT IF THE WORK STAYED?', title: 'And it rolls back down', lines: ['Every evening the day is lost,', 'unless someone keeps the record.'] },
]

export const climb = {
  u: 0, // scroll, in hill units
  xt: X_START,
  slip: 0,
  idle: 0,
  intro: 0,
  ball: { bx: X_START, x: X_START, y: BASE - R, maxX: X_START, speed: 0, released: false, v: 0, respawn: 1, spin: 0 },
  hop: { z: 0, v: 0 },
  hover: false,
  beat: 0,
  figure: null,
}

export function stepClimb(dt, u) {
  const e = climb
  const b = e.ball
  if (!e.figure) e.figure = createFigure()
  const prevXt = e.xt
  e.u = u
  e.xt = X_START + u
  if (e.intro < 1) e.intro = Math.min(1, e.intro + dt / 1.6)

  const moving = Math.abs(e.xt - prevXt) > 0.5
  e.idle = moving ? 0 : e.idle + dt
  if (!b.released && e.intro >= 1 && u > 40 && e.idle > SLIP_AFTER) e.slip = Math.min(SLIP_MAX, e.slip + 30 * dt)
  else e.slip *= Math.exp(-dt * 7)

  if (!b.released && e.xt >= X_SUMMIT + 40 && b.bx >= X_SUMMIT - 30) {
    b.released = true
    b.v = 120
  } else if (b.released && e.xt < X_SUMMIT - 140) {
    b.released = false
    b.respawn = 0
    b.bx = e.xt
  }
  b.respawn = Math.min(1, b.respawn + dt * 2.5)

  const px = b.x
  const py = b.y
  if (b.released) {
    const s = slope(b.bx)
    b.v += GRAVITY * 0.45 * (s / Math.hypot(1, s)) * dt
    b.bx = Math.min(b.bx + (b.v * dt) / Math.hypot(1, s), X_SUMMIT + 2300)
  } else {
    const target = e.xt - e.slip
    b.bx = e.intro < 1 ? target : b.bx + (target - b.bx) * (1 - Math.exp(-dt * 10))
  }
  const c = restingCentre(b.bx, R)
  b.x = c.x
  b.y = c.y
  b.maxX = Math.max(b.maxX, b.bx)
  // Rolling: distance travelled over the radius (clockwise going uphill).
  b.spin -= (Math.hypot(b.x - px, b.y - py) * Math.sign(b.x - px)) / R
  b.speed += (Math.abs(b.x - px) / Math.max(dt, 1e-3) - b.speed) * 0.2

  // Hop when clicked.
  const h = e.hop
  if (h.z > 0 || h.v > 0) {
    h.z += h.v * dt
    h.v -= GRAVITY * 1.2 * dt
    if (h.z <= 0) {
      h.z = 0
      h.v = -h.v > 260 ? -h.v * 0.3 : 0
    }
  }

  let beat = 0
  for (let i = 0; i < BEATS.length; i++) if (b.maxX - X_START >= BEATS[i].u - 160 && i > 0) beat = i
  if (u < 120) beat = 0
  e.beat = beat

  drawFigure(e.figure, {
    ball: b.released ? null : { x: b.x, y: b.y },
    r: R,
    standX: X_SUMMIT - R - 40,
    strain: e.slip / SLIP_MAX,
    dt,
  })
  return e
}

export const progress = () => clamp(climb.u / CLIMB, 0, 1)
