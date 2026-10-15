// Read aloud, for anyone who would rather listen than read.
import { useState } from 'react'

export function speak(lines) {
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

export default function Listen({ lines, label = 'सुनिए · Listen', className = '' }) {
  const [on, setOn] = useState(false)
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  return (
    <button
      type="button"
      className={`listen ${on ? 'on' : ''} ${className}`}
      aria-pressed={on}
      onClick={() => {
        if (on) {
          window.speechSynthesis.cancel()
          setOn(false)
          return
        }
        setOn(true)
        speak(typeof lines === 'function' ? lines() : lines)
        const tick = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setOn(false)
            clearInterval(tick)
          }
        }, 300)
      }}
    >
      <span className="listen-bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      {on ? 'Stop' : label}
    </button>
  )
}
