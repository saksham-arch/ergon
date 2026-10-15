// Act one, the page side: a tall scroll track holding a framed, sticky canvas.
// Scrolling pushes; the title sits over the opening shot and gives way to the
// ribbon and stelae once the climb begins. Under the frame, the three acts.

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import HeroScene from './HeroScene.jsx'
import { CLIMB } from '../hill.js'
import { climb } from './climb.js'
import { input } from './terrain.js'

const HOLD = 900 // scroll past the summit before the next act

const ACTS = [
  { n: 'I', title: 'Find work', god: 'Hermes · messenger', href: '#hermes' },
  { n: 'II', title: 'Your craft', god: 'Hephaestus · maker', href: '#hephaestus' },
  { n: 'III', title: 'Your rights', god: 'Themis · justice', href: '#themis' },
]

export default function HeroClimb() {
  const sec = useRef()
  const frame = useRef()
  const [awake, setAwake] = useState(true)

  useEffect(() => {
    let raf = 0
    let lastAwake = true
    const root = document.documentElement
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const r = sec.current.getBoundingClientRect()
      const u = Math.max(0, Math.min(CLIMB + HOLD, -r.top))
      input.u = u
      const hero = Math.max(0, 1 - u / 340)
      root.style.setProperty('--hero', hero.toFixed(3))
      root.style.setProperty('--climb', Math.min(1, u / CLIMB).toFixed(4))
      root.classList.toggle('climbing', u > 40 && u < CLIMB + 200)
      root.classList.toggle('slipping', climb.slip > 12 && !climb.ball.released)
      const on = r.bottom > -200
      if (on !== lastAwake) {
        lastAwake = on
        setAwake(on)
      }
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section id="top" className="climb" ref={sec} style={{ height: `calc(${CLIMB + HOLD}px + 100vh)` }} aria-labelledby="hero-title">
      <div className="climb-stage">
        <div
          className="frame"
          ref={frame}
          onPointerMove={(e) => {
            const r = frame.current.getBoundingClientRect()
            input.nx = ((e.clientX - r.left) / r.width) * 2 - 1
            input.ny = -(((e.clientY - r.top) / r.height) * 2 - 1)
          }}
          onPointerLeave={() => {
            input.nx = 0
            input.ny = 0
          }}
        >
          <div className="frame-gl" aria-hidden="true">
            <Canvas shadows dpr={[1, 1.6]} frameloop={awake ? 'always' : 'never'} camera={{ fov: 32, near: 0.1, far: 1000, position: [-1, 4, 14] }}>
              <HeroScene />
            </Canvas>
          </div>
          <div className="frame-line" aria-hidden="true" />

          <p className="corner tl">
            <i aria-hidden="true" />A record for every hand
          </p>
          <p className="corner tr">Inspired by myth · built for people</p>

          <div className="hero-copy">
            <p className="hero-kicker">01 — The everyday climb</p>
            <h1 id="hero-title" className="hero-title">
              Every day,
              <br />
              <em>uphill.</em>
            </h1>
            <p className="hero-lede">
              For the masons, painters and electricians who wait at the naka each morning. Find work nearby, keep a record of your
              skill, and know what you’re owed.
            </p>
            <p className="hero-hi" lang="hi">
              हर दिन की मेहनत का हिसाब।
            </p>
            <div className="hero-actions">
              <a href="#hermes" className="btn btn-cream">
                Find your next work <span aria-hidden="true">↗</span>
              </a>
              <a href="#hephaestus" className="btn btn-glass">
                I’m looking to hire <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <p className="corner bl">
            <span className="scroll-cue" aria-hidden="true" />
            <span className="cue-a">Scroll to push</span>
            <span className="cue-b">Stop, and it rolls back</span>
          </p>
          <p className="corner bc">An ode to the people who build</p>
          <p className="corner br">A living canvas · WebGL</p>
          <div className="climb-bar" aria-hidden="true">
            <i />
          </div>
        </div>

        <nav className="acts" aria-label="The three acts">
          {ACTS.map((a) => (
            <a key={a.n} href={a.href}>
              <span className="acts-n">{a.n}.</span>
              <span className="acts-t">
                {a.title}
                <small>{a.god}</small>
              </span>
              <span className="acts-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  )
}
