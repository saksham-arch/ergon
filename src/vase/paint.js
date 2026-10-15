// Paints the amphora's surface into canvases, in the lathe's UV space: u runs
// around the vase, v up its profile (see profile.js). Black-figure technique:
// terracotta clay, glossy black slip on top, details scratched through.
//
//   map  - colour
//   surf - R: where the slip is (bump and clearcoat), G: roughness
//   mask - R: figure silhouettes, G: name inscriptions, B: meander band
//
// The figures are Codex-painted plates on flat orange; they're keyed by
// luminance, so incised lines inside them fall through to the clay below,
// exactly as an incision does.

import { FIGURES, SLOT, SLOT_WIDE } from './data.js'
import { PROFILE, rAtY, vAtY } from './profile.js'

export const TEX_W = 4096
export const TEX_H = 2048
const MASK_W = 2048
const MASK_H = 1024

const SLIP = '#17120f'
const CLAY = '#c65b2b'
const RED = '#7a2416'

// Band layout, by height on the vase.
export const BANDS = {
  clay: [0.2, 3.015],
  rays: [0.22, 0.6],
  meander: [0.72, 0.925],
  frieze: [0.985, 2.0],
  tongues: [2.075, 2.32],
  neck: [2.44, 2.84],
  lip: [2.92, 3.0],
}
const LINES = [
  [0.2, 0.225], [0.6, 0.655], [0.68, 0.69], [0.705, 0.712], [0.932, 0.94], [0.95, 0.972],
  [2.0, 2.045], [2.06, 2.066], [2.32, 2.405], [2.425, 2.43], [2.85, 2.856], [2.87, 2.915],
]

const py = (y) => (1 - vAtY(y)) * TEX_H
const VPX = ((0.972 - 0.012) * TEX_H) / PROFILE.outsideArc // texture px per unit of height
const hx = (y) => TEX_W / (2 * Math.PI * rAtY(y)) / VPX // horizontal stretch that keeps shapes square

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function load(src) {
  return new Promise((res, rej) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => res(im)
    im.onerror = rej
    im.src = src
  })
}

// Slip stays, clay goes: alpha from darkness.
function key(img) {
  const c = canvas(img.naturalWidth, img.naturalHeight)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height)
  const p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255
    const a = Math.min(1, Math.max(0, (0.34 - l) / 0.15))
    p[i + 3] = Math.round(a * a * (3 - 2 * a) * 255)
    // Pull the slip toward one consistent warm black.
    const k = a * 0.6
    p[i] = p[i] * (1 - k) + 23 * k
    p[i + 1] = p[i + 1] * (1 - k) + 18 * k
    p[i + 2] = p[i + 2] * (1 - k) + 15 * k
  }
  g.putImageData(d, 0, 0)
  return c
}

function tint(src, color) {
  const c = canvas(src.width, src.height)
  const g = c.getContext('2d')
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  return c
}

function noiseTile(size, alpha) {
  const c = canvas(size, size)
  const g = c.getContext('2d')
  const d = g.createImageData(size, size)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v
    d.data[i + 3] = alpha
  }
  g.putImageData(d, 0, 0)
  return c
}

// Seeded so the vase is the same vase on every visit.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function band(g, [a, b], color) {
  const top = py(b)
  g.fillStyle = color
  g.fillRect(0, top, TEX_W, py(a) - top)
}

// Rays rising from the foot.
function rays(g, n) {
  const [a, b] = BANDS.rays
  const base = py(a)
  const tip = py(b)
  const w = TEX_W / n
  g.fillStyle = SLIP
  for (let i = 0; i <= n; i++) {
    const x = i * w
    g.beginPath()
    g.moveTo(x - w * 0.42, base)
    g.quadraticCurveTo(x - w * 0.12, (base + tip) / 2, x, tip)
    g.quadraticCurveTo(x + w * 0.12, (base + tip) / 2, x + w * 0.42, base)
    g.closePath()
    g.fill()
  }
}

// Stopped Greek keys, every fourth one a saltire square: 5×5 grid per unit,
// plus a gap column.
const KEY = [[0, 4.5], [4.5, 4.5], [4.5, 0.5], [0.5, 0.5], [0.5, 2.5], [2.5, 2.5]]
function meander(g, m) {
  const [a, b] = BANDS.meander
  const top = py(b)
  const h = py(a) - top
  const gy = h / 5
  const unit = 6 * gy * hx((a + b) / 2)
  const groups = Math.round(TEX_W / (unit * 4))
  const gx = TEX_W / (groups * 4 * 6)
  const draw = (ctx, s, color) => {
    ctx.save()
    ctx.scale(s, s)
    ctx.globalCompositeOperation = color === SLIP ? 'source-over' : 'lighter'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineJoin = 'miter'
    ctx.lineCap = 'butt'
    for (let i = 0; i < groups * 4; i++) {
      ctx.save()
      ctx.translate(i * 6 * gx, top)
      ctx.scale(gx, gy)
      ctx.lineWidth = 1
      ctx.beginPath()
      if (i % 4 === 3) {
        ctx.rect(0.5, 0.5, 4, 4)
        ctx.moveTo(0.5, 0.5)
        ctx.lineTo(4.5, 4.5)
        ctx.moveTo(4.5, 0.5)
        ctx.lineTo(0.5, 4.5)
        ctx.stroke()
        for (const [x, y] of [[2.5, 1.3], [2.5, 3.7], [1.3, 2.5], [3.7, 2.5]]) {
          ctx.beginPath()
          ctx.arc(x, y, 0.32, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.moveTo(...KEY[0])
        for (const p of KEY.slice(1)) ctx.lineTo(...p)
        ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  }
  draw(g, 1, SLIP)
  draw(m, MASK_W / TEX_W, '#0000ff')
}

// Tongues hanging from the shoulder line, black and red in turn.
function tongues(g, n) {
  const [a, b] = BANDS.tongues
  const top = py(b)
  const bot = py(a)
  const w = TEX_W / n
  for (let i = 0; i < n; i++) {
    const x = i * w + w * 0.1
    const tw = w * 0.8
    g.fillStyle = i % 2 ? RED : SLIP
    g.beginPath()
    g.moveTo(x, top)
    g.lineTo(x + tw, top)
    g.lineTo(x + tw, bot - tw * 0.5)
    g.ellipse(x + tw / 2, bot - tw * 0.5, tw / 2, tw * 0.62, 0, 0, Math.PI)
    g.closePath()
    g.fill()
  }
}

function lipDots(g, n) {
  const [a, b] = BANDS.lip
  const cy = (py(a) + py(b)) / 2
  const r = (py(a) - py(b)) * 0.3
  g.fillStyle = SLIP
  for (let i = 0; i < n; i++) {
    g.beginPath()
    g.ellipse(((i + 0.5) * TEX_W) / n, cy, r * 0.8, r, 0, 0, Math.PI * 2)
    g.fill()
  }
}

function neck(g, palm) {
  const [a, b] = BANDS.neck
  const top = py(b)
  const h = py(a) - top
  const tw = h * (palm.width / palm.height) * hx((a + b) / 2)
  const n = Math.max(2, Math.round(TEX_W / tw))
  const w = TEX_W / n
  for (let i = 0; i < n; i++) g.drawImage(palm, i * w, top, w + 1, h)
}

// Names painted beside the figures, as on real vases. Letters stacked
// downward, starting near the head.
function inscription(ctx, text, x, y, size) {
  ctx.save()
  ctx.font = `600 ${size}px "Iowan Old Style", "Palatino", "Georgia", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  let yy = y
  for (const ch of text) {
    ctx.fillText(ch, x, yy)
    yy += size * 1.02
  }
  ctx.restore()
}

function frieze(g, m, keyed) {
  const [a, b] = BANDS.frieze
  const top = py(b)
  const h = py(a) - top
  const stretch = hx((a + b) / 2)
  const ranges = []
  let x = 0
  FIGURES.forEach((f, i) => {
    const slot = f.wide ? SLOT_WIDE : SLOT
    const k = keyed[i]
    const fh = h * 0.995
    const fw = fh * (k.width / k.height) * stretch
    const fx = x + (slot - fw) / 2
    g.drawImage(k, fx, top + h - fh, fw, fh)
    const s = MASK_W / TEX_W
    m.drawImage(tint(k, '#ff0000'), fx * s, (top + h - fh) * s, fw * s, fh * s)

    // Inscription: in the open field behind the figure's head.
    const size = h * 0.034
    const lx = f.wide ? x + slot * 0.6 : x + slot * 0.1
    const ly = top + h * (f.wide ? 0.06 : 0.08)
    g.fillStyle = SLIP
    inscription(g, f.greek, lx, ly, size)
    m.save()
    m.scale(s, s)
    m.fillStyle = '#00ff00'
    m.globalCompositeOperation = 'lighter'
    inscription(m, f.greek, lx, ly, size)
    m.restore()

    ranges.push([x / TEX_W, (x + slot) / TEX_W])
    x += slot
  })
  return ranges
}

// Firing marks, throwing rings, chips and grain: the difference between a
// render and a pot.
function wear(g) {
  const r = rng(7)
  const [a, b] = BANDS.clay
  const top = py(b)
  const bot = py(a)
  g.save()
  for (let i = 0; i < 70; i++) {
    const x = r() * TEX_W
    const y = top + r() * (bot - top)
    const rad = 80 + r() * 380
    const grd = g.createRadialGradient(x, y, 0, x, y, rad)
    const dark = r() < 0.55
    grd.addColorStop(0, dark ? 'rgba(70,22,8,0.10)' : 'rgba(255,190,140,0.07)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  for (let i = 0; i < 260; i++) {
    const y = top + r() * (bot - top)
    g.fillStyle = r() < 0.5 ? 'rgba(60,20,8,0.035)' : 'rgba(255,215,170,0.03)'
    g.fillRect(0, y, TEX_W, 1 + r() * 2.5)
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * TEX_W
    const y = r() * TEX_H * 0.97
    const s = 1.5 + r() * 6
    g.fillStyle = `rgba(214,150,108,${0.35 + r() * 0.45})`
    g.beginPath()
    g.ellipse(x, y, s, s * (0.4 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * TEX_W
    const y = r() * TEX_H * 0.97
    g.strokeStyle = 'rgba(205,140,100,0.35)'
    g.lineWidth = 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 14)
    g.stroke()
  }
  g.globalCompositeOperation = 'overlay'
  g.fillStyle = g.createPattern(noiseTile(256, 28), 'repeat')
  g.fillRect(0, 0, TEX_W, TEX_H)
  g.restore()
}

// Slip (bright) vs clay (dark) for bump and clearcoat; roughness in G.
function surface(map) {
  const c = canvas(MASK_W, MASK_H)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(map, 0, 0, MASK_W, MASK_H)
  const d = g.getImageData(0, 0, MASK_W, MASK_H)
  const p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255
    const slip = Math.min(1, Math.max(0, (0.3 - l) / 0.12))
    p[i] = Math.round(slip * 235 + Math.random() * 18)
    p[i + 1] = Math.round((0.62 - slip * 0.36) * 255 + (Math.random() - 0.5) * 20)
    p[i + 2] = 0
    p[i + 3] = 255
  }
  g.putImageData(d, 0, 0)
  return c
}

export async function paintVase() {
  const imgs = await Promise.all([...FIGURES.map((f) => load(f.src)), load('/art/palmettes.jpg')])
  const palm = key(imgs.pop())
  const keyed = imgs.map(key)

  const map = canvas(TEX_W, TEX_H)
  const g = map.getContext('2d')
  const maskC = canvas(MASK_W, MASK_H)
  const m = maskC.getContext('2d')
  m.fillStyle = '#000'
  m.fillRect(0, 0, MASK_W, MASK_H)

  // Slip everywhere (foot, lip, interior), then the clay field.
  g.fillStyle = SLIP
  g.fillRect(0, 0, TEX_W, TEX_H)
  const [ca, cb] = BANDS.clay
  const grd = g.createLinearGradient(0, py(cb), 0, py(ca))
  grd.addColorStop(0, '#cb6532')
  grd.addColorStop(0.45, CLAY)
  grd.addColorStop(1, '#b84f24')
  g.fillStyle = grd
  g.fillRect(0, py(cb), TEX_W, py(ca) - py(cb))

  for (const l of LINES) band(g, l, SLIP)
  rays(g, 34)
  meander(g, m)
  tongues(g, 56)
  lipDots(g, 120)
  neck(g, palm)
  const ranges = frieze(g, m, keyed)
  wear(g)

  return { map, surf: surface(map), mask: maskC, ranges, frieze: [vAtY(BANDS.frieze[0]), vAtY(BANDS.frieze[1])] }
}
