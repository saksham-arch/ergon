import SceneBoundary from '../ui/SceneBoundary.jsx'
import FrameBudget from '../ui/FrameBudget.jsx'
import {useI18n} from '../i18n/index.jsx'
// The hall's DOM layer: a tall scroll track with a sticky stage holding the
// WebGL gallery and the copy. One rAF loop reads the scroll and writes `hall`
// plus a few styles directly; React state only changes when a chapter, hover
// or selection does.
//
// Each chapter is kept by a god and carries a working tool. The tools feed
// the 3D world beside them (the bronze tablet, Themis' balance).

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import VaseScene from './VaseScene.jsx'
import { FIGURES, RECORDS } from './data.js'
import { T, chapterAt, clamp, hall, span } from './hall.js'
import { CardTool, JobsTool, OfferTool, Record, RightsTool } from './tools.jsx'
import { agora } from '../agora/state.js'
import Listen from '../ui/Listen.jsx'
import { throwOne } from './exhibits/Offerings.jsx'

const NUMERALS = ['Α', 'Β', 'Γ', 'Δ']

const CHAPTERS = [
  {
    side: 'right',
    god: 'Hermes',
    emblem: '/art/gods/hermes.jpg',
    kicker: 'Find work',
    title: <>Work nearby.<br />Terms up front.</>,
    hi: 'आस-पास का काम, मज़दूरी पहले से तय।',
    body: 'Daily, weekly and longer jobs near the naka you already stand at. Pay, hours and distance come first, before anything else.',
    say: [['आस-पास का काम, मज़दूरी पहले से तय। दूरी, समय और रोज़ की मज़दूरी सबसे पहले दिखती है।', 'hi-IN']],
    tool: <JobsTool />,
  },
  {
    side: 'left',
    god: 'Hephaestus',
    emblem: '/art/gods/hephaestus.jpg',
    kicker: 'Show your skill',
    title: <>Your hands<br />are the résumé.</>,
    hi: 'आपके हाथ ही आपका बायोडाटा हैं।',
    body: 'No forms, no certificates. Choose your trade, say what you do, add a photo of real work. Preview it on the bronze tablet and download it.',
    say: [['आपके हाथ ही आपका बायोडाटा हैं। अपनी भाषा में बोलिए, अपने काम की फ़ोटो जोड़िए।', 'hi-IN']],
    tool: <CardTool />,
  },
  {
    side: 'right',
    god: 'Themis',
    emblem: '/art/gods/themis.jpg',
    kicker: 'Build trust',
    title: <>The terms,<br />before the work.</>,
    hi: 'काम से पहले शर्तें साफ़।',
    body: 'Put any offer on Themis’ scales before you say yes. Pay, hours, payday and address weigh on one side; fees and missing details on the other.',
    say: [['काम से पहले शर्तें साफ़। फ़ीस माँगने वाले विज्ञापनों पर चेतावनी मिलती है।', 'hi-IN']],
    tool: <OfferTool />,
  },
  {
    side: 'left',
    god: 'Athena',
    emblem: '/art/gods/athena.jpg',
    kicker: 'Know your rights',
    title: <>Your rights,<br />in your words.</>,
    hi: 'आपके हक़, आपकी भाषा में।',
    body: 'The schemes meant for you, the papers each one needs and where to go. When pay doesn’t come, a claim with your work record behind it.',
    say: [['आपके हक़, आपकी भाषा में। कौन सी योजना, कौन से काग़ज़, और कहाँ जाना है।', 'hi-IN']],
    tool: <RightsTool />,
  },
]

export default function VaseHall() {
  const {t,lang}=useI18n()
  const [expanded,setExpanded]=useState(-1)
  const [failed,setFailed]=useState(false)
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(m.matches);m.addEventListener('change',changed);return()=>m.removeEventListener('change',changed)},[])
  const sec = useRef()
  const stage = useRef()
  const gl = useRef()
  const tip = useRef()
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { if(active) setLoaded(true) }, [active])
  const [chapter, setChapter] = useState(-1)
  const [hover, setHover] = useState(-1)
  const [selected, setSelected] = useState(-1)
  const recordOpener=useRef(null)
  useEffect(()=>{if(selected>=0){recordOpener.current=document.activeElement;requestAnimationFrame(()=>stage.current?.querySelector('.drawer-close')?.focus({preventScroll:true}))}else if(recordOpener.current?.isConnected){recordOpener.current.focus({preventScroll:true});recordOpener.current=null}},[selected])

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
    let raf = 0
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
      const on = !document.hidden && r.top < vh && r.bottom > 0
      if (on !== lastActive) {
        lastActive = on
        hall.active = on
        setActive(on)
      }
      document.documentElement.classList.toggle('in-hall', r.top < 40 && r.bottom > 40)
      if (!on) return

      for (const f of fades) {
        const editing=f.el.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')
        const a = sec.current.classList.contains('static-hall') || f.el.classList.contains('expanded') || editing ? 1 : Math.round(span(p, f.a, f.b) * 1000) / 1000
        f.el.inert = a <= 0.5
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
      if (hall.grab || e.target.closest('button, a, input, select, label, .panel, .drawer')) return
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

  // Browse the frieze one figure at a time.
  const stepFigure = (dir) => {
    const n = FIGURES.length
    const i = selected < 0 ? (dir > 0 ? 0 : n - 1) : (selected + dir + n) % n
    hall.onSelect?.(i)
  }
  useEffect(() => {
    const key = (e) => {
      if(e.key==='Escape'){setExpanded(-1);hall.onSelect?.(-1);return}
      if (!hall.active || hall.p < T.kept[1] || e.target.closest?.('input, select, textarea, button, a')) return
      if (e.key === 'ArrowRight') stepFigure(1)
      else if (e.key === 'ArrowLeft') stepFigure(-1)
      else if (e.key === 'Escape') {hall.onSelect?.(-1);setExpanded(-1)}
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const goTo = (p) => {
    const r = sec.current.getBoundingClientRect()
    const top = window.scrollY + r.top
    window.scrollTo({ top: top + p * (r.height - window.innerHeight), behavior: 'instant' })
  }

  const hf = hover >= 0 ? FIGURES[hover] : null
  const sel = selected >= 0 ? FIGURES[selected] : null

  return (
    <section id="record" className={`hall ${reduced || failed ? "static-hall" : ""}`} ref={sec} aria-label="Ergon, told on a vase">
      {[['work', T.chapters[0][0] + 0.05], ['craft', T.chapters[1][0] + 0.05], ['trust', T.chapters[2][0] + 0.05], ['rights', T.chapters[3][0] + 0.05], ['coda', T.coda[0] + 0.04]].map(([id, p]) => (
        <span key={id} id={id} className="hall-anchor" style={{ top: `calc(${p} * (100% - 100vh))` }} />
      ))}
      <div className={`hall-stage ${hover >= 0 ? 'pointing' : ''}`} ref={stage}>
        <div className="hall-gl" ref={gl} aria-hidden="true">
          <SceneBoundary onError={()=>setFailed(true)} fallback={<img className="gallery-fallback" src="/art/wall.jpg" alt="Painted Greek gallery"/>}>
          {loaded && !reduced && <Canvas
            shadows
            dpr={[1, 1.25]}
            frameloop="demand"
            camera={{ fov: 30, near: 0.1, far: 80, position: [0, 8.8, 2.4] }}
            gl={{ antialias: false, powerPreference: 'default', stencil: false }}
          >
            <FrameBudget active={active} />
            <VaseScene />
          </Canvas>}
          </SceneBoundary>
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
          <article key={c.kicker} className={`panel ${c.side} ${expanded===i?"expanded":""}`} data-a={T.chapters[i][0] + 0.01} data-b={T.chapters[i][1] - 0.004}>
            <p className="panel-kicker">
              <span className="medallion" aria-hidden="true">
                <img src={c.emblem} alt="" />
              </span>
              <span className="numeral">{NUMERALS[i]}</span>
              {t(['work','craft','trust','rights'][i])}
              <span className="panel-god">· kept by {c.god}</span>
            </p>
            <h2 className="panel-title">{lang==='hi'?c.hi:c.title}</h2>
            <button className="link expand-tool" aria-expanded={expanded===i} onClick={()=>setExpanded(expanded===i?-1:i)}>{expanded===i?(lang==='hi'?'वापस फूलदान पर':'Return to the vase'):(lang==='hi'?'साधन बड़ा करें':'Expand this tool')}</button>
            <p className="panel-hi" lang="hi">{c.hi}</p>
            <p className="panel-body">{c.body}</p>
            <Listen lines={c.say} />
            {c.tool}
          </article>
        ))}

        <div className="coda" data-a={T.coda[0] + 0.01} data-b={1.2}>
          <h2 className="coda-title">Every day of work,<br />kept.</h2>
          <p className="coda-sub">Turn the vase. Touch a worker to open their record, or tap the gallery to throw your own day of work into it.</p>
          <div className="coda-actions">
            <button type="button" className="btn btn-ghost" onClick={() => throwOne()}>Throw a day of work</button>
            <button type="button" className="btn btn-clay" onClick={() => agora.show('all')}>I’m looking for work</button>
            <a className="btn btn-ghost" href="#trust">Check an offer</a>
          </div>
        </div>

        <nav className="rail" aria-label="Chapters" data-a={0.001} data-b={T.coda[0] + 0.02}>
          {NUMERALS.map((n, i) => (
            <button key={n} type="button" className={chapter === i ? 'on' : ''} aria-current={chapter === i ? 'step' : undefined} onClick={() => goTo(T.chapters[i][0] + 0.05)} aria-label={`Chapter ${n}: ${CHAPTERS[i].kicker}`}>
              <span>{n}</span>
              <em>{t(['work','craft','trust','rights'][i])}</em>
            </button>
          ))}
        </nav>

        {/* The frieze, as a strip you can browse: every figure is a record. */}
        <nav className="frieze-nav" data-a={T.kept[1] - 0.01} data-b={1.2} aria-label="Figures on the frieze">
          <button type="button" className="fn-step" onClick={() => stepFigure(-1)} aria-label="Previous figure">
            ‹
          </button>
          {FIGURES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className={`fn-fig ${selected === i ? 'on' : ''}`}
              onClick={() => hall.onSelect?.(selected === i ? -1 : i)}
              onPointerEnter={() => {
                hall.hover = i
                setHover(i)
              }}
              onPointerLeave={() => {
                hall.hover = -1
                setHover(-1)
              }}
              aria-label={`${f.trade}: open record`}
              aria-pressed={selected === i}
            >
              <span className="fn-disc" style={{ backgroundImage: `url(${f.src})` }} />
              <em>{f.trade}</em>
            </button>
          ))}
          <button type="button" className="fn-step" onClick={() => stepFigure(1)} aria-label="Next figure">
            ›
          </button>
          <span className="fn-hint">Drag the vase to turn it · ← → to browse</span>
        </nav>

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
              <Record id={sel.id} onMap />
              <div className="drawer-actions">
                <button type="button" className="btn btn-clay btn-sm" onClick={() => agora.show('all')}>View sample work nearby</button>
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
