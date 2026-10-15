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

const ME = [-0.6, 0.3] // the demo naka, in job-map units (0.75 km each)

function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

function Toggle({ on, onChange, children }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-track" aria-hidden="true" />
      {children}
    </button>
  )
}

/* ---------- Α · Hermes: work nearby ---------- */

export function JobsTool() {
  const [kind, setKind] = useState('all')
  const [held, setHeld] = useState(null)
  const near = useMemo(
    () =>
      JOBS.map((j) => ({ ...j, dist: Math.hypot(j.x - ME[0], j.z - ME[1]) * 0.75 }))
        .filter((j) => kind === 'all' || j.kind === kind)
        .sort((a, b) => a.dist - b.dist),
    [kind],
  )
  return (
    <div className="tool">
      <Seg value={kind} onChange={setKind} label="When" options={[['all', 'Any time'], ...KINDS.map((k) => [k.id, k.label])]} />
      <ul className="jobs">
        {near.slice(0, 3).map((j) => (
          <li key={j.id} className={held === j.id ? 'held' : ''} style={{ '--c': tradeOf(j.trade).color }}>
            <div className="job-top">
              <span className="job-pay">
                {money(j.pay)}
                <small> / {j.unit}</small>
              </span>
              <span className="job-km">{j.dist.toFixed(1)} km</span>
            </div>
            <p className="job-what">{j.title}</p>
            <p className="job-meta">
              <i aria-hidden="true" />
              {tradeOf(j.trade).label} · {j.start}, {j.hours}
            </p>
            <div className="job-foot">
              <span className={`tag ${j.verified ? 'ok' : 'warn'}`}>{j.verified ? 'Verified employer' : 'Not yet verified'}</span>
              <button type="button" className="mini" onClick={() => setHeld(held === j.id ? null : j.id)}>
                {held === j.id ? 'Held for 30 min' : 'Hold'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-clay btn-wide" onClick={() => agora.show('all')}>
        See all {JOBS.length} on the map <span aria-hidden="true">↓</span>
      </button>
    </div>
  )
}

/* ---------- Β · Hephaestus: the work card ---------- */

function Voice({ url, onDone }) {
  const [state, setState] = useState('idle')
  const rec = useRef(null)
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return null
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        onDone(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })))
        setState('idle')
      }
      mr.start()
      rec.current = mr
      setState('rec')
      setTimeout(() => mr.state === 'recording' && mr.stop(), 12000)
    } catch {
      setState('denied')
    }
  }
  return (
    <div className="voice-row">
      <button type="button" className={`voice ${state}`} onClick={() => (state === 'rec' ? rec.current?.stop() : start())}>
        <span className="voice-wave" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ '--k': i }} />
          ))}
        </span>
        {state === 'rec' ? 'Listening… tap to stop' : state === 'denied' ? 'Microphone blocked' : url ? 'Record again' : 'Say what you do'}
      </button>
      {url && <audio src={url} controls className="voice-play" />}
    </div>
  )
}

export function CardTool() {
  const [trade, setTrade] = useState('mason')
  const [name, setName] = useState('Sunita Devi')
  const [years, setYears] = useState(11)
  const [skills, setSkills] = useState(['Brickwork', 'Plaster'])
  const [langs, setLangs] = useState(['Hindi', 'Marathi'])
  const [photos, setPhotos] = useState([])
  const [voice, setVoice] = useState(null)
  const card = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = CARD_W
    c.height = CARD_H
    return c
  }, [])

  // Redraw the bronze tablet whenever the record changes.
  useEffect(() => {
    let alive = true
    const draw = () => {
      if (!alive) return
      drawCard(card, {
        name: name.trim(),
        tradeLabel: tradeOf(trade)?.label,
        years,
        skills,
        langs,
        photos,
        voice: !!voice,
        forged: true,
        plate: plate(trade, draw),
      })
      hall.card = { canvas: card, version: (hall.card?.version ?? 0) + 1 }
    }
    whenFonts().then(draw)
    return () => {
      alive = false
    }
  }, [card, name, trade, years, skills, langs, photos, voice])

  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const addPhotos = (files) => {
    const next = [...files].slice(0, 3 - photos.length).map((f) => {
      const im = new Image()
      im.src = URL.createObjectURL(f)
      im.onload = () => setPhotos((p) => [...p])
      return im
    })
    setPhotos((p) => [...p, ...next].slice(0, 3))
  }
  const download = () =>
    card.toBlob((b) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `ergon-${(name || 'work-card').toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    })

  return (
    <div className="tool">
      <div className="medals" role="radiogroup" aria-label="Your trade">
        {TRADES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={trade === t.id}
            className={trade === t.id ? 'on' : ''}
            onClick={() => {
              setTrade(t.id)
              setSkills(SKILLS[t.id].slice(0, 2))
            }}
            title={t.label}
          >
            <span className="medal" style={{ backgroundImage: `url(${PLATES[t.id]})` }} />
            <span className="medal-l">{t.label}</span>
          </button>
        ))}
      </div>
      <label className="field">
        <span>Name on the card</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name" />
      </label>
      <label className="field">
        <span>
          Years at this work <b>{years}</b>
        </span>
        <input type="range" min={0} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} />
      </label>
      <div className="field">
        <span>Best at</span>
        <div className="chips">
          {SKILLS[trade].map((k) => (
            <button key={k} type="button" className={skills.includes(k) ? 'on' : ''} aria-pressed={skills.includes(k)} onClick={() => toggle(skills, setSkills, k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Speaks</span>
        <div className="chips">
          {LANGS.slice(0, 8).map((k) => (
            <button key={k} type="button" className={langs.includes(k) ? 'on' : ''} aria-pressed={langs.includes(k)} onClick={() => toggle(langs, setLangs, k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Proof of work · photos and your voice</span>
        <div className="proof">
          {photos.map((p, i) => (
            <button key={p.src} type="button" className="photo" onClick={() => setPhotos(photos.filter((_, k) => k !== i))} aria-label="Remove photo">
              <img src={p.src} alt="" />
            </button>
          ))}
          {photos.length < 3 && (
            <label className="photo add" aria-label="Add a photo of your work">
              <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
              <span aria-hidden="true">+</span>
            </label>
          )}
        </div>
        <Voice url={voice} onDone={setVoice} />
      </div>
      <div className="tool-actions">
        <button type="button" className="btn btn-clay" onClick={download}>
          Download work card
        </button>
        <span className="hint">It floats beside the vase. Drag to turn it.</span>
      </div>
    </div>
  )
}

/* ---------- Γ · Themis: weigh an offer ---------- */

export function OfferTool() {
  const [o, setO] = useState(PRESETS.doubt)
  const [why, setWhy] = useState(true)
  const res = useMemo(() => weighOffer(o), [o])
  const set = (patch) => setO((x) => ({ ...x, ...patch }))
  useEffect(() => {
    hall.offer = { fair: res.fair, risk: res.risk }
  }, [res])
  return (
    <div className="tool">
      <div className="presets">
        <span>Try</span>
        <button type="button" onClick={() => setO(PRESETS.fair)}>a fair offer</button>
        <button type="button" onClick={() => setO(PRESETS.doubt)}>a doubtful one</button>
        <button type="button" onClick={() => setO(PRESETS.scam)}>a scam</button>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Trade</span>
          <select value={o.trade} onChange={(e) => set({ trade: e.target.value })}>
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Pay a day</span>
          <span className="money">
            ₹<input type="number" inputMode="numeric" min={0} step={50} value={o.pay} onChange={(e) => set({ pay: Number(e.target.value) })} />
          </span>
        </label>
        <label className="field">
          <span>
            Hours a day <b>{o.hours}</b>
          </span>
          <input type="range" min={4} max={14} value={o.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Fee asked first</span>
          <span className="money">
            ₹<input type="number" inputMode="numeric" min={0} step={500} value={o.fee} onChange={(e) => set({ fee: Number(e.target.value) })} />
          </span>
        </label>
      </div>
      <Seg value={o.payday} onChange={(v) => set({ payday: v })} label="When paid" options={[['daily', 'Paid daily'], ['weekly', 'Weekly'], ['end', 'At the end']]} />
      <div className="toggles">
        <Toggle on={o.address} onChange={(v) => set({ address: v })}>Site address given</Toggle>
        <Toggle on={o.written} onChange={(v) => set({ written: v })}>Terms in writing</Toggle>
        <Toggle on={o.verified} onChange={(v) => set({ verified: v })}>Employer verified</Toggle>
      </div>
      <div className={`verdict tone-${res.verdict.tone}`} aria-live="polite">
        <p className="verdict-word">{res.verdict.word}</p>
        <p className="verdict-line">{res.verdict.line}</p>
        <button type="button" className="link" onClick={() => setWhy(!why)} aria-expanded={why}>
          {why ? 'Hide the weights' : 'Show the weights'}
        </button>
        {why && (
          <ul className="weights">
            {res.tokens.map((t) => (
              <li key={t.id} className={t.side}>
                {t.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ---------- Δ · Athena: rights ---------- */

export function RightsTool() {
  const [mode, setMode] = useState('schemes')
  const [a, setA] = useState({ age: 34, work: 'construction', income: 'low', aadhaar: true, bank: true, epf: false })
  const [w, setW] = useState({ employer: 'Sai Constructions', days: 6, rate: 950, ready: false })
  const res = useMemo(() => matchSchemes(a), [a])
  const owed = (Number(w.days) || 0) * (Number(w.rate) || 0)
  return (
    <div className="tool">
      <Seg value={mode} onChange={setMode} label="What you need" options={[['schemes', 'Schemes for me'], ['wages', 'Unpaid wages']]} />
      {mode === 'schemes' ? (
        <>
          <div className="form-grid">
            <label className="field">
              <span>
                Age <b>{a.age}</b>
              </span>
              <input type="range" min={14} max={75} value={a.age} onChange={(e) => setA({ ...a, age: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Work</span>
              <select value={a.work} onChange={(e) => setA({ ...a, work: e.target.value })}>
                <option value="construction">Building work</option>
                <option value="vending">Street vending</option>
                <option value="domestic">Housework, cleaning</option>
                <option value="other">Loading, other</option>
              </select>
            </label>
          </div>
          <Seg value={a.income} onChange={(v) => setA({ ...a, income: v })} label="Monthly income" options={[['low', 'Under ₹15,000 a month'], ['high', 'More']]} />
          <div className="toggles">
            <Toggle on={a.aadhaar} onChange={(v) => setA({ ...a, aadhaar: v })}>I have Aadhaar</Toggle>
            <Toggle on={a.bank} onChange={(v) => setA({ ...a, bank: v })}>I have a bank account</Toggle>
            <Toggle on={a.epf} onChange={(v) => setA({ ...a, epf: v })}>I have PF or ESIC</Toggle>
          </div>
          <ul className="schemes">
            {res.todo.map((t) => (
              <li key={t.id} className="todo">
                <b>First</b>
                <span>{t.label}</span>
              </li>
            ))}
            {res.yes.map((s) => (
              <li key={s.id}>
                <b>{s.name}</b>
                <span>{s.what}</span>
                <span className="need">Bring · {s.need.join(' · ')}</span>
                <span className="where">Where · {s.where}</span>
              </li>
            ))}
            {res.yes.length === 0 && <li>Nothing matches yet. Ask at a Common Service Centre: there may be state schemes too.</li>}
          </ul>
        </>
      ) : (
        <>
          <div className="form-grid">
            <label className="field">
              <span>Who hired you</span>
              <input value={w.employer} onChange={(e) => setW({ ...w, employer: e.target.value, ready: false })} />
            </label>
            <label className="field">
              <span>Agreed a day</span>
              <span className="money">
                ₹<input type="number" inputMode="numeric" min={0} step={50} value={w.rate} onChange={(e) => setW({ ...w, rate: Number(e.target.value), ready: false })} />
              </span>
            </label>
          </div>
          <label className="field">
            <span>
              Days unpaid <b>{w.days}</b>
            </span>
            <input type="range" min={1} max={30} value={w.days} onChange={(e) => setW({ ...w, days: Number(e.target.value), ready: false })} />
          </label>
          <ol className="claim">
            <li>
              <b>Your record</b> The days you checked in at this site are already on Ergon.
            </li>
            <li>
              <b>A reminder in your name</b> {w.employer || 'The employer'} gets a dated message asking for {money(owed)}.
            </li>
            <li>
              <b>After 7 days</b> Your claim and record go to your state labour department’s grievance desk. A union or CSC can help you file.
            </li>
            <li>
              <b>Help</b> e-Shram helpline 14434, to register and find the right office.
            </li>
          </ol>
          {!w.ready ? (
            <button type="button" className="btn btn-clay btn-wide" onClick={() => setW({ ...w, ready: true })}>
              Prepare my claim for {money(owed)}
            </button>
          ) : (
            <div className="claim-ready">
              <p>
                Claim ready: {w.days} days unpaid by {w.employer || 'the employer'}, {money(owed)} owed.
              </p>
              <Listen label="सुनिए" lines={() => [[`${w.days} दिन की मज़दूरी बाकी है। कुल ${owed} रुपये।`, 'hi-IN']]} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

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
          <dt>Vouched jobs</dt>
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
