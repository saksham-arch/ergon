// Shared state for the vase hall: the DOM side (scroll, video, overlays)
// writes it, the WebGL side reads it every frame. Plain mutable object, no
// re-renders.
//
// Scroll timeline through the hall, as progress p in [0, 1]:
//   descent  boulders fall into the amphora (video, or the live fallback)
//   kept     the frieze paints itself in; a glass case lowers over it
//   Α Β Γ Δ  four chapters, each turning a different figure to face you
//   coda     the case lifts away; the vase is yours to turn

import { FIGURES } from './data.js'

export const T = {
  descent: [0, 0.2],
  handoff: [0.17, 0.23],
  kept: [0.22, 0.33],
  chapters: [
    [0.33, 0.47],
    [0.47, 0.61],
    [0.61, 0.75],
    [0.75, 0.89],
  ],
  coda: [0.89, 1],
}

// Which figure each stretch of the hall turns toward the viewer.
const idx = (id) => FIGURES.findIndex((f) => f.id === id)
export const FACE = {
  kept: idx('sisyphus'),
  chapters: [idx('electrician'), idx('mason'), idx('plumber'), idx('headload')],
}

export const hall = {
  p: 0,
  vh: 1,
  active: false, // the hall is on screen
  mouth: null, // projected mouth in viewport pixels, updated by the gallery camera
  hasVideo: false,
  ranges: null, // frieze slot u-ranges, once painted
  pointer: { x: 0, y: 0, nx: 0, ny: 0, inside: false },
  drag: { on: false, x: 0, moved: 0, vel: 0, offset: 0, idle: 0 },
  hover: -1,
  selected: -1,
  reveal: new Array(FIGURES.length).fill(0),
  onSelect: null, // set by the DOM: (index | -1) => void
  grab: false, // a 3D exhibit owns the current drag
  card: null, // { canvas, version }: the work card, drawn by chapter Β
  offer: null, // { fair, risk }: weights from chapter Γ
  onHover: null,
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
export const mix = (a, b, t) => a + (b - a) * t

export function chapterAt(p) {
  for (let i = 0; i < T.chapters.length; i++) {
    const [a, b] = T.chapters[i]
    if (p >= a && p < b) return i
  }
  return -1
}

// Fade an overlay in over [a, a + f] and out over [b - f, b].
export function span(p, a, b, f = 0.018) {
  return smooth(a, a + f, p) * (1 - smooth(b - f, b, p))
}
