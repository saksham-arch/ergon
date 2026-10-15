// I · Hermes: find work. The map is the list: flowers are jobs, the caduceus
// is you. Filters, a ledger of what's open within reach, and the detail of
// the chosen job, with one action that matters: send word.

import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import MapScene from './MapScene.jsx'
import { JOBS, KINDS, KM, TRADES, money, payLine, tradeOf } from './jobs.js'
import { useActive } from '../gl/useActive.js'
import GodHeader from '../ui/GodHeader.jsx'
import Listen from '../ui/Listen.jsx'

const REACH = [
  { km: 2, label: '2 km', note: 'a short walk' },
  { km: 4, label: '4 km', note: 'a long walk' },
  { km: 7, label: '7 km', note: 'by bus' },
]

export default function Hermes() {
  const frame = useRef()
  const tip = useRef()
  const active = useActive(frame)
  const [trade, setTrade] = useState('all')
  const [kind, setKind] = useState('all')
  const [km, setKm] = useState(4)
  const [here, setHere] = useState([-0.6, 0.3])
  const [selected, setSelected] = useState(null)
  const [hover, setHover] = useState(null)
  const [sent, setSent] = useState(() => new Set())
  const [flights, setFlights] = useState([])

  const jobs = useMemo(
    () =>
      JOBS.map((j) => {
        const dist = Math.hypot(j.x - here[0], j.z - here[1]) * KM
        const open = (trade === 'all' || j.trade === trade) && (kind === 'all' || j.kind === kind) && dist <= km
        return { ...j, dist, open }
      }),
    [trade, kind, km, here],
  )
  const list = jobs.filter((j) => j.open).sort((a, b) => a.dist - b.dist)
  const sel = jobs.find((j) => j.id === selected)
  const hov = jobs.find((j) => j.id === hover)

  const send = (j) => {
    if (sent.has(j.id)) return
    setSent(new Set([...sent, j.id]))
    const f = { id: j.id, from: here, t0: performance.now() }
    setFlights((fs) => [...fs, f])
    setTimeout(() => setFlights((fs) => fs.filter((x) => x !== f)), 2200)
  }

  const walk = (d) => (d < 0.15 ? 'right here' : `${d.toFixed(1)} km · ${Math.max(2, Math.round((d / 4.5) * 60))} min walk`)

  return (
    <section className="act" id="hermes" aria-labelledby="hermes-title">
      <GodHeader
        id="hermes-title"
        n="I"
        god="Hermes"
        role="messenger, and keeper of roads and trade"
        emblem="/art/gods/hermes.jpg"
        title={
          <>
            Work, <em>carried to you.</em>
          </>
        }
        sub="Every job near your naka grows as a flower on the map. Drag the golden staff to where you stand; the glass ring is how far you’ll go. Pay, hours and distance come first, always."
      />

      <div
        className="studio studio-map"
        ref={frame}
        onPointerMove={(e) => {
          const r = frame.current.getBoundingClientRect()
          if (tip.current) tip.current.style.transform = `translate3d(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px, 0)`
        }}
      >
        <div className="studio-gl">
          <Canvas shadows dpr={[1, 1.6]} frameloop={active ? 'always' : 'never'} camera={{ fov: 34, position: [0, 10.2, 10.6], near: 0.1, far: 80 }}>
            <MapScene
              jobs={jobs}
              here={here}
              km={km}
              selected={selected}
              hover={hover}
              sent={sent}
              flights={flights}
              onSelect={(id) => setSelected(id === selected ? null : id)}
              onHover={setHover}
              onMove={setHere}
            />
          </Canvas>
        </div>
        <div className="studio-line" aria-hidden="true" />

        <div className="filters">
          <div className="chips" role="group" aria-label="Trade">
            <button type="button" className={trade === 'all' ? 'on' : ''} onClick={() => setTrade('all')}>
              All trades
            </button>
            {TRADES.map((t) => (
              <button key={t.id} type="button" className={trade === t.id ? 'on' : ''} onClick={() => setTrade(t.id)} style={{ '--c': t.color }}>
                <i aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <div className="seg" role="group" aria-label="When">
              <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>
                Any time
              </button>
              {KINDS.map((k) => (
                <button key={k.id} type="button" className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="How far">
              {REACH.map((r) => (
                <button key={r.km} type="button" className={km === r.km ? 'on' : ''} onClick={() => setKm(r.km)} title={r.note}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="ledger" aria-label="Open work within reach">
          <p className="ledger-head">
            <span>{list.length}</span> within reach
          </p>
          {list.length === 0 && <p className="ledger-empty">Nothing open here. Try walking a little further, or another trade.</p>}
          <ol>
            {list.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  className={`${selected === j.id ? 'on' : ''} ${hover === j.id ? 'hot' : ''}`}
                  onClick={() => setSelected(j.id)}
                  onPointerEnter={() => setHover(j.id)}
                  onPointerLeave={() => setHover(null)}
                  style={{ '--c': tradeOf(j.trade).color }}
                >
                  <span className="l-pay">{money(j.pay)}</span>
                  <span className="l-what">{j.title}</span>
                  <span className="l-meta">
                    <i aria-hidden="true" />
                    {tradeOf(j.trade).label} · {j.dist.toFixed(1)} km{sent.has(j.id) ? ' · sent' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        {sel && (
          <div className="plate" key={sel.id} style={{ '--c': tradeOf(sel.trade).color }}>
            <button type="button" className="plate-x" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
            <p className="plate-kicker">
              <i aria-hidden="true" />
              {tradeOf(sel.trade).label} · {tradeOf(sel.trade).hi}
            </p>
            <h3 className="plate-title">{sel.title}</h3>
            <p className="plate-pay">{payLine(sel)}</p>
            <dl className="plate-facts">
              <div>
                <dt>When</dt>
                <dd>
                  {sel.start}, {sel.hours}
                </dd>
              </div>
              <div>
                <dt>For</dt>
                <dd>{sel.days}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>
                  {sel.place} · {walk(sel.dist)}
                </dd>
              </div>
              <div>
                <dt>Bring</dt>
                <dd>{sel.bring}</dd>
              </div>
            </dl>
            <p className={`plate-by ${sel.verified ? 'ok' : 'warn'}`}>
              {sel.verified ? `${sel.employer} · verified, ${sel.hires} hires through Ergon` : `${sel.employer} · not yet verified. Meet at a public place first.`}
            </p>
            <div className="plate-actions">
              <button type="button" className={`btn btn-ink ${sent.has(sel.id) ? 'done' : ''}`} onClick={() => send(sel)} disabled={sent.has(sel.id)}>
                {sent.has(sel.id) ? 'Word sent · reply expected by evening' : 'Send word via Hermes'}
              </button>
              <Listen
                label="Listen"
                lines={() => [
                  [`${tradeOf(sel.trade).hi} का काम। ${sel.pay} रुपये। ${sel.dist.toFixed(1)} किलोमीटर दूर। ${sel.start}।`, 'hi-IN'],
                ]}
              />
            </div>
          </div>
        )}

        <div className={`tip ${hov && hov.id !== selected ? 'show' : ''}`} ref={tip} aria-hidden="true">
          {hov && (
            <>
              <span className="tip-pay">{payLine(hov)}</span>
              <span className="tip-what">{hov.title}</span>
              <span className="tip-meta">
                {hov.dist.toFixed(1)} km · {hov.open ? hov.start : 'outside your filters'}
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
