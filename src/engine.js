// Scroll engine shared by the DOM world and the WebGL boulder.
//
// The site is a mountainside seen from the side. Scrolling down pushes the
// boulder up the ridge: one pixel of scroll is one world unit of climb. The
// camera follows the climb; content blocks sit along the hill and are inked in
// as the boulder rolls past them. Stop scrolling and the boulder slips back a
// little. At the summit it tips over and rolls down the far side.

import { renderWorldProxy } from './pageProxy.js'
import { createFigure, drawFigure } from './figure.js'
import { BASE, CLIMB, H, H0, R, W, X_START, X_SUMMIT, ground, restingCentre, ridgePoints, ridgeRange, slope } from './hill.js'

const FEATHER = 160 // soft, bleeding edge of the ink mask
const GRAVITY = 2600 // world units/s², for droplets and hops
const MAX_DROPS = 96
const MAX_SPLATS = 260
const SLIP_MAX = 48 // how far the boulder slides back when you stop pushing
const SLIP_AFTER = 0.9 // seconds of stillness before it starts to slip
const SLAB_TILT_X = 10
const SLAB_TILT_Y = 8
const HOVER_TILT = 7
const PUSH_GROW = 0.15 // the boulder swells by this much while it's being pushed
const HEADROOM = 84 // screen px kept clear above the boulder while climbing (nav bar)
const SVG_NS = 'http://www.w3.org/2000/svg'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const rand = (a, b) => a + Math.random() * (b - a)

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const MAX_DROPLETS = MAX_DROPS

export const engine = {
  ready: false,
  vw: 0,
  vh: 0,
  S: 1, // world → screen scale (eases from the hero close-up to Sb)
  Sb: 1, // while climbing
  hero: { S: 1, x: 0, y: 0 }, // opening close-up: scale and where the boulder sits
  heroFade: -1,
  r: R,
  persp: 1200,
  sy: 0,
  xt: X_START, // where the scroll says the boulder should be
  view: { x: X_START, y: BASE - R }, // camera target in world units
  anchor: { x: 0, y: 0 }, // where the camera target sits on screen
  over: -1, // how far the page has scrolled past the end of the climb
  ball: { bx: X_START, x: X_START, y: BASE - R, maxX: X_START, speed: 0, released: false, v: 0, respawn: 1 },
  slip: 0,
  idle: 0,
  blocks: [],
  slabs: [],
  trail: { paths: [], lens: null, x0: X_START, step: 8, total: 0, drawn: -1 },
  els: {},
  figure: null,
  intro: reduceMotion ? 1 : 0,
  scrolled: false,
  pointer: { x: 0, y: 0, active: false },
  hover: false,
  press: false,
  hop: { z: 0, v: 0, squash: 0, sv: 0 },
  drops: Array.from({ length: MAX_DROPS }, () => ({ alive: false })),
  proxy: { canvas: null, version: 0 },
  cam: null, // { video, aspect } while the viewer has opted into their reflection
}

/* ---------- Layout ---------- */

function pathFrom(pts) {
  let d = ''
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i].toFixed(1)} ${pts[i + 1].toFixed(1)}`
  return d
}

// Distant ranges, in their own parallax units (x' = world x · f).
function rangePath(f, amp, seed) {
  const pts = []
  const y0 = BASE * f - 150 - 0.2 * f * X_START
  for (let x = -1600; x <= W * f + 2600; x += 16) {
    const y = y0 - 0.2 * (x - X_START * f) + amp * Math.sin(x / 260 + seed) + amp * 0.55 * Math.sin(x / 97 + seed * 2)
    pts.push(x, y)
  }
  return `${pathFrom(pts)}L${W * f + 2600} ${H}L-1600 ${H}Z`
}

function buildHill() {
  const e = engine
  const E = e.els
  const ridge = ridgePoints(8)
  E.hill.setAttribute('viewBox', `0 0 ${W} ${H}`)
  E.hill.setAttribute('width', W)
  E.hill.setAttribute('height', H)
  E.mountain.setAttribute('d', `${pathFrom(ridge)}L${W} ${H}L0 ${H}Z`)
  E.ridge.setAttribute('d', pathFrom(ridge))
  // A painted band under the ridge, as on the shoulder of a vase.
  const band = ridge.slice()
  for (let i = 1; i < band.length; i += 2) band[i] += 34
  E.ridgeBand.setAttribute('d', pathFrom(band))

  // Ink trail: the ridge from the foot of the climb onward, drawn up to the
  // furthest point the boulder has reached.
  const t = e.trail
  const pts = []
  for (let x = X_START; x <= W; x += t.step) pts.push(x, ground(x))
  t.lens = new Float32Array(pts.length / 2)
  for (let i = 1; i < t.lens.length; i++) {
    t.lens[i] = t.lens[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1])
  }
  t.total = t.lens[t.lens.length - 1]
  const d = pathFrom(pts)
  t.paths = E.trail
  for (const p of t.paths) {
    p.setAttribute('d', d)
    p.style.strokeDasharray = `${t.total} ${t.total}`
  }
  t.drawn = -1

  E.rangeFar.setAttribute('d', rangePath(0.25, 70, 0.4))
  E.rangeMid.setAttribute('d', rangePath(0.5, 90, 2.1))
  return ridge
}

function lenAtX(x) {
  const t = engine.trail
  if (!t.lens) return 0
  const f = clamp((x - t.x0) / t.step, 0, t.lens.length - 1)
  const i = Math.floor(f)
  if (i >= t.lens.length - 1) return t.total
  return t.lens[i] + (t.lens[i + 1] - t.lens[i]) * (f - i)
}

export function measure() {
  const e = engine
  const main = document.getElementById('page')
  if (!main) return
  const root = document.documentElement
  const q = (s) => main.querySelector(s)

  e.vw = root.clientWidth
  e.vh = window.innerHeight
  e.Sb = clamp(Math.min((1.18 * e.vh) / H0, e.vw / 600), 0.72, 1.35)
  // The opening shot frames the statue and boulder like a product hero:
  // the pair fills the left of the screen, copy on the right. On narrow
  // screens the copy sits on top and the pair below it.
  const GROUP_W = 580 // back foot to the boulder's far edge, world units
  const GROUP_H = 330
  const GROUP_C = 140 // the group's centre, this far behind the boulder's
  const wide = e.vw >= 760
  const hs = wide
    ? Math.min((0.58 * e.vw) / GROUP_W, (0.8 * e.vh) / GROUP_H)
    : Math.min((0.96 * e.vw) / GROUP_W, (0.46 * e.vh) / GROUP_H)
  e.hero.S = Math.max(e.Sb, hs)
  e.hero.x = (wide ? 0.3 : 0.5) * e.vw + GROUP_C * e.hero.S
  e.hero.y = (wide ? 0.9 : 0.86) * e.vh - R * e.hero.S
  e.S = e.Sb
  e.persp = Math.max(900, e.vh * 1.6)
  main.style.height = `${CLIMB + 260 + e.vh}px`

  e.els = {
    world: q('.world'),
    hill: q('.hill'),
    mountain: q('.mountain'),
    ridge: q('.ridge'),
    ridgeBand: q('.ridge-band'),
    trail: [...main.querySelectorAll('.trail-ink')],
    splats: q('.splats'),
    far: q('.range-far'),
    mid: q('.range-mid'),
    rangeFar: q('.range-far path'),
    rangeMid: q('.range-mid path'),
  }
  e.els.world.style.width = `${W}px`
  e.els.world.style.height = `${H}px`
  if (!e.figure) e.figure = createFigure(e.els.hill)

  // Lay the world out flat for measuring.
  root.classList.add('measuring')
  const ridge = buildHill()

  const prev = e.blocks
  e.blocks = [...main.querySelectorAll('[data-place]')].map((el, i) => {
    const u = Number(el.dataset.u)
    const w = Number(el.dataset.w)
    const x = X_START + u
    el.style.left = `${x}px`
    el.style.width = `${w}px`
    const h = el.offsetHeight
    const span = ridgeRange(x, x + w)
    const place = el.dataset.place
    const top = place === 'ground' ? span.bottom + 56 : span.top - Number(el.dataset.gap || 200) - h
    el.style.top = `${top}px`
    // Ink seeps in from the corner nearest the boulder's path.
    const origin = el.dataset.origin || 'tl'
    const ox = origin === 'br' ? w : origin === 'bc' ? w / 2 : 0
    const oy = origin === 'tl' ? 0 : h
    el.style.setProperty('--ox', `${ox}px`)
    el.style.setProperty('--oy', `${oy}px`)
    return {
      el,
      x,
      w,
      h,
      hero: el.dataset.print === 'hero',
      maxR: Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) + FEATHER,
      p: prev[i]?.p ?? 0,
      lastR: -1,
    }
  })

  for (const a of main.querySelectorAll('.anchor')) a.style.top = `${Number(a.dataset.u)}px`

  const wr = e.els.world.getBoundingClientRect()
  e.slabs = [...main.querySelectorAll('.world [data-slab]')].map((el) => {
    const r = el.getBoundingClientRect()
    return {
      body: el.firstElementChild,
      x: r.left - wr.left + r.width / 2,
      y: r.top - wr.top + r.height / 2,
      w: r.width,
      h: r.height,
      k: clamp(r.height / 160, 0.45, 1), // small slabs tilt less
      ax: 0,
      ay: 0,
      z: 0,
      last: '',
    }
  })

  e.proxy.canvas = renderWorldProxy(e.els.world, W, H, ridge)
  e.proxy.version++

  root.classList.remove('measuring')
  e.ready = true
}

/* ---------- Projection ---------- */

const toScreenX = (wx) => engine.anchor.x + (wx - engine.view.x) * engine.S
const toScreenY = (wy) => engine.anchor.y + (wy - engine.view.y) * engine.S

// World point raised `lift` world units toward the viewer → viewport px and
// scale, with perspective about the viewport centre.
export function project(wx, wy, lift = 0) {
  const e = engine
  const k = e.persp / Math.max(1, e.persp - lift * e.S)
  return {
    x: e.vw / 2 + (toScreenX(wx) - e.vw / 2) * k,
    y: e.vh / 2 + (toScreenY(wy) - e.vh / 2) * k,
    s: e.S * k,
  }
}

/* ---------- Ink ---------- */

function applyInk() {
  const e = engine
  const t = e.trail
  const L = lenAtX(e.ball.maxX)
  if (Math.abs(L - t.drawn) > 0.5) {
    t.drawn = L
    for (const p of t.paths) p.style.strokeDashoffset = `${t.total - L}`
  }

  for (const b of e.blocks) {
    const p = reduceMotion
      ? 1
      : b.hero
        ? smooth(0.2, 1, e.intro)
        : clamp((e.ball.maxX - b.x + 60) / (b.w * 0.75 + 60), 0, 1)
    b.p = Math.max(b.p, p)
    const r = (1 - Math.pow(1 - b.p, 2.2)) * b.maxR
    if (Math.abs(r - b.lastR) < 0.5) continue
    b.lastR = r
    b.el.style.setProperty('--r', `${r.toFixed(1)}px`)
    b.el.classList.toggle('inked', b.p > 0.12)
    b.el.classList.toggle('printed', b.p >= 1)
  }
}

/* ---------- Slabs ---------- */

function applySlabs(dt) {
  const e = engine
  const p = e.pointer
  const k = 1 - Math.exp(-dt * 10)
  for (const s of e.slabs) {
    const cx = toScreenX(s.x)
    const cy = toScreenY(s.y)
    const hw = (s.w * e.S) / 2
    const hh = (s.h * e.S) / 2
    if (cx < -hw || cx > e.vw + hw || cy < -hh || cy > e.vh + hh) continue
    let ax = 0
    let ay = 0
    let z = 0
    if (!reduceMotion) {
      const ty = clamp((cy - e.vh / 2) / (e.vh / 2), -1, 1)
      const tx = clamp((cx - e.vw / 2) / (e.vw / 2), -1, 1)
      ax = -ty * SLAB_TILT_X * s.k
      ay = tx * SLAB_TILT_Y * s.k
      if (p.active && Math.abs(p.x - cx) < hw && Math.abs(p.y - cy) < hh) {
        ax += -((p.y - cy) / hh) * HOVER_TILT * s.k
        ay += ((p.x - cx) / hw) * HOVER_TILT * s.k
        z = 10 * s.k
      }
    }
    s.ax += (ax - s.ax) * k
    s.ay += (ay - s.ay) * k
    s.z += (z - s.z) * k
    const t = `translateZ(${s.z.toFixed(1)}px) rotateX(${s.ax.toFixed(2)}deg) rotateY(${s.ay.toFixed(2)}deg)`
    if (t !== s.last) {
      s.last = t
      s.body.style.transform = t
    }
  }
}

/* ---------- Ink droplets ---------- */

function addSplat(x, y, size) {
  const g = engine.els.splats
  if (!g) return
  const group = document.createElementNS(SVG_NS, 'g')
  const blob = (cx, cy, r, delay) => {
    const c = document.createElementNS(SVG_NS, 'circle')
    c.setAttribute('cx', cx.toFixed(1))
    c.setAttribute('cy', cy.toFixed(1))
    c.setAttribute('r', r.toFixed(2))
    c.setAttribute('class', 'splat')
    c.style.animationDelay = `${delay}ms`
    group.appendChild(c)
  }
  blob(x, y, size, 0)
  const n = 2 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const d = size * rand(1.3, 2.6)
    blob(x + Math.cos(a) * d, y + Math.sin(a) * d, size * rand(0.14, 0.38), 40 + i * 25)
  }
  g.appendChild(group)
  while (g.childNodes.length > MAX_SPLATS) g.firstChild.remove()
}

// Fling `n` droplets off the boulder. `dir`/`spread` are radians (y down).
export function spawnDrops(n, { speed = [250, 800], up = [250, 750], size = [2.5, 7], dir = 0, spread = Math.PI * 2 } = {}) {
  if (reduceMotion) return
  const e = engine
  for (let k = 0; k < n; k++) {
    const d = e.drops.find((d) => !d.alive)
    if (!d) return
    const a = dir + (Math.random() - 0.5) * spread
    const v = rand(...speed)
    d.alive = true
    d.x = e.ball.x + Math.cos(a) * e.r * 0.85
    d.y = e.ball.y + Math.sin(a) * e.r * 0.85
    d.z = e.r * rand(0.5, 1.2) + e.hop.z
    d.vx = Math.cos(a) * v
    d.vy = Math.sin(a) * v
    d.vz = rand(...up)
    d.s = rand(...size)
  }
}

function stepDrops(dt) {
  const damp = Math.exp(-dt * 1.6)
  for (const d of engine.drops) {
    if (!d.alive) continue
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.vx *= damp
    d.vy *= damp
    d.z += d.vz * dt
    d.vz -= GRAVITY * dt
    if (d.z <= 0) {
      d.alive = false
      addSplat(d.x, d.y, d.s * 1.3)
    }
  }
}

/* ---------- Pointer ---------- */

export function bindPointer() {
  const e = engine
  const p = e.pointer
  const move = (ev) => {
    p.x = ev.clientX
    p.y = ev.clientY
    p.active = true
  }
  const down = (ev) => {
    move(ev)
    if (e.hover) e.press = true
  }
  const up = () => {
    if (!e.press) return
    e.press = false
    e.hop.v = 950
    spawnDrops(18)
  }
  const leave = () => (p.active = false)
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerdown', down, { passive: true })
  window.addEventListener('pointerup', up, { passive: true })
  document.documentElement.addEventListener('pointerleave', leave)
  return () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerdown', down)
    window.removeEventListener('pointerup', up)
    document.documentElement.removeEventListener('pointerleave', leave)
  }
}

function stepHop(dt) {
  const h = engine.hop
  if (h.z > 0 || h.v > 0) {
    h.z += h.v * dt
    h.v -= GRAVITY * 1.2 * dt
    if (h.z <= 0) {
      const impact = -h.v
      h.z = 0
      h.sv += Math.min(2.4, impact / 500)
      if (impact > 260) spawnDrops(Math.round(impact / 140), { speed: [120, 380], up: [120, 360], size: [2, 4.5] })
      h.v = impact > 220 ? impact * 0.32 : 0
    }
  }
  // Damped spring: the steel gives just a hair on impact or press.
  const target = engine.press ? -0.045 : 0
  h.sv += (-(h.squash - target) * 260 - h.sv * 16) * dt
  h.squash += h.sv * dt
}

/* ---------- Frame ---------- */

// Advance one frame. Returns the engine, or null before layout.
export function step(dt) {
  const e = engine
  if (!e.ready) return null
  const b = e.ball
  const sy = (e.sy = window.scrollY)
  const prevXt = e.xt
  e.xt = X_START + sy
  const u = e.xt - X_START

  if (e.intro < 1) e.intro = Math.min(1, e.intro + dt / 1.7)

  // The hero close-up eases out to the climbing view over the first stretch
  // of scroll, and the summit view takes over near the top. The boulder is
  // biggest in between, while it's being pushed.
  const hz = smooth(0, 560, u)
  const sum = smooth(CLIMB - 700, CLIMB - 150, u)
  e.r = R * (1 + PUSH_GROW * hz * (1 - sum))

  // Stop pushing and the boulder starts to slip back.
  const moving = Math.abs(e.xt - prevXt) > 0.5
  e.idle = moving ? 0 : e.idle + dt
  if (!b.released && !reduceMotion && e.intro >= 1 && u > 40 && e.idle > SLIP_AFTER) {
    e.slip = Math.min(SLIP_MAX, e.slip + 26 * dt)
  } else {
    e.slip *= Math.exp(-dt * 7)
  }

  // Over the summit it goes; scroll back down the hill and it's yours again.
  if (!b.released && e.intro >= 1 && e.xt >= X_SUMMIT + 40 && b.bx >= X_SUMMIT - 30) {
    b.released = true
    b.v = 90
    spawnDrops(8, { dir: -Math.PI / 2, spread: 2, speed: [120, 380], up: [200, 420], size: [2, 5] })
  } else if (b.released && e.xt < X_SUMMIT - 140) {
    b.released = false
    b.respawn = 0
    b.bx = e.xt
  }
  b.respawn = Math.min(1, b.respawn + dt * 2.5)

  const prevX = b.x
  const prevY = b.y
  if (b.released) {
    const s = slope(b.bx)
    b.v += GRAVITY * 0.45 * (s / Math.hypot(1, s)) * dt
    b.bx += (b.v * dt) / Math.hypot(1, s)
  } else {
    const target = e.xt - e.slip
    b.bx = e.intro < 1 ? target : b.bx + (target - b.bx) * (1 - Math.exp(-dt * 10))
  }
  const c = restingCentre(b.bx, e.r)
  b.x = c.x
  b.y = c.y
  b.maxX = Math.max(b.maxX, b.bx)

  // Camera: follow the climb (not the slip), and hold at the summit.
  const camX = Math.min(e.xt, X_SUMMIT)
  const kc = 1 - Math.exp(-dt * 14)
  e.view.x += (camX - e.view.x) * (e.intro < 1 ? 1 : kc)
  const camY = ground(e.view.x) - e.r
  e.view.y += (camY - e.view.y) * (e.intro < 1 ? 1 : 1 - Math.exp(-dt * 5))

  // Zoom, then where the boulder sits on screen: the hero spot, then right
  // of centre while climbing (so printed content trails behind it), then
  // centred under the summit.
  e.S = mix(e.hero.S, e.Sb, hz)
  const climbY = Math.max(e.vh * 0.3, e.r * e.Sb + HEADROOM)
  e.anchor.x = mix(mix(e.hero.x, e.vw * 0.62, hz), e.vw * 0.5, sum)
  e.anchor.y = mix(mix(e.hero.y, climbY, hz), e.vh * 0.74, sum)
  const fade = Math.round((1 - smooth(0, 320, u)) * 100) / 100
  if (fade !== e.heroFade) {
    e.heroFade = fade
    document.documentElement.style.setProperty('--hero', fade)
  }

  const E = e.els
  // Past the end of the climb the sticky scene scrolls away; the boulder's
  // fixed canvas goes with it.
  const over = Math.round(Math.max(0, sy - (CLIMB + 260)))
  if (over !== e.over) {
    e.over = over
    const stage = document.querySelector('.stage')
    if (stage) stage.style.transform = over ? `translate3d(0, ${-over}px, 0)` : ''
    document.documentElement.classList.toggle('past-climb', over > 0)
  }
  E.world.style.transform = `translate3d(${(e.anchor.x - e.view.x * e.S).toFixed(1)}px, ${(e.anchor.y - e.view.y * e.S).toFixed(1)}px, 0) scale(${e.S})`
  for (const [el, f] of [
    [E.far, 0.25],
    [E.mid, 0.5],
  ]) {
    el.style.transform = `translate3d(${(e.anchor.x - e.view.x * f * e.S).toFixed(1)}px, ${(e.anchor.y - e.view.y * f * e.S).toFixed(1)}px, 0) scale(${e.S})`
  }

  // Fast pushing flings ink off the trailing edge.
  const dx = b.x - prevX
  const dy = b.y - prevY
  const speed = Math.hypot(dx, dy) / Math.max(dt, 1e-3)
  b.speed += (speed - b.speed) * 0.2
  if (!b.released && e.intro >= 1 && b.speed > 900 && Math.random() < dt * (b.speed / 260)) {
    spawnDrops(1, { dir: Math.atan2(-dy, -dx), spread: 1.6, speed: [120, 420], up: [100, 380], size: [1.8, 4.5] })
  }

  stepHop(dt)
  stepDrops(dt)
  applyInk()
  applySlabs(dt)

  drawFigure(e.figure, {
    ball: b.released ? null : { x: b.x, y: b.y },
    r: e.r,
    standX: X_SUMMIT - e.r - 40,
    strain: e.slip / SLIP_MAX,
    opacity: smooth(0.3, 1, e.intro),
    dt,
  })

  const p = e.pointer
  const bc = project(b.x, b.y, e.hop.z)
  const hover = !b.released && p.active && Math.hypot(p.x - bc.x, p.y - bc.y) < e.r * bc.s * 1.05
  if (hover !== e.hover) {
    e.hover = hover
    document.documentElement.classList.toggle('ball-hover', hover)
  }

  const scrolled = sy > 40
  if (scrolled !== e.scrolled) {
    e.scrolled = scrolled
    document.documentElement.classList.toggle('scrolled', scrolled)
  }

  return e
}
