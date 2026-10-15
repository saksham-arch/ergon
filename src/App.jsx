import HeroClimb from './hero/HeroClimb.jsx'
import Hermes from './hermes/Hermes.jsx'
import Hephaestus from './hephaestus/Hephaestus.jsx'
import Themis from './themis/Themis.jsx'
import { prefs, usePrefs } from './gl/prefs.js'

function Mark() {
  // A stopped Greek key folded into an E.
  return (
    <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 6h24v6H14v5h14v6H14v5h18v6H8z" />
      <path d="M20 17v6" className="mark-cut" />
    </svg>
  )
}

function Nav() {
  const { painted } = usePrefs()
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#top" className="brand" aria-label="Ergon, home">
          <Mark />
          <span className="brand-text">
            <span className="brand-name">ERGON</span>
            <span className="brand-tag">The record of everyday work</span>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#hermes">
            Find work <span aria-hidden="true">↗</span>
          </a>
          <a href="#hephaestus">Your craft</a>
          <a href="#themis">Your rights</a>
        </nav>
        <div className="nav-right">
          <span className="nav-concept">Concept № 01</span>
          <button type="button" className={`nav-toggle ${painted ? 'on' : ''}`} aria-pressed={painted} onClick={() => prefs.set({ painted: !painted })}>
            Painted <i aria-hidden="true" />
          </button>
          <a href="#hephaestus" className="btn btn-line btn-sm">
            My work card <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-band" aria-hidden="true" />
      <div className="footer-inner">
        <div>
          <p className="footer-brand">ERGON</p>
          <p className="footer-tag">
            ἔργον · <em>work, and the deed done.</em>
          </p>
        </div>
        <div className="footer-cols">
          <div>
            <p className="footer-h">For workers</p>
            <a href="#hermes">Find work nearby</a>
            <a href="#hephaestus">Your work card</a>
            <a href="#themis">Schemes and rights</a>
          </div>
          <div>
            <p className="footer-h">For employers</p>
            <a href="#hermes">Hire nearby</a>
            <a href="#themis">Post fair terms</a>
          </div>
          <div>
            <p className="footer-h">Languages</p>
            <p className="footer-langs" lang="hi">
              हिन्दी · मराठी · தமிழ் · ಕನ್ನಡ · বাংলা · ગુજરાતી · English
            </p>
          </div>
        </div>
      </div>
      <p className="footer-note">© 2026 Ergon · A concept for “Beyond the Waiting Line”. People, jobs and rates on this page are mock data.</p>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <HeroClimb />
        <Hermes />
        <Hephaestus />
        <Themis />
      </main>
      <Footer />
    </>
  )
}
