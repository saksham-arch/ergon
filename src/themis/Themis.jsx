// III · Themis: your rights. Three things on one balance: weigh an offer
// before you say yes, find the schemes you qualify for, and put together a
// claim when wages don't come.

import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import ScalesScene from './ScalesScene.jsx'
import { LOCAL_RATE, PRESETS, matchSchemes, weighOffer } from './rules.js'
import { TRADES } from '../hermes/jobs.js'
import { useActive } from '../gl/useActive.js'
import GodHeader from '../ui/GodHeader.jsx'
import Listen from '../ui/Listen.jsx'

const TABS = [
  { id: 'offer', label: 'Weigh an offer' },
  { id: 'schemes', label: 'Find your schemes' },
  { id: 'wages', label: 'Unpaid wages' },
]

function Toggle({ on, onChange, children }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="toggle-dot" aria-hidden="true" />
      {children}
    </button>
  )
}

export default function Themis() {
  const frame = useRef()
  const tip = useRef()
  const active = useActive(frame)
  const born = useRef({})
  const [tab, setTab] = useState('offer')
  const [o, setO] = useState(PRESETS.doubt)
  const [a, setA] = useState({ age: 34, work: 'construction', income: 'low', aadhaar: true, bank: true, epf: false })
  const [w, setW] = useState({ employer: 'Sai Constructions', site: 'Plot 14, behind the temple tank', days: 6, rate: 950, ready: false })
  const [hover, setHover] = useState(null)
  const [pulse, setPulse] = useState(-1e9)

  const offer = useMemo(() => weighOffer(o), [o])
  const schemes = useMemo(() => matchSchemes(a), [a])
  const set = (patch) => setO((x) => ({ ...x, ...patch }))

  // Coins for the pans: one per unit of weight. Birth times persist so a
  // coin only drops once.
  const coin = (key, tone, label) => {
    born.current[key] ??= performance.now() + Math.random() * 220
    return { key, tone, label, born: born.current[key] }
  }
  const { left, right, verdict } = useMemo(() => {
    if (tab === 'offer') {
      const l = []
      const r = []
      offer.tokens.forEach((t) => {
        for (let k = 0; k < t.w; k++) (t.side === 'fair' ? l : r).push(coin(`o-${t.id}-${t.side}-${k}`, t.side, t.label))
      })
      return { left: l, right: r, verdict: offer.verdict }
    }
    if (tab === 'schemes') {
      const l = schemes.yes.map((s) => coin(`s-${s.id}`, 'scheme', s.name))
      const r = schemes.todo.map((t) => coin(`t-${t.id}`, 'risk', t.label))
      return {
        left: l,
        right: r,
        verdict: { word: `${schemes.yes.length} for you`, tone: schemes.todo.length ? 'mid' : 'good', line: schemes.todo.length ? 'Settle what’s on the right first; the rest follow.' : 'Bring the documents listed, and register at the place shown.' },
      }
    }
    const l = ['employer', 'site', 'days', 'rate'].filter((k) => w[k]).map((k) => coin(`w-${k}`, 'fair', `Recorded: ${k}`))
    const r = Array.from({ length: Math.min(12, Number(w.days) || 0) }, (_, k) => coin(`w-d${k}`, 'risk', `Day ${k + 1}, unpaid`))
    const owed = (Number(w.days) || 0) * (Number(w.rate) || 0)
    return { left: l, right: r, verdict: { word: `₹${owed.toLocaleString('en-IN')} owed`, tone: 'bad', line: 'Every unpaid day weighs on the scale. Your record is the counterweight.' } }
  }, [tab, offer, schemes, w])

  return (
    <section className="act" id="themis" aria-labelledby="themis-title">
      <span id="rights" className="anchor-rel" />
      <GodHeader
        id="themis-title"
        n="III"
        god="Themis"
        role="keeper of law, of fair measure and of what is owed"
        emblem="/art/gods/themis.jpg"
        title={
          <>
            Weighed fairly. <em>Owed fully.</em>
          </>
        }
        sub="Put an offer on the scales before you say yes. Find the schemes meant for you and the papers each one needs. When pay doesn’t come, her sword starts a claim, with your work record behind it."
      />

      <div
        className="studio studio-scales"
        ref={frame}
        onPointerMove={(e) => {
          const r = frame.current.getBoundingClientRect()
          if (tip.current) tip.current.style.transform = `translate3d(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px, 0)`
        }}
      >
        <div className="studio-gl">
          <Canvas shadows dpr={[1, 1.6]} frameloop={active ? 'always' : 'never'} camera={{ fov: 34, position: [0.35, 2.7, 8.6], near: 0.1, far: 60 }}>
            <ScalesScene
              left={left}
              right={right}
              onHover={setHover}
              pulse={pulse}
              onSword={() => {
                setPulse(performance.now())
                setTab('wages')
              }}
            />
          </Canvas>
        </div>
        <div className="studio-line" aria-hidden="true" />

        <div className="tabs" role="tablist" aria-label="What to weigh">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={`verdict tone-${verdict.tone}`} aria-live="polite">
          <p className="verdict-word">{verdict.word}</p>
          <p className="verdict-line">{verdict.line}</p>
        </div>

        <div className="pan-label pan-l" aria-hidden="true">
          {tab === 'offer' ? 'Fair' : tab === 'schemes' ? 'Yours' : 'On record'}
        </div>
        <div className="pan-label pan-r" aria-hidden="true">
          {tab === 'offer' ? 'Risk' : tab === 'schemes' ? 'To do' : 'Unpaid'}
        </div>

        <div className="desk" key={tab}>
          {tab === 'offer' && (
            <>
              <div className="presets">
                <span>Try</span>
                <button type="button" onClick={() => setO(PRESETS.fair)}>a fair offer</button>
                <button type="button" onClick={() => setO(PRESETS.doubt)}>a doubtful one</button>
                <button type="button" onClick={() => setO(PRESETS.scam)}>a scam</button>
              </div>
              <label className="row">
                <span>Trade</span>
                <select value={o.trade} onChange={(e) => set({ trade: e.target.value })}>
                  {TRADES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="row">
                <span>Pay a day</span>
                <span className="money">
                  ₹<input type="number" min={0} step={50} value={o.pay} onChange={(e) => set({ pay: Number(e.target.value) })} />
                </span>
              </label>
              <label className="row">
                <span>Hours a day · {o.hours}</span>
                <input type="range" min={4} max={14} value={o.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />
              </label>
              <div className="row">
                <span>Paid</span>
                <div className="seg seg-sm">
                  {['daily', 'weekly', 'end'].map((p) => (
                    <button key={p} type="button" className={o.payday === p ? 'on' : ''} onClick={() => set({ payday: p })}>
                      {p === 'end' ? 'At the end' : p[0].toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="row">
                <span>Fee asked upfront</span>
                <span className="money">
                  ₹<input type="number" min={0} step={500} value={o.fee} onChange={(e) => set({ fee: Number(e.target.value) })} />
                </span>
              </label>
              <div className="toggles">
                <Toggle on={o.address} onChange={(v) => set({ address: v })}>Site address given</Toggle>
                <Toggle on={o.written} onChange={(v) => set({ written: v })}>Terms in writing</Toggle>
                <Toggle on={o.verified} onChange={(v) => set({ verified: v })}>Employer verified</Toggle>
              </div>
            </>
          )}

          {tab === 'schemes' && (
            <>
              <label className="row">
                <span>Your age · {a.age}</span>
                <input type="range" min={14} max={75} value={a.age} onChange={(e) => setA({ ...a, age: Number(e.target.value) })} />
              </label>
              <label className="row">
                <span>Your work</span>
                <select value={a.work} onChange={(e) => setA({ ...a, work: e.target.value })}>
                  <option value="construction">Building and construction</option>
                  <option value="vending">Street vending</option>
                  <option value="domestic">Housework, cleaning</option>
                  <option value="other">Loading, factory, other</option>
                </select>
              </label>
              <div className="row">
                <span>Monthly income</span>
                <div className="seg seg-sm">
                  <button type="button" className={a.income === 'low' ? 'on' : ''} onClick={() => setA({ ...a, income: 'low' })}>
                    Under ₹15,000
                  </button>
                  <button type="button" className={a.income === 'high' ? 'on' : ''} onClick={() => setA({ ...a, income: 'high' })}>
                    More
                  </button>
                </div>
              </div>
              <div className="toggles">
                <Toggle on={a.aadhaar} onChange={(v) => setA({ ...a, aadhaar: v })}>I have Aadhaar</Toggle>
                <Toggle on={a.bank} onChange={(v) => setA({ ...a, bank: v })}>I have a bank account</Toggle>
                <Toggle on={a.epf} onChange={(v) => setA({ ...a, epf: v })}>I have PF or ESIC</Toggle>
              </div>
            </>
          )}

          {tab === 'wages' && (
            <>
              <label className="row">
                <span>Who hired you</span>
                <input value={w.employer} onChange={(e) => setW({ ...w, employer: e.target.value, ready: false })} />
              </label>
              <label className="row">
                <span>Where</span>
                <input value={w.site} onChange={(e) => setW({ ...w, site: e.target.value, ready: false })} />
              </label>
              <label className="row">
                <span>Days unpaid · {w.days}</span>
                <input type="range" min={1} max={30} value={w.days} onChange={(e) => setW({ ...w, days: Number(e.target.value), ready: false })} />
              </label>
              <label className="row">
                <span>Agreed rate a day</span>
                <span className="money">
                  ₹<input type="number" min={0} step={50} value={w.rate} onChange={(e) => setW({ ...w, rate: Number(e.target.value), ready: false })} />
                </span>
              </label>
              <button type="button" className="btn btn-ink" onClick={() => setW({ ...w, ready: true })}>
                Prepare my claim
              </button>
            </>
          )}
        </div>

        <div className="reasons-col" key={`r-${tab}`}>
          {tab === 'offer' && (
            <>
              <ul className="weights">
                {offer.tokens.map((t) => (
                  <li key={t.id} className={t.side}>
                    <i aria-hidden="true">{t.side === 'fair' ? '●' : '●'}</i>
                    {t.label}
                  </li>
                ))}
              </ul>
              <p className="small-note">Local rates here are illustrative. Ergon would use current rates for your city and trade.</p>
            </>
          )}
          {tab === 'schemes' && (
            <ul className="scheme-list">
              {schemes.todo.map((t) => (
                <li key={t.id} className="todo">
                  <b>First</b> {t.label}
                </li>
              ))}
              {schemes.yes.map((s) => (
                <li key={s.id}>
                  <b>{s.name}</b>
                  <span>{s.what}</span>
                  <span className="need">Bring: {s.need.join(' · ')}</span>
                  <span className="where">Where: {s.where}</span>
                </li>
              ))}
              {schemes.yes.length === 0 && <li>Nothing matches yet. Change an answer, or ask at a CSC: there may be state schemes too.</li>}
            </ul>
          )}
          {tab === 'wages' && (
            <ol className="claim">
              <li className={w.ready ? 'done' : ''}>
                <b>Your record</b> Ergon already holds the days you checked in at this site.
              </li>
              <li className={w.ready ? 'done' : ''}>
                <b>A reminder in your name</b> {w.employer || 'The employer'} gets a polite, dated message asking for ₹
                {((Number(w.days) || 0) * (Number(w.rate) || 0)).toLocaleString('en-IN')}.
              </li>
              <li>
                <b>If nothing in 7 days</b> Your claim, with the record attached, goes to your state labour department’s grievance desk. Your union or a CSC can help you file it.
              </li>
              <li>
                <b>Helpline</b> e-Shram: 14434, for help registering and finding the right office.
              </li>
              {w.ready && (
                <li className="claim-ready">
                  Claim ready: {w.days} days at {w.site || 'the site'}, ₹{((Number(w.days) || 0) * (Number(w.rate) || 0)).toLocaleString('en-IN')} owed by {w.employer || 'the employer'}.
                  <Listen
                    label="Listen"
                    lines={() => [[`${w.days} दिन की मज़दूरी बाकी है। कुल ${(Number(w.days) || 0) * (Number(w.rate) || 0)} रुपये।`, 'hi-IN']]}
                  />
                </li>
              )}
            </ol>
          )}
        </div>

        <div className={`tip ${hover ? 'show' : ''}`} ref={tip} aria-hidden="true">
          {hover && <span className="tip-what">{hover.label}</span>}
        </div>
        <p className="studio-hint">Touch the sword to start a claim · hover a coin to read it</p>
      </div>
      <p className="fine">Rates are illustrative; scheme rules are summarised from public scheme pages. Check at a Common Service Centre before you rely on them. Local rate used here: ₹{(LOCAL_RATE[o.trade] ?? 800).toLocaleString('en-IN')} a day for {TRADES.find((t) => t.id === o.trade)?.label.toLowerCase()}.</p>
    </section>
  )
}
