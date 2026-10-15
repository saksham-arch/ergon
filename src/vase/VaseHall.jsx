// The hall's DOM layer: a tall scroll track with a sticky stage holding the
// descent video, the WebGL vase and the copy. One rAF loop reads the scroll
// and writes `hall` plus a few styles directly; React state only changes when
// a chapter, hover or selection does.

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import VaseScene from './VaseScene.jsx'
import { FIGURES, JOBS, RECORDS, SCHEMES } from './data.js'
import { T, chapterAt, clamp, hall, smooth, span } from './hall.js'

const NUMERALS = ['Α', 'Β', 'Γ', 'Δ']

function speak(lines) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const voices = synth.getVoices()
  for (const [text, lang] of lines) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    const v = voices.find((x) => x.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
    if (v) u.voice = v
    u.rate = 0.95
    synth.speak(u)
  }
}

function Listen({ lines, label = 'सुनिए · Listen' }) {
  const [on, setOn] = useState(false)
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  return (
    <button
      type="button"
      className={`listen ${on ? 'on' : ''}`}
      onClick={() => {
        if (on) {
          window.speechSynthesis.cancel()
          setOn(false)
          return
        }
        setOn(true)
        speak(lines)
        const tick = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setOn(false)
            clearInterval(tick)
          }
        }, 300)
      }}
      aria-pressed={on}
    >
      <span className="listen-bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      {on ? 'Stop' : label}
    </button>
  )
}

/* ---------- Chapter bodies ---------- */

function Jobs() {
  const [range, setRange] = useState('today')
  const [held, setHeld] = useState(-1)
  const shown = range === 'today' ? JOBS : range === 'week' ? JOBS.slice(0, 2) : JOBS.slice(1, 2)
  return (
    <div className="widget">
      <div className="seg" role="tablist" aria-label="When">
        {[['today', 'Today'], ['week', 'This week'], ['long', 'Longer work']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={range === k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="jobs">
        {shown.map((j, i) => (
          <li key={j.what} className={held === i ? 'held' : ''}>
            <div className="job-top">
              <span className="job-pay">{j.pay}</span>
              <span className="job-km">{j.km}</span>
            </div>
            <p className="job-what">{j.what}</p>
            <p className="job-meta">{j.where} · {j.when} · {j.days}</p>
            <div className="job-foot">
              <span className="tag ok">{j.by}</span>
              <button type="button" className="mini" onClick={() => setHeld(held === i ? -1 : i)}>
                {held === i ? 'Held for 30 min' : 'Hold this job'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Record({ id, compact }) {
  const r = RECORDS[id]
  const f = FIGURES.find((x) => x.id === id)
  return (
    <div className={`record ${compact ? 'compact' : ''}`}>
      <div className="record-head">
        <span className="record-greek" aria-hidden="true">{f.greek}</span>
        <div>
          <p className="record-name">{r.name}</p>
          <p className="record-trade">{r.trade}</p>
        </div>
      </div>
      <dl className="record-stats">
        <div><dt>Experience</dt><dd>{r.years}</dd></div>
        <div><dt>Vouched jobs</dt><dd>{r.vouched}</dd></div>
        <div><dt>Day rate</dt><dd>{r.rate}</dd></div>
      </dl>
      <p className="record-note">{r.note}</p>
      <p className="record-meta">{r.place} · {r.langs}</p>
      <p className="record-avail"><span className="dot" />{r.avail}</p>
    </div>
  )
}

function VoiceIntro() {
  const [state, setState] = useState('idle')
  return (
    <button
      type="button"
      className={`voice ${state}`}
      onClick={() => {
        if (state !== 'idle') return
        setState('rec')
        setTimeout(() => setState('done'), 2600)
        setTimeout(() => setState('idle'), 6000)
      }}
    >
      <span className="voice-wave" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--k': i }} />)}
      </span>
      {state === 'idle' ? 'Speak your skills, we write them down' : state === 'rec' ? 'Listening…' : 'Added to the record'}
    </button>
  )
}

function Terms() {
  const [why, setWhy] = useState(false)
  return (
    <div className="widget terms">
      <div className="offer">
        <p className="offer-label">Offer · Plumbing, 3 days</p>
        <dl>
          <div><dt>Pay</dt><dd>₹1,000 / day</dd></div>
          <div><dt>Hours</dt><dd>9 am – 6 pm, 1 hr lunch</dd></div>
          <div><dt>Paid</dt><dd>Daily, by UPI</dd></div>
          <div><dt>Site</dt><dd>Plot 14, Sector 21, Kharghar</dd></div>
        </dl>
        <p className="tag ok">Employer verified · 23 past hires</p>
      </div>
      <div className={`offer flagged ${why ? 'open' : ''}`}>
        <p className="offer-label">Listing · “Urgent, Dubai site work”</p>
        <p className="flag-line">Looks suspicious</p>
        <button type="button" className="mini" onClick={() => setWhy(!why)} aria-expanded={why}>
          {why ? 'Hide reasons' : 'Why?'}
        </button>
        <ul className="reasons" hidden={!why}>
          <li>Asks for a ₹5,000 “registration fee”</li>
          <li>Pay is four times the local rate</li>
          <li>No site address, phone number only</li>
        </ul>
      </div>
    </div>
  )
}

function Schemes() {
  const [open, setOpen] = useState(0)
  return (
    <ul className="schemes">
      {SCHEMES.map((s, i) => (
        <li key={s.name} className={open === i ? 'open' : ''}>
          <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
            <span>{s.name}</span>
            <span className="chev" aria-hidden="true">›</span>
          </button>
          <div className="scheme-body" hidden={open !== i}>
            <p>{s.what}</p>
            <p className="need"><b>Bring</b> {s.need}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

const CHAPTERS = [
  {
    side: 'right',
    kicker: 'Find work',
    title: <>Work nearby.<br />Pay up front.</>,
    hi: 'आस-पास का काम, मज़दूरी पहले से तय।',
    body: 'Daily, weekly and longer jobs within reach of the naka you already stand at. Distance, hours and the day rate come first, in large type, before anything else.',
    say: [['आस-पास का काम, मज़दूरी पहले से तय। दूरी, समय और रोज़ की मज़दूरी सबसे पहले दिखती है।', 'hi-IN']],
    widget: <Jobs />,
  },
  {
    side: 'left',
    kicker: 'Show your skill',
    title: <>Your hands<br />are the résumé.</>,
    hi: 'आपके हाथ ही आपका बायोडाटा हैं।',
    body: 'No forms. Speak about your work in your own language, add photos of a wall you plastered, and every employer who hires you through Ergon can vouch for the job.',
    say: [['आपके हाथ ही आपका बायोडाटा हैं। अपनी भाषा में बोलिए, अपने काम की फ़ोटो जोड़िए।', 'hi-IN']],
    widget: (
      <div className="widget">
        <Record id="mason" compact />
        <VoiceIntro />
      </div>
    ),
  },
  {
    side: 'right',
    kicker: 'Build trust',
    title: <>The terms,<br />before the work.</>,
    hi: 'काम से पहले शर्तें साफ़।',
    body: 'Every offer shows pay, hours, payday and the site address before you agree. Listings that ask for fees or promise too much are flagged, with the reason in plain words.',
    say: [['काम से पहले शर्तें साफ़। फ़ीस माँगने वाले विज्ञापनों पर चेतावनी मिलती है।', 'hi-IN']],
    widget: <Terms />,
  },
  {
    side: 'left',
    kicker: 'Know your rights',
    title: <>Your rights,<br />in your words.</>,
    hi: 'आपके हक़, आपकी भाषा में।',
    body: 'Welfare schemes, the documents each one needs and the nearest place to register, read aloud in your language. When pay doesn’t come, a step-by-step route to complain.',
    say: [['आपके हक़, आपकी भाषा में। कौन सी योजना, कौन से काग़ज़, और कहाँ जाना है।', 'hi-IN']],
    widget: <Schemes />,
  },
]

/* ---------- Hall ---------- */

export default function VaseHall() {
  const sec = useRef()
  const stage = useRef()
  const video = useRef()
  const gl = useRef()
  const tip = useRef()
  const [active, setActive] = useState(false)
  const [chapter, setChapter] = useState(-1)
  const [hover, setHover] = useState(-1)
  const [selected, setSelected] = useState(-1)

  useEffect(() => {
    hall.onHover = setHover
    hall.onSelect = (i) => {
      hall.selected = i
      setSelected(i)
    }
    return () => {
      hall.onHover = hall.onSelect = null
    }
  }, [])

  // Clear a selection when the reader moves to another chapter.
  useEffect(() => {
    hall.selected = -1
    setSelected(-1)
  }, [chapter])

  useEffect(() => {
    const v = video.current
    const ok = () => {
      if (v.duration > 0) hall.hasVideo = true
    }
    const fail = () => (hall.hasVideo = false)
    v.addEventListener('loadeddata', ok)
    v.addEventListener('error', fail)
    if (v.readyState >= 2) ok()
    return () => {
      v.removeEventListener('loadeddata', ok)
      v.removeEventListener('error', fail)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let vt = 0
    let lastCh = -2
    let lastActive = null
    const fades = [...stage.current.querySelectorAll('[data-a]')].map((el) => ({
      el,
      a: Number(el.dataset.a),
      b: Number(el.dataset.b),
      last: -1,
    }))
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const r = sec.current.getBoundingClientRect()
      const vh = window.innerHeight
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1)
      hall.p = p
      hall.vh = vh
      const on = r.top < vh && r.bottom > 0
      if (on !== lastActive) {
        lastActive = on
        hall.active = on
        setActive(on)
      }
      document.documentElement.classList.toggle('in-hall', r.top < 40 && r.bottom > 40)
      if (!on) return

      for (const f of fades) {
        const a = Math.round(span(p, f.a, f.b) * 1000) / 1000
        if (a === f.last) continue
        f.last = a
        f.el.style.opacity = a
        f.el.style.setProperty('--in', a)
        f.el.style.visibility = a > 0.001 ? 'visible' : 'hidden'
        f.el.classList.toggle('live', a > 0.5)
      }

      const ch = chapterAt(p)
      if (ch !== lastCh) {
        lastCh = ch
        setChapter(ch)
      }

      // Scrub the descent film, eased so the frames glide.
      const v = video.current
      if (hall.hasVideo && v.duration) {
        const target = clamp(p / T.handoff[1], 0, 1) * (v.duration - 0.05)
        vt += (target - vt) * 0.18
        if (Math.abs(v.currentTime - vt) > 0.012) v.currentTime = vt
      }
      const glA = hall.hasVideo ? smooth(T.handoff[0], T.handoff[1], p) : 1
      gl.current.style.opacity = glA
      v.style.opacity = hall.hasVideo ? 1 - smooth(T.handoff[0] + 0.02, T.handoff[1], p) : 0
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Pointer: parallax, cursor light, the hover label, and drag-to-turn.
  useEffect(() => {
    const el = stage.current
    const ptr = hall.pointer
    const d = hall.drag
    const move = (e) => {
      const r = el.getBoundingClientRect()
      ptr.x = e.clientX - r.left
      ptr.y = e.clientY - r.top
      ptr.nx = (ptr.x / r.width) * 2 - 1
      ptr.ny = -((ptr.y / r.height) * 2 - 1)
      ptr.inside = true
      if (tip.current) tip.current.style.transform = `translate3d(${ptr.x + 18}px, ${ptr.y + 18}px, 0)`
      if (d.on) {
        const dx = e.clientX - d.x
        d.x = e.clientX
        d.moved += Math.abs(dx)
        d.offset += dx * 0.009
        d.vel = dx * 0.009
      }
    }
    const down = (e) => {
      if (e.target.closest('button, a, .panel, .drawer')) return
      d.on = true
      d.x = e.clientX
      d.moved = 0
      d.vel = 0
      el.classList.add('dragging')
    }
    const up = () => {
      if (!d.on) return
      d.on = false
      el.classList.remove('dragging')
      setTimeout(() => (d.moved = 0), 0)
    }
    const leave = () => (ptr.inside = false)
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    window.addEventListener('pointercancel', up, { passive: true })
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  const goTo = (p) => {
    const r = sec.current.getBoundingClientRect()
    const top = window.scrollY + r.top
    window.scrollTo({ top: top + p * (r.height - window.innerHeight), behavior: 'smooth' })
  }

  const hf = hover >= 0 ? FIGURES[hover] : null
  const sel = selected >= 0 ? FIGURES[selected] : null

  return (
    <section id="record" className="hall" ref={sec} aria-label="Ergon, told on a vase">
      {[['work', T.chapters[0][0] + 0.05], ['rights', T.chapters[3][0] + 0.05], ['coda', T.coda[0] + 0.04]].map(([id, p]) => (
        <span key={id} id={id} className="hall-anchor" style={{ top: `calc(${p} * (100% - 100vh))` }} />
      ))}
      <div className={`hall-stage ${hover >= 0 ? 'pointing' : ''}`} ref={stage}>
        <video
          ref={video}
          className="hall-video"
          src="/media/descent.mp4"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="hall-gl" ref={gl} aria-hidden="true">
          <Canvas
            shadows
            dpr={[1, 1.75]}
            frameloop={active ? 'always' : 'never'}
            camera={{ fov: 30, near: 0.1, far: 80, position: [0, 8.8, 2.4] }}
            gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          >
            <VaseScene />
          </Canvas>
        </div>

        {/* Descent captions */}
        <div className="caption" data-a="0.006" data-b="0.06">
          <p className="cap-kicker">Every evening</p>
          <p className="cap-line">The day’s work<br />rolls back down.</p>
        </div>
        <div className="caption" data-a="0.064" data-b="0.112">
          <p className="cap-line">No contract.<br />No record.</p>
        </div>
        <div className="caption" data-a="0.116" data-b="0.162">
          <p className="cap-line small">Fourteen years of wiring, and nothing<br />to show the next contractor.</p>
        </div>
        <div className="caption" data-a="0.166" data-b="0.214">
          <p className="cap-line">Unless something<br />keeps it.</p>
        </div>

        {/* The reveal */}
        <div className="kept" data-a={T.kept[0] + 0.012} data-b={T.kept[1] - 0.004}>
          <p className="kept-greek">ἔργον · the work, and the deed done</p>
          <h2 className="kept-mark">ergon</h2>
          <p className="kept-line">Where the work is kept.</p>
          <p className="kept-hi" lang="hi">हर दिन की मेहनत का हिसाब।</p>
        </div>

        {CHAPTERS.map((c, i) => (
          <article key={c.kicker} className={`panel ${c.side}`} data-a={T.chapters[i][0] + 0.01} data-b={T.chapters[i][1] - 0.004}>
            <p className="panel-kicker"><span className="numeral">{NUMERALS[i]}</span>{c.kicker}</p>
            <h2 className="panel-title">{c.title}</h2>
            <p className="panel-hi" lang="hi">{c.hi}</p>
            <p className="panel-body">{c.body}</p>
            {c.widget}
            <Listen lines={c.say} />
          </article>
        ))}

        <div className="coda" data-a={T.coda[0] + 0.01} data-b={1.2}>
          <h2 className="coda-title">Every day of work,<br />kept.</h2>
          <p className="coda-sub">Turn the vase. Touch a worker to open their record.</p>
          <div className="coda-actions">
            <a className="btn btn-clay" href="#top">I’m looking for work</a>
            <a className="btn btn-ghost" href="#top">I need someone</a>
          </div>
        </div>

        <nav className="rail" aria-label="Chapters" data-a={T.chapters[0][0] - 0.01} data-b={T.coda[0] + 0.02}>
          {NUMERALS.map((n, i) => (
            <button key={n} type="button" className={chapter === i ? 'on' : ''} onClick={() => goTo(T.chapters[i][0] + 0.05)} aria-label={`Chapter ${n}: ${CHAPTERS[i].kicker}`}>
              <span>{n}</span>
              <em>{CHAPTERS[i].kicker}</em>
            </button>
          ))}
        </nav>

        <p className="drag-hint" data-a={T.kept[1]} data-b={1.2}>
          <span aria-hidden="true">⟲</span> Drag to turn · Touch a figure
        </p>

        <div className={`tip ${hf && !sel ? 'show' : ''}`} ref={tip} aria-hidden="true">
          {hf && (
            <>
              <span className="tip-greek">{hf.greek}</span>
              <span className="tip-trade">{hf.trade}</span>
              <span className="tip-hi" lang="hi">{hf.hi}</span>
            </>
          )}
        </div>

        <aside className={`drawer ${sel ? 'open' : ''}`} aria-live="polite" aria-hidden={!sel}>
          {sel && (
            <>
              <button type="button" className="drawer-close" onClick={() => hall.onSelect?.(-1)} aria-label="Close record">×</button>
              <p className="drawer-kicker">From the frieze</p>
              <Record id={sel.id} />
              <div className="drawer-actions">
                <button type="button" className="btn btn-clay btn-sm">{sel.id === 'sisyphus' ? 'Offer him a day off' : 'Hire for tomorrow'}</button>
                <Listen
                  label="Listen"
                  lines={[[`${RECORDS[sel.id].name}. ${RECORDS[sel.id].trade}. ${RECORDS[sel.id].years}. ${RECORDS[sel.id].note}`, 'en-IN']]}
                />
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
