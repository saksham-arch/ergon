// Texture loading and canvas helpers shared by the scenes.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'

const loader = new TextureLoader()
const cache = new Map()

export function tex(url, { repeat = false, srgb = true, aniso = 8 } = {}) {
  const key = `${url}|${repeat}|${srgb}`
  if (cache.has(key)) return cache.get(key)
  const t = loader.load(url)
  if (srgb) t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = aniso
  cache.set(key, t)
  return t
}

export function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function canvasTex(c, srgb = true) {
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

export const SERIF = '"Cormorant Garamond", "Iowan Old Style", Palatino, Georgia, serif'
export const SANS = '"DM Sans", -apple-system, "Helvetica Neue", Arial, sans-serif'

// Canvas text needs the web fonts to be ready first.
let fontsReady = null
export function whenFonts() {
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts?.load(`600 64px ${SERIF}`),
      document.fonts?.load(`italic 500 64px ${SERIF}`),
      document.fonts?.load(`500 32px ${SANS}`),
    ]).catch(() => {})
  }
  return fontsReady
}

// Draw letter-spaced text centred on x.
export function spaced(g, text, x, y, spacing) {
  const chars = [...text]
  const widths = chars.map((c) => g.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let cx = x - total / 2
  const align = g.textAlign
  g.textAlign = 'left'
  chars.forEach((c, i) => {
    g.fillText(c, cx, y)
    cx += widths[i] + spacing
  })
  g.textAlign = align
}

// Wrap text into lines no wider than `max`.
export function wrap(g, text, max) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (g.measureText(t).width > max && line) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}
