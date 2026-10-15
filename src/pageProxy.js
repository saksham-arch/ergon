// Paints a stand-in of the world (sky, mountain, ridge, slabs and words) into a
// canvas at world positions. The chrome shader traces the plane behind the ball
// and samples this, so the boulder reflects the hillside around it.
// Must be called with the world laid out flat (no camera transform).

const SKY = '#f3eadb'
const SURFACES = '.card, .chip, .btn, .tag'
const DARK = '.btn-dark'
const TINTED = '.window-bar, .sidebar, .btn-light, kbd'

// Solid fill for a surface: its background-color when it has one (pastel
// surfaces declare one under their gradient), otherwise a close stand-in.
function fillFor(el) {
  if (el.matches(DARK)) return '#17120f'
  const bg = getComputedStyle(el).backgroundColor
  if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg
  return el.matches(TINTED) ? '#eadcc6' : '#f6eee2'
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}

export function renderWorldProxy(world, W, H, ridgePts) {
  const s = Math.min(0.5, 8192 / W, 4096 / H)
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * s)
  c.height = Math.ceil(H * s)
  const g = c.getContext('2d')
  g.scale(s, s)
  g.fillStyle = SKY
  g.fillRect(0, 0, W, H)

  // Mountain body. (No ridge stroke: it would read as a hard line in the chrome.)
  const ridge = () => {
    g.beginPath()
    g.moveTo(ridgePts[0], ridgePts[1])
    for (let i = 2; i < ridgePts.length; i += 2) g.lineTo(ridgePts[i], ridgePts[i + 1])
  }
  ridge()
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  const body = g.createLinearGradient(0, 0, 0, H)
  // A shade deeper than on screen, so the ground reads as polished floor in
  // the chrome.
  body.addColorStop(0, '#c4592a')
  body.addColorStop(1, '#8a3417')
  g.fillStyle = body
  g.fill()

  const o = world.getBoundingClientRect()

  for (const el of world.querySelectorAll(SURFACES)) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    g.save()
    if (el.matches('.card')) {
      g.shadowColor = 'rgba(0,0,0,0.12)'
      g.shadowBlur = 30
      g.shadowOffsetY = 12
    }
    roundRect(g, r.left - o.left, r.top - o.top, r.width, r.height, radius)
    g.fillStyle = fillFor(el)
    g.fill()
    g.restore()
  }

  // Words, each at its laid-out position.
  const walker = document.createTreeWalker(world, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement.closest('svg') || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  const range = document.createRange()
  g.textBaseline = 'middle'
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const cs = getComputedStyle(node.parentElement)
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`
    if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    const col = cs.color
    g.fillStyle = col === 'rgba(0, 0, 0, 0)' || col === 'transparent' ? '#17120f' : col
    for (const m of node.nodeValue.matchAll(/\S+/g)) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const r = range.getBoundingClientRect()
      if (!r.width) continue
      g.fillText(m[0], r.left - o.left, r.top - o.top + r.height / 2)
    }
  }

  return c
}
