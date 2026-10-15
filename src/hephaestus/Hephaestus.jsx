// II · Hephaestus: your craft. Build a record of skill without a résumé:
// pick a trade, say who you are, choose skills, add photos of real work and
// a spoken intro. Three strikes set it in bronze; quench it and it goes into
// a glass case, and you can download the card.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import ForgeScene from './ForgeScene.jsx'
import { CARD_H, CARD_W, LANGS, SKILLS, drawCard, plate, PLATES } from './card.js'
import { TRADES, tradeOf } from '../hermes/jobs.js'
import { canvas, whenFonts } from '../gl/tex.js'
import { useActive } from '../gl/useActive.js'
import GodHeader from '../ui/GodHeader.jsx'

const STEPS = [
  { id: 'trade', label: 'Trade' },
  { id: 'you', label: 'You' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Your work' },
]
const NEED = 3

function Voice({ url, onDone }) {
  const [state, setState] = useState('idle') // idle | rec | denied
  const rec = useRef(null)
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
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return null
  return (
    <div className="voice-row">
      <button
        type="button"
        className={`voice ${state}`}
        onClick={() => (state === 'rec' ? rec.current?.stop() : start())}
      >
        <span className="voice-wave" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ '--k': i }} />
          ))}
        </span>
        {state === 'rec' ? 'Recording… tap to stop' : state === 'denied' ? 'Microphone blocked' : url ? 'Record again' : 'Speak about your work'}
      </button>
      {url && <audio src={url} controls className="voice-play" />}
    </div>
  )
}

export default function Hephaestus() {
  const frame = useRef()
  const active = useActive(frame)
  const [step, setStep] = useState('trade')
  const [trade, setTrade] = useState('mason')
  const [name, setName] = useState('Sunita Devi')
  const [years, setYears] = useState(11)
  const [langs, setLangs] = useState(['Hindi', 'Marathi'])
  const [skills, setSkills] = useState(['Brickwork', 'Plaster'])
  const [photos, setPhotos] = useState([])
  const [voice, setVoice] = useState(null)
  const [strikes, setStrikes] = useState(0)
  const [kept, setKept] = useState(false)
  const [caseOpen, setCaseOpen] = useState(false)
  const [quenchId, setQuenchId] = useState(0)
  const [version, setVersion] = useState(0)
  const [nudge, setNudge] = useState('')

  const card = useMemo(() => canvas(CARD_W, CARD_H), [])
  const forged = strikes >= NEED
  const heat = kept ? 0 : strikes === 0 ? 0.15 : Math.min(1, 0.4 + strikes * 0.2)

  // Redraw the tablet whenever the record changes.
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
        forged: kept,
        plate: plate(trade, draw),
      })
      setVersion((v) => v + 1)
    }
    whenFonts().then(draw)
    return () => {
      alive = false
    }
  }, [card, name, trade, years, skills, langs, photos, voice, kept])

  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const strike = () => {
    if (kept) return
    if (!name.trim()) {
      setStep('you')
      setNudge('Put your name on it first.')
      return
    }
    setNudge('')
    setStrikes((n) => n + 1)
  }

  const quench = () => {
    setQuenchId((q) => q + 1)
    setTimeout(() => setKept(true), 500)
  }

  const download = () =>
    card.toBlob((b) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `ergon-${(name || 'work-card').toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    })

  const addPhotos = (files) => {
    const next = [...files].slice(0, 3 - photos.length).map((f) => {
      const im = new Image()
      im.src = URL.createObjectURL(f)
      im.onload = () => setPhotos((p) => [...p])
      return im
    })
    setPhotos((p) => [...p, ...next].slice(0, 3))
  }

  return (
    <section className="act act-dark" id="hephaestus" aria-labelledby="heph-title">
      <GodHeader
        id="heph-title"
        n="II"
        god="Hephaestus"
        role="smith of the gods, patron of every craft"
        emblem="/art/gods/hephaestus.jpg"
        title={
          <>
            Your hands, <em>set in bronze.</em>
          </>
        }
        sub="No forms, no résumé. Choose your trade, say your skills, add photos of a wall you plastered and a few words in your own voice. Three strikes and it’s yours: a work card every employer on Ergon can see, and vouch for after each job."
      />

      <div className="studio studio-forge" ref={frame}>
        <div className="studio-gl">
          <Canvas shadows dpr={[1, 1.6]} frameloop={active ? 'always' : 'never'} camera={{ fov: 35, position: [1, 3.05, 7.8], near: 0.1, far: 60 }}>
            <ForgeScene
              card={card}
              version={version}
              strikes={strikes}
              heat={heat}
              kept={kept}
              caseOpen={caseOpen}
              quenchId={quenchId}
              onStrike={strike}
              onCase={() => kept && setCaseOpen((o) => !o)}
            />
          </Canvas>
        </div>
        <div className="studio-line" aria-hidden="true" />

        {!kept ? (
          <div className="bench" key={step}>
            {step === 'trade' && (
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
                  >
                    <span className="medal" style={{ backgroundImage: `url(${PLATES[t.id]})` }} />
                    <span className="medal-l">{t.label}</span>
                    <span className="medal-hi" lang="hi">{t.hi}</span>
                  </button>
                ))}
              </div>
            )}
            {step === 'you' && (
              <div className="bench-grid">
                <label className="field">
                  <span>Name on the card</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name" />
                </label>
                <label className="field">
                  <span>
                    Years at this work · <b>{years}</b>
                  </span>
                  <input type="range" min={0} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} />
                </label>
                <div className="field field-wide">
                  <span>Languages you speak</span>
                  <div className="tick-row">
                    {LANGS.map((l) => (
                      <button key={l} type="button" className={langs.includes(l) ? 'on' : ''} onClick={() => toggle(langs, setLangs, l)}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {step === 'skills' && (
              <div className="field field-wide">
                <span>What you do best, as a {tradeOf(trade).label.toLowerCase()}</span>
                <div className="tick-row">
                  {SKILLS[trade].map((k) => (
                    <button key={k} type="button" className={skills.includes(k) ? 'on' : ''} onClick={() => toggle(skills, setSkills, k)}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 'work' && (
              <div className="bench-grid">
                <div className="field">
                  <span>Photos of your work · up to 3</span>
                  <div className="photos">
                    {photos.map((p, i) => (
                      <button key={p.src} type="button" className="photo" onClick={() => setPhotos(photos.filter((_, k) => k !== i))} aria-label="Remove photo">
                        <img src={p.src} alt="" />
                      </button>
                    ))}
                    {photos.length < 3 && (
                      <label className="photo add">
                        <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
                        <span aria-hidden="true">+</span>
                      </label>
                    )}
                  </div>
                </div>
                <div className="field">
                  <span>A few words, in your voice</span>
                  <Voice url={voice} onDone={setVoice} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bench bench-kept">
            <p className="kept-k">Kept in bronze</p>
            <p className="kept-t">
              {name}’s record is in the case. Employers see it before they hire, and every finished job adds a vouch.
            </p>
            <p className="kept-hint">Touch the glass to open it, then turn the tablet by hand.</p>
            <div className="kept-actions">
              <button type="button" className="btn btn-ink" onClick={download}>
                Download card
              </button>
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  setKept(false)
                  setCaseOpen(false)
                  setStrikes(0)
                }}
              >
                Back to the anvil
              </button>
            </div>
          </div>
        )}

        <div className="toolbar">
          <div className="steps" role="tablist" aria-label="Build your record">
            {STEPS.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={step === s.id} className={step === s.id && !kept ? 'on' : ''} disabled={kept} onClick={() => setStep(s.id)}>
                <em>{['α', 'β', 'γ', 'δ'][i]}</em>
                {s.label}
              </button>
            ))}
          </div>
          <div className="forge-actions">
            {nudge && <span className="nudge">{nudge}</span>}
            <span className="strikes" aria-label={`${Math.min(strikes, NEED)} of ${NEED} strikes`}>
              {Array.from({ length: NEED }, (_, i) => (
                <i key={i} className={i < strikes ? 'on' : ''} />
              ))}
            </span>
            {!forged || kept ? (
              <button type="button" className="btn btn-fire" onClick={strike} disabled={kept}>
                Strike
              </button>
            ) : (
              <button type="button" className="btn btn-fire" onClick={quench}>
                Quench &amp; keep
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
