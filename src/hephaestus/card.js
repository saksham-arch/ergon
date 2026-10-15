// The work card, drawn as a bronze tablet. The same canvas is the texture on
// the 3D tablet and the PNG people download.

import { SANS, SERIF, spaced, wrap } from '../gl/tex.js'
import { rng } from '../gl/noise.js'

export const CARD_W = 1536
export const CARD_H = 1024

export const PLATES = {
  mason: '/art/mason.jpg',
  painter: '/art/painter.jpg',
  electrician: '/art/electrician.jpg',
  plumber: '/art/plumber.jpg',
  carpenter: '/art/carpenter.jpg',
  helper: '/art/headload.jpg',
  housekeeping: '/art/sweeper.jpg',
  loading: '/art/hawker.jpg',
}

export const SKILLS = {
  mason: ['Brickwork', 'Plaster', 'Tiling', 'Waterproofing', 'Shuttering', 'Reads drawings'],
  painter: ['Putty', 'Interiors', 'Exteriors', 'Texture walls', 'Spray', 'Wood polish'],
  electrician: ['House wiring', 'DB boards', 'Inverters', 'Fans and lights', 'Fault finding', 'Solar'],
  plumber: ['CPVC lines', 'Bathroom fittings', 'Leak repair', 'Tank work', 'Drainage', 'Gas lines'],
  carpenter: ['Furniture', 'Door frames', 'Modular kitchens', 'Shuttering', 'Polish', 'Repairs'],
  helper: ['Mixing', 'Carrying', 'Site cleaning', 'Scaffolding', 'Loading'],
  housekeeping: ['Office cleaning', 'Deep cleaning', 'Post-construction', 'Kitchen help'],
  loading: ['Loading', 'Packing', 'Forklift (licensed)', 'Stock counting', 'Night shifts'],
}

export const LANGS = ['Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Punjabi', 'Odia', 'Urdu', 'English']

const plateCache = {}
export function plate(trade, onload) {
  const src = PLATES[trade]
  if (!src) return null
  if (!plateCache[src]) {
    const im = new Image()
    im.src = src
    im.onload = onload
    plateCache[src] = im
  }
  return plateCache[src]
}

// Raised lettering: a dark shadow below, bright metal on top.
function emboss(g, draw, light = '#f6dfb2') {
  g.save()
  g.fillStyle = 'rgba(40,20,6,0.75)'
  g.translate(2, 3)
  draw()
  g.restore()
  g.fillStyle = light
  draw()
}

function bronze(g) {
  const grd = g.createLinearGradient(0, 0, CARD_W, CARD_H)
  grd.addColorStop(0, '#6e4320')
  grd.addColorStop(0.35, '#a8743c')
  grd.addColorStop(0.6, '#8a5a2c')
  grd.addColorStop(1, '#5e3818')
  g.fillStyle = grd
  g.fillRect(0, 0, CARD_W, CARD_H)
  const r = rng(12)
  // Patina and hammer marks.
  for (let i = 0; i < 420; i++) {
    const x = r() * CARD_W
    const y = r() * CARD_H
    const s = 4 + r() * 26
    g.fillStyle = r() < 0.18 ? `rgba(90,140,120,${0.05 + r() * 0.08})` : `rgba(${r() < 0.5 ? '255,220,170' : '40,20,6'},${0.03 + r() * 0.05})`
    g.beginPath()
    g.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2)
    g.fill()
  }
}

function border(g) {
  g.strokeStyle = 'rgba(246,223,178,0.55)'
  g.lineWidth = 3
  g.strokeRect(36, 36, CARD_W - 72, CARD_H - 72)
  g.lineWidth = 1.5
  g.strokeRect(50, 50, CARD_W - 100, CARD_H - 100)
  // Stopped keys along the top band.
  const y = 70
  const u = 22
  g.lineWidth = 4
  for (let x = 90; x < CARD_W - 120; x += u * 1.4) {
    g.beginPath()
    g.moveTo(x, y + u)
    g.lineTo(x + u, y + u)
    g.lineTo(x + u, y)
    g.lineTo(x, y)
    g.lineTo(x, y + u * 0.55)
    g.lineTo(x + u * 0.55, y + u * 0.55)
    g.stroke()
  }
}

export function drawCard(c, s) {
  const g = c.getContext('2d')
  g.setTransform(1, 0, 0, 1, 0, 0)
  bronze(g)
  border(g)
  g.textBaseline = 'alphabetic'

  g.font = `600 26px ${SANS}`
  emboss(g, () => spaced(g, 'ΕΡΓΟΝ · ERGON · RECORD OF WORK', 520, 160, 7), 'rgba(246,223,178,0.85)')

  // Medallion with the trade's black-figure plate.
  const cx = 1230
  const cy = 430
  const R = 210
  g.save()
  g.beginPath()
  g.arc(cx, cy, R + 14, 0, Math.PI * 2)
  g.fillStyle = 'rgba(40,20,6,0.55)'
  g.fill()
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = '#c4592a'
  g.fillRect(cx - R, cy - R, R * 2, R * 2)
  const im = s.plate
  if (im?.complete && im.naturalWidth) {
    const h = R * 2.15
    const w = h * (im.naturalWidth / im.naturalHeight)
    g.drawImage(im, cx - w / 2, cy - h * 0.5, w, h)
  }
  g.restore()
  g.strokeStyle = 'rgba(246,223,178,0.8)'
  g.lineWidth = 5
  g.beginPath()
  g.arc(cx, cy, R + 6, 0, Math.PI * 2)
  g.stroke()

  g.textAlign = 'left'
  let size = 112
  g.font = `600 ${size}px ${SERIF}`
  while (g.measureText(s.name || 'Your name').width > 860 && size > 24) g.font = `600 ${(size -= 6)}px ${SERIF}`
  emboss(g, () => g.fillText(s.name || 'Your name', 110, 330))
  g.font = `italic 500 58px ${SERIF}`
  emboss(g, () => g.fillText(`${s.tradeLabel || 'Your trade'}${s.years ? ` · ${s.years} ${s.years === 1 ? 'year' : 'years'}` : ''}`, 112, 410), '#f0cf98')

  g.font = `600 22px ${SANS}`
  emboss(g, () => g.fillText('SKILLS', 112, 500), 'rgba(246,223,178,0.7)')
  g.font = `500 40px ${SERIF}`
  const skills = s.skills.length ? s.skills.join('  ·  ') : 'Choose what you do best'
  let skillLines=wrap(g, skills, 850)
  let skillSize=40
  while(skillLines.length>2 && skillSize>20){ g.font=`500 ${--skillSize}px ${SERIF}`;skillLines=wrap(g,skills,850) }
  skillLines.forEach((l,i)=>emboss(g,()=>g.fillText(l,112,556+i*45)))

  g.font = `600 22px ${SANS}`
  emboss(g, () => g.fillText('SPEAKS', 112, 690), 'rgba(246,223,178,0.7)')
  g.font = `500 40px ${SERIF}`
  g.font = `500 30px ${SERIF}`
  const languageLines=wrap(g,s.langs.length?s.langs.join(' · '):'—',850)
  languageLines.forEach((l,i)=>emboss(g,()=>g.fillText(l,112,730+i*34)))

  // Photos of real work, set into the bronze.
  s.photos.slice(0, 3).forEach((p, i) => {
    if (!p.complete || !p.naturalWidth) return
    const x = 112 + i * 196
    const y = 800
    g.save()
    g.beginPath()
    g.roundRect(x, y, 176, 132, 12)
    g.clip()
    const k = Math.max(176 / p.naturalWidth, 132 / p.naturalHeight)
    g.drawImage(p, x + (176 - p.naturalWidth * k) / 2, y + (132 - p.naturalHeight * k) / 2, p.naturalWidth * k, p.naturalHeight * k)
    g.restore()
    g.strokeStyle = 'rgba(246,223,178,0.7)'
    g.lineWidth = 3
    g.strokeRect(x, y, 176, 132)
  })

  // Seal: how this record was made.
  g.textAlign = 'center'
  g.font = `600 24px ${SANS}`
  const lines = ['SELF-DESCRIBED SKILL', `${s.photos.length} PHOTO${s.photos.length === 1 ? '' : 'S'} OF WORK`, 'NO VERIFIED ENDORSEMENTS']
  lines.forEach((l, i) => emboss(g, () => spaced(g, l, 1230, 740 + i * 44, 1), 'rgba(246,223,178,0.8)'))
  g.font = `italic 500 24px ${SERIF}`
  emboss(g, () => g.fillText(s.forged ? `Set in bronze · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Still on the anvil', 1230, 916), '#f0cf98')
  g.textAlign = 'left'
}
