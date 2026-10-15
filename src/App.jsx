import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import BallScene from './Ball.jsx'
import { bindPointer, engine, measure } from './engine.js'
import { CLIMB, R } from './hill.js'
import VaseHall from './vase/VaseHall.jsx'

// A thin rounded slab: a face over a stack of rounded layers that read as its
// edge once the engine tilts it. `depth` is the edge thickness in px.
function Slab({ as: Tag = 'div', className = '', face = '', depth = 12, radius = 24, edge, style, children, ...rest }) {
  const Inner = Tag === 'p' || Tag === 'span' ? 'span' : 'div'
  const layers = Math.max(3, Math.round(depth / 1.5))
  return (
    <Tag
      className={`slab ${className}`}
      data-slab
      style={{ ...style, '--slab-r': `${radius}px`, ...(edge && { '--edge': edge }) }}
      {...rest}
    >
      <Inner className="slab-body">
        {Array.from({ length: layers }, (_, i) => (
          <Inner
            key={i}
            className="slab-edge"
            style={{ '--z': `${(-(i + 1) * depth) / layers}px`, '--t': (i + 1) / layers }}
            aria-hidden="true"
          />
        ))}
        <Inner className={`slab-face ${face}`}>{children}</Inner>
      </Inner>
    </Tag>
  )
}

const CARD_EDGE = '#d9c6a8'

// A piece of content placed on the hillside. `u` is how far up the climb it
// starts, `place` puts it in the ground under the ridge or in the sky above it.
function Block({ u, w, place = 'ground', gap, origin, hero, className = '', children }) {
  return (
    <div
      className={`block print ${className}`}
      data-place={place}
      data-u={u}
      data-w={w}
      data-gap={gap}
      data-origin={origin}
      data-print={hero ? 'hero' : undefined}
    >
      {children}
    </div>
  )
}

function Title({ u, kicker, children }) {
  return (
    <Block u={u} w={420} className="title-block">
      <p className="kicker ink" style={{ '--i': 0 }}>{kicker}</p>
      <h2 className="title ink" style={{ '--i': 1 }}>{children}</h2>
    </Block>
  )
}

function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#top" className="wordmark" aria-label="Ergon home">ergon</a>
        <nav aria-label="Primary">
          <a href="#wait">The wait</a>
          <a href="#record">The record</a>
          <a href="#rights">Rights</a>
        </nav>
        <a href="#coda" className="btn btn-dark btn-sm">Get Ergon</a>
      </div>
    </header>
  )
}

// Story cards along the climb: the waiting line, then and now.
const STORY = [
  {
    u: 560,
    kicker: '6:30 a.m., any labour naka',
    title: 'They gather at the corner.',
    body: 'Masons, painters, carpenters, electricians. Tools at their feet, watching for a contractor’s car to slow down. By ten, whoever wasn’t picked goes home.',
  },
  {
    u: 980,
    kicker: 'Athens, fifth century BC',
    title: 'The hill of the hired.',
    body: 'Day labourers waited on Kolonos Agoraios, above the marketplace, to be chosen for the day. Twenty-five centuries on, the line looks much the same.',
  },
  {
    u: 1400,
    kicker: 'What gets lost',
    title: 'Fourteen years. No paper.',
    body: 'Skill that was never written down can’t be shown. Every new contractor starts the haggling from zero.',
  },
  {
    u: 2250,
    kicker: 'Who to trust',
    title: 'Terms by word of mouth.',
    body: 'Rate, hours and payday are agreed on the roadside. When the money comes up short, there is nothing to point to.',
  },
  {
    u: 2680,
    kicker: 'What they’re owed',
    title: 'Rights behind a counter.',
    body: 'Pensions, health cover and welfare-board benefits exist for unorganised workers. Finding the right form, office and document is the hard part.',
  },
]

function World() {
  return (
    <div className="world">
      <svg className="hill" aria-hidden="true">
        <defs>
          <linearGradient id="mountain-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d06a38" />
            <stop offset="0.35" stopColor="#c25627" />
            <stop offset="1" stopColor="#8a3417" />
          </linearGradient>
        </defs>
        <path className="mountain" fill="url(#mountain-fill)" />
        <path className="ridge" />
        <path className="ridge-band" />
        <path className="trail-ink trail-smudge" filter="url(#smudge)" />
        <path className="trail-ink trail-line" />
        <g className="splats" />
        {/* Marble Sisyphus: figure.js fills this with rigged statue pieces. */}
        <g className="figure">
          <ellipse className="fig-shadow" rx="96" ry="8" />
        </g>
      </svg>

      <Title u={150} kicker="Before sunrise">The waiting line.<br /><span className="muted">Every city has one.</span></Title>
      {STORY.slice(0, 3).map((c) => (
        <Block key={c.title} u={c.u} w={380}>
          <Slab as="article" className="ink" face="card" depth={12} radius={22} edge={CARD_EDGE}>
            <p className="card-kicker">{c.kicker}</p>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </Slab>
        </Block>
      ))}

      <Title u={1840} kicker="The boulder">Work that leaves<br />no trace.</Title>
      {STORY.slice(3).map((c) => (
        <Block key={c.title} u={c.u} w={380}>
          <Slab as="article" className="ink" face="card" depth={12} radius={22} edge={CARD_EDGE}>
            <p className="card-kicker">{c.kicker}</p>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </Slab>
        </Block>
      ))}

      <Block u={CLIMB - 380} w={760} place="sky" gap={2 * R + 50} origin="bc" className="summit">
        <p className="kicker ink" style={{ '--i': 0 }}>Every evening</p>
        <h2 className="display ink" style={{ '--i': 1 }}>And it rolls<br />back down.</h2>
        <p className="lede ink" style={{ '--i': 2 }}>Tomorrow the line forms again, and nobody remembers yesterday.</p>
      </Block>
    </div>
  )
}

function ReflectToggle() {
  const [state, setState] = useState('off') // off | asking | on | denied
  const stream = useRef(null)

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    engine.cam = null
  }

  useEffect(() => stop, [])

  const toggle = async () => {
    if (state === 'on') {
      stop()
      setState('off')
      return
    }
    setState('asking')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = s
      await video.play()
      stream.current = s
      engine.cam = { video, aspect: video.videoWidth / video.videoHeight || 4 / 3 }
      setState('on')
    } catch {
      setState('denied')
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) return null
  const label = { off: 'Reflect me', asking: 'Waiting for camera…', on: 'Reflecting you', denied: 'Camera unavailable' }[state]
  return (
    <button
      type="button"
      className={`reflect ${state}`}
      onClick={toggle}
      aria-pressed={state === 'on'}
      title="Uses your camera only to draw your reflection in the ball. Nothing is recorded or sent."
    >
      <span className="reflect-orb" aria-hidden="true" />
      {label}
    </button>
  )
}

function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-band" aria-hidden="true" />
      <div className="footer-inner">
        <div>
          <p className="wordmark">ergon</p>
          <p className="footer-tag">Where the work is kept.</p>
        </div>
        <div className="footer-cols">
          <div>
            <p className="footer-h">For workers</p>
            <a href="#record">Find work nearby</a>
            <a href="#record">Your record</a>
            <a href="#rights">Schemes and rights</a>
          </div>
          <div>
            <p className="footer-h">For employers</p>
            <a href="#record">Hire nearby</a>
            <a href="#record">Post fair terms</a>
          </div>
          <div>
            <p className="footer-h">Languages</p>
            <p className="footer-langs" lang="hi">हिन्दी · मराठी · தமிழ் · ಕನ್ನಡ · বাংলা · English</p>
          </div>
        </div>
      </div>
      <p className="footer-note">© 2026 Ergon · A concept for “Beyond the Waiting Line”. Names, jobs and numbers on this page are mock data.</p>
    </footer>
  )
}

export default function App() {
  useEffect(bindPointer, [])

  // The boulder's canvas sleeps once the climb is well off screen.
  const [awake, setAwake] = useState(true)
  useEffect(() => {
    const check = () => {
      setAwake(window.scrollY < CLIMB + 260 + window.innerHeight * 1.3)
      document.documentElement.classList.toggle('past-climb', window.scrollY > CLIMB + 260)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  useEffect(() => {
    let raf = 0
    const remeasure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    remeasure()
    document.fonts?.ready.then(remeasure)
    window.addEventListener('resize', remeasure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', remeasure)
    }
  }, [])

  return (
    <>
      <Nav />
      <svg className="defs" aria-hidden="true">
        <filter id="smudge" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </svg>
      {/* Scrolling this tall element is what pushes the boulder up the hill. */}
      <main id="page">
        <span id="top" className="anchor" data-u="0" />
        <span id="wait" className="anchor" data-u="520" />
        <div className="scene">
          <svg className="range range-far" aria-hidden="true"><path /></svg>
          <svg className="range range-mid" aria-hidden="true"><path /></svg>
          <World />
          <section className="hero-copy" aria-labelledby="hero-title">
            <p className="hero-kicker">Ergon · ἔργον, work</p>
            <h1 id="hero-title" className="hero-title">Every day,<br />uphill.</h1>
            <p className="hero-lede">For the masons, painters and electricians who wait at the naka each morning. Ergon finds nearby work, keeps a record of skill, and explains the rights that come with it.</p>
            <p className="hero-hi" lang="hi">हर दिन की मेहनत का हिसाब।</p>
            <div className="hero-actions">
              <a href="#coda" className="btn btn-dark">Get Ergon <span aria-hidden="true">→</span></a>
              <a href="#wait" className="btn-link">Start the climb <span aria-hidden="true">›</span></a>
            </div>
          </section>
          <p className="scroll-hint" aria-hidden="true">Scroll to push · Stop, and it rolls back</p>
        </div>
      </main>
      <div className="dusk" aria-hidden="true" />
      <VaseHall />
      <Footer />
      <ReflectToggle />
      <div className="stage" aria-hidden="true">
        <Canvas
          frameloop={awake ? 'always' : 'never'}
          orthographic
          camera={{ zoom: 1, position: [0, 0, 1000], near: 1, far: 3000 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
        >
          <BallScene />
        </Canvas>
      </div>
    </>
  )
}
