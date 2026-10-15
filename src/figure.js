// Sisyphus, as a marble statue cut into separate pieces (public/statue) and
// rigged as a 2D puppet in the hill's SVG (world units, y down). Each piece
// keeps the pivots it had in its source render: `a` is the joint nearer the
// body, `b` the next joint down the chain. A piece is placed by pinning `a` to
// its joint and turning it so a→b lies along the bone.
//
// Legs follow a walk cycle driven by distance travelled, so feet stay planted;
// arms reach for the boulder with two-bone IK. Without the boulder he
// straightens up and lets his arms hang.
//
// The same pose is painted into a small canvas each frame, which the chrome
// shader samples so the statue shows up in the boulder.

import { ground, slope } from './hill.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const S = 0.23 // world units per source px for the limb renders
const TORSO_K = S * 0.68 // the torso render is shot larger
const HEAD_K = S * 0.25

// crop: where the piece file sits in its source render [x, y, w, h].
const PIECES = {
  head: { crop: [304, 180, 676, 697], k: HEAD_K, a: [370, 700], b: [690, 450] },
  torso: { crop: [271, 50, 431, 522], k: TORSO_K, a: [380, 600], b: [560, 95] },
  drape: { crop: [125, 490, 373, 313], k: TORSO_K, a: [380, 600], b: [560, 95] },
  upperA: { crop: [331, 354, 295, 240], k: S, a: [585, 430], b: [345, 560] },
  upperB: { crop: [609, 449, 226, 182], k: S, a: [640, 505], b: [812, 605] },
  restB: { crop: [831, 358, 372, 298], k: S, a: [852, 590], b: [1140, 475] },
  thighA: { crop: [421, 354, 279, 303], k: S, a: [640, 400], b: [452, 622] },
  shinA: { crop: [166, 600, 286, 240], k: S, a: [410, 640], b: [190, 815] },
  footA: { crop: [68, 811, 192, 185], k: S, a: [205, 976], b: [172, 835] }, // a: ball of foot, b: ankle
  thighB: { crop: [764, 337, 336, 229], k: S, a: [790, 420], b: [1052, 560] },
  kneeB: { crop: [1015, 529, 114, 102], k: S, a: [1072, 582] },
  shinB: { crop: [864, 589, 235, 271], k: S, a: [1040, 625], b: [905, 845] },
  footB: { crop: [808, 848, 267, 132], k: S, a: [935, 968], b: [895, 865] },
}
// Shoulder sockets on the torso render.
const SHOULDER_NEAR = [432, 200]
const SHOULDER_FAR = [668, 255]

for (const p of Object.values(PIECES)) {
  p.len = p.b ? Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) * p.k : 0
  p.phi = p.b ? Math.atan2(p.b[1] - p.a[1], p.b[0] - p.a[0]) : 0
}

// Draw order, back to front. `far` pieces are on the side away from the viewer.
const ORDER = [
  ['farUpper', 'upperB', true],
  ['farFore', 'restB', true],
  ['farThigh', 'thighA', true],
  ['farShin', 'shinA', true],
  ['farFoot', 'footA', true],
  ['nearThigh', 'thighB'],
  ['nearShin', 'shinB'],
  ['nearKnee', 'kneeB'],
  ['nearFoot', 'footB'],
  ['torso', 'torso'],
  ['drape', 'drape'],
  ['head', 'head'],
  ['nearUpper', 'upperA'],
  ['nearFore', 'restB'],
]

const STRIDE = 118 // foot travel per step
const STANCE = 0.6 // share of the cycle a foot spends on the ground
const CYCLE = STRIDE / STANCE // distance covered per full gait cycle
const FEET = -20 // centre of the stride, behind the hip: a long lunge
const HIP_PUSH = 112
const HIP_STAND = 146
const REACH = 150 // hip to boulder surface while pushing

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t

// Two-bone IK from `root` toward `target`. `bend` picks the joint side (+1/-1).
function ik(root, target, a, b, bend) {
  const dx = target.x - root.x
  const dy = target.y - root.y
  const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b - 0.01)
  const ang = Math.atan2(dy, dx)
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1))
  const joint = { x: root.x + a * Math.cos(ang + bend * A), y: root.y + a * Math.sin(ang + bend * A) }
  return {
    joint,
    a1: Math.atan2(joint.y - root.y, joint.x - root.x),
    a2: Math.atan2(root.y + d * Math.sin(ang) - joint.y, root.x + d * Math.cos(ang) - joint.x),
  }
}

// Affine transform [a, b, c, d, e, f] that pins piece point `pt` to world
// point `at`, rotated by `theta`.
function place(p, at, theta, pt = p.a) {
  const c = Math.cos(theta) * p.k
  const s = Math.sin(theta) * p.k
  const lx = pt[0] - p.crop[0]
  const ly = pt[1] - p.crop[1]
  return [c, s, -s, c, at.x - (c * lx - s * ly), at.y - (s * lx + c * ly)]
}

const apply = (m, pt, p) => {
  const lx = pt[0] - p.crop[0]
  const ly = pt[1] - p.crop[1]
  return { x: m[0] * lx + m[2] * ly + m[4], y: m[1] * lx + m[3] * ly + m[5] }
}

// A bone from `at` pointing along `angle` (radians, y down).
const bone = (p, at, angle) => place(p, at, angle - p.phi)

export function createFigure(svg) {
  const root = svg.querySelector('.figure')
  const shadow = svg.querySelector('.fig-shadow')
  const imgs = {}
  const loaded = {}
  const els = {}
  for (const [slot, name, far] of ORDER) {
    const p = PIECES[name]
    const el = document.createElementNS(SVG_NS, 'image')
    el.setAttribute('href', `/statue/${name}.webp`)
    el.setAttribute('width', p.crop[2])
    el.setAttribute('height', p.crop[3])
    el.setAttribute('class', far ? 'piece far' : 'piece')
    el.setAttribute('transform', 'scale(0)') // hidden until the first pose
    root.appendChild(el)
    els[slot] = el
    if (!imgs[name]) {
      const im = new Image()
      im.src = `/statue/${name}.webp`
      im.onload = () => (loaded[name] = true)
      imgs[name] = im
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 448
  return {
    root,
    shadow,
    els,
    imgs,
    loaded,
    mats: {},
    last: {},
    canvas,
    ctx: canvas.getContext('2d'),
    rect: { x: 0, y: 0, w: 420, h: 368 }, // world area the canvas covers
    version: 0,
    phase: 0.06, // at rest: near foot forward, far leg stretched back
    lastHip: null,
    relax: 0, // 0 pushing, 1 standing at rest
    t: 0,
  }
}

// Ball of the foot on the ridge for a gait phase, and how far it's lifted.
function footAt(hipX, phase, shift, lift) {
  const p = (((phase + shift) % 1) + 1) % 1
  let off
  let up = 0
  let swing = 0
  if (p < STANCE) {
    off = mix(STRIDE / 2, -STRIDE / 2, p / STANCE)
  } else {
    const u = (p - STANCE) / (1 - STANCE)
    const e = u * u * (3 - 2 * u)
    off = mix(-STRIDE / 2, STRIDE / 2, e)
    swing = Math.sin(Math.PI * u)
    up = swing * lift
  }
  const x = hipX + FEET + off
  return { x, y: ground(x) - up, swing, back: off < 0 ? -off / (STRIDE / 2) : 0 }
}

// Foot transform with the ball of the foot on `g`, sole along the slope;
// returns the ankle it puts the leg's IK target at.
function plantFoot(p, g, tilt) {
  const m = place(p, g, Math.atan(slope(g.x)) + tilt)
  return { m, ankle: apply(m, p.b, p) }
}

// ball: boulder centre (or null when it has rolled away); r: its radius;
// standX: where to stand when there's no boulder; strain: 0..1 (slipping).
export function drawFigure(f, { ball, r, standX, strain, opacity, dt }) {
  if (!f.root) return
  f.t += dt
  f.relax += ((ball ? 0 : 1) - f.relax) * Math.min(1, dt * 3)
  // The moment he lets go, his arms follow the boulder up and over.
  if (!ball && f.hadBall) f.throwAt = f.t
  f.hadBall = !!ball
  const follow = f.throwAt != null ? 1 - Math.min(1, Math.max(0, (f.t - f.throwAt - 0.35) / 1.1)) : 0
  const relax = f.relax
  const P = PIECES
  const M = f.mats

  const pushX = ball ? ball.x - r - REACH : standX
  const hipX = mix(pushX, standX, relax)
  if (f.lastHip != null) f.phase += (hipX - f.lastHip) / CYCLE
  f.lastHip = hipX

  // Lean into the slope, harder while the boulder slips.
  const slopeAng = Math.atan(-slope(hipX)) // > 0 while climbing
  const breathe = Math.sin(f.t * 2.2)
  const lean = mix(1.02 + slopeAng * 0.5 + strain * 0.1 + breathe * 0.01, 0.06, relax)
  const bob = Math.abs(Math.sin(f.phase * Math.PI * 2)) * 2.5 * (1 - relax)
  const hip = { x: hipX, y: ground(hipX) - mix(HIP_PUSH, HIP_STAND, relax) - bob + breathe * 0.4 }

  // Torso, drape and head ride one transform; the head nods toward the boulder.
  const torsoAng = lean - Math.PI / 2
  M.torso = bone(P.torso, hip, torsoAng)
  M.drape = M.torso
  const neck = apply(M.torso, P.torso.b, P.torso)
  const shNear = apply(M.torso, SHOULDER_NEAR, P.torso)
  const shFar = apply(M.torso, SHOULDER_FAR, P.torso)
  M.head = bone(P.head, neck, torsoAng + mix(-0.06, 0.12, relax) + strain * 0.08)

  // Legs: planted feet while pushing; feet together when standing.
  const lift = 18 * (1 - relax)
  const phase = mix(f.phase, Math.round(f.phase), relax)
  const legs = [
    ['near', 0, P.thighB, P.shinB, P.footB],
    ['far', 0.5, P.thighA, P.shinA, P.footA],
  ]
  for (const [side, shift, thigh, shin, foot] of legs) {
    const g = footAt(hipX, phase, shift, lift)
    if (relax > 0) {
      g.x = mix(g.x, hipX + (side === 'near' ? 12 : -6), relax)
      g.y = mix(g.y, ground(g.x), relax)
    }
    // The heel peels up as the foot trails behind and during the swing.
    // (Positive tilt lifts the heel; the far foot's render is already on its toes.)
    const tilt = side === 'near' ? 0.45 * g.back + 0.3 * g.swing : -0.32 + 0.3 * g.back + 0.25 * g.swing
    const { m, ankle } = plantFoot(foot, g, tilt * (1 - relax) + (side === 'far' ? -0.32 * relax : 0))
    const h = { x: hip.x + (side === 'near' ? 3 : -3), y: hip.y }
    const leg = ik(h, ankle, thigh.len, shin.len, -1)
    M[`${side}Thigh`] = bone(thigh, h, leg.a1)
    M[`${side}Shin`] = bone(shin, leg.joint, leg.a2)
    M[`${side}Foot`] = m
    if (side === 'near') {
      const knee = (leg.a1 - P.thighB.phi + leg.a2 - P.shinB.phi) / 2
      M.nearKnee = place(P.kneeB, leg.joint, knee)
    }
  }

  // Arms: palms on the boulder, or hanging.
  for (const [side, sh, upper, off] of [
    ['near', shNear, P.upperA, 10],
    ['far', shFar, P.upperB, -12],
  ]) {
    const fore = P.restB
    let hand = { x: sh.x + 6, y: sh.y + (upper.len + fore.len) * 0.9 }
    if (!ball && follow > 0) {
      const reach = (upper.len + fore.len) * 0.96
      const up = { x: sh.x + reach * 0.74, y: sh.y - reach * 0.67 }
      const k = follow * follow * (3 - 2 * follow)
      hand = { x: mix(hand.x, up.x, k), y: mix(hand.y, up.y, k) }
    }
    if (ball) {
      const dx = sh.x - ball.x
      const dy = sh.y - ball.y
      const d = Math.hypot(dx, dy)
      const a = Math.atan2(dy, dx) + off / r
      const on = { x: ball.x + Math.cos(a) * (r + 4), y: ball.y + Math.sin(a) * (r + 4) }
      hand = { x: mix(on.x, hand.x, relax), y: mix(on.y, hand.y, relax) }
    }
    const arm = ik(sh, hand, upper.len, fore.len, 1)
    M[`${side}Upper`] = bone(upper, sh, arm.a1)
    M[`${side}Fore`] = bone(fore, arm.joint, arm.a2)
  }

  // Write the transforms.
  for (const [slot] of ORDER) {
    const m = M[slot]
    const t = `matrix(${m.map((v) => v.toFixed(4)).join(' ')})`
    if (f.last[slot] !== t) {
      f.last[slot] = t
      f.els[slot].setAttribute('transform', t)
    }
  }
  f.shadow.setAttribute('cx', (hipX + 10).toFixed(1))
  f.shadow.setAttribute('cy', ground(hipX).toFixed(1))
  f.root.style.opacity = opacity.toFixed(3)

  // Reflection copy: the statue around the hip, for the chrome shader.
  const R = f.rect
  R.x = hipX - 160
  R.y = ground(hipX) - 300
  const g = f.ctx
  const sc = f.canvas.width / R.w
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, f.canvas.width, f.canvas.height)
  g.globalAlpha = opacity
  for (const [slot, name, far] of ORDER) {
    if (!f.loaded[name]) continue
    const m = M[slot]
    const p = PIECES[name]
    g.setTransform(sc, 0, 0, sc, -R.x * sc, -R.y * sc)
    g.transform(...m)
    g.filter = far ? 'brightness(0.86)' : 'none'
    g.drawImage(f.imgs[name], 0, 0, p.crop[2], p.crop[3])
  }
  g.filter = 'none'
  f.version++
}
