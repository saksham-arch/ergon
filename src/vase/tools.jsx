// The working half of each chapter. Every tool is small enough to use with
// one thumb, reads aloud where it matters, and feeds the 3D world beside it:
// the work card is the bronze tablet floating by the vase (hall.card), and
// an offer's terms are the coins on Themis' balance (hall.offer).

import { useEffect, useMemo, useRef, useState } from 'react'
import { hall } from './hall.js'
import { RECORDS, FIGURES } from './data.js'
import { JOBS, KINDS, TRADES, money, tradeOf } from '../hermes/jobs.js'
import { CARD_H, CARD_W, LANGS, PLATES, SKILLS, drawCard, plate } from '../hephaestus/card.js'
import { PRESETS, matchSchemes, weighOffer } from '../themis/rules.js'
import { whenFonts } from '../gl/tex.js'
import { agora } from '../agora/state.js'
import Listen from '../ui/Listen.jsx'

export { default as JobsTool } from '../tasks/WorkPreview.jsx'
export { default as CardTool } from '../tasks/Card.jsx'
export { default as OfferTool } from '../tasks/Offer.jsx'
export { default as RightsTool } from '../tasks/Rights.jsx'

/* ---------- A person on the frieze ---------- */

const FIGURE_TRADE = { carpenter: 'carpenter', mason: 'mason', electrician: 'electrician', painter: 'painter', plumber: 'plumber', sweeper: 'housekeeping', headload: 'helper', hawker: 'loading' }

export function Record({ id, compact, onMap }) {
  const r = RECORDS[id]
  const f = FIGURES.find((x) => x.id === id)
  return (
    <div className={`record ${compact ? 'compact' : ''}`}>
      <div className="record-head">
        <span className="record-greek" aria-hidden="true">
          {f.greek}
        </span>
        <div>
          <p className="record-name">{r.name}</p>
          <p className="record-trade">{r.trade}</p>
        </div>
      </div>
      <dl className="record-stats">
        <div>
          <dt>Experience</dt>
          <dd>{r.years}</dd>
        </div>
        <div>
          <dt>Sample vouched jobs</dt>
          <dd>{r.vouched}</dd>
        </div>
        <div>
          <dt>Day rate</dt>
          <dd>{r.rate}</dd>
        </div>
      </dl>
      <p className="record-note">{r.note}</p>
      <p className="record-meta">
        {r.place} · {r.langs}
      </p>
      <p className="record-avail">
        <span className="dot" />
        {r.avail}
      </p>
      {onMap && FIGURE_TRADE[id] && (
        <button type="button" className="link" onClick={() => agora.show(FIGURE_TRADE[id])}>
          {tradeOf(FIGURE_TRADE[id]).label} work nearby, on the map ↓
        </button>
      )}
    </div>
  )
}
