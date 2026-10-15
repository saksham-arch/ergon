// The agora: out of the museum and into the real city. A live street map
// (OpenStreetMap data, recoloured in the vase's clay and slip), terracotta 3D
// buildings, a glass flower for every job standing on its actual street, and
// you as a black-figure worker you can drag to your naka. The ring is how far
// you'll walk. Everything a worker needs to decide sits in one sheet: pay,
// hours, distance, who's hiring and whether they're verified.

import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createFlowerLayer } from './flowers.js'
import { greekify } from './style.js'
import { agora } from './state.js'
import { JOBS, KINDS, TRADES, money, payLine, tradeOf } from '../hermes/jobs.js'
import Listen from '../ui/Listen.jsx'

maplibregl.setWorkerUrl(workerUrl)

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const ANDHERI = [72.8697, 19.1136]
const UNIT_KM = 0.75
const REACH = [
  { km: 2, label: '2 km' },
  { km: 4, label: '4 km' },
  { km: 7, label: '7 km' },
]

const kmToLng = (km, lat) => km / (111.32 * Math.cos((lat * Math.PI) / 180))
const kmToLat = (km) => km / 110.57

function haversine([a, b], [c, d]) {
  const R = 6371
  const dLat = ((d - b) * Math.PI) / 180
  const dLng = ((c - a) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((b * Math.PI) / 180) * Math.cos((d * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function circle([lng, lat], km, n = 96) {
  const ring = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    ring.push([lng + kmToLng(Math.cos(a) * km, lat), lat + kmToLat(Math.sin(a) * km)])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }
}

// You, as a figure from the vase's frieze.
function meElement() {
  const el = document.createElement('div')
  el.className = 'me'
  el.innerHTML = `<span class="me-pulse"></span><span class="me-disc" style="background-image:url(/art/electrician.jpg)"></span><span class="me-tag">You · your naka</span>`
  return el
}

export default function Agora() {
  const box = useRef()
  const sec = useRef()
  const dawn = useRef()
  const head = useRef()
  const mapRef = useRef()
  const layerRef = useRef()
  const meRef = useRef()
  const stateRef = useRef()
  const [nearby, setNearby] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [anchor] = useState(ANDHERI)
  const [me, setMe] = useState([ANDHERI[0] + kmToLng(-0.45, ANDHERI[1]), ANDHERI[1] + kmToLat(-0.22)])
  const [trade, setTrade] = useState(agora.trade)
  const [kind, setKind] = useState('all')
  const [km, setKm] = useState(4)
  const [selected, setSelected] = useState(null)
  const [hover, setHover] = useState(null)
  const [sent, setSent] = useState(() => new Set())
  const [geo, setGeo] = useState('idle') // idle | asking | here | denied

  // Other parts of the world (the vase's figures, chapter Α) can ask the
  // agora to show a trade.
  useEffect(() => {
    agora.setTrade = (t) => {
      setTrade(t)
      setSelected(null)
    }
    return () => (agora.setTrade = null)
  }, [])

  // Jobs are laid out around the anchor (a demo neighbourhood); on real
  // streets wherever the anchor is.
  const jobs = useMemo(
    () =>
      JOBS.map((j) => {
        const lngLat = [anchor[0] + kmToLng(j.x * UNIT_KM, anchor[1]), anchor[1] - kmToLat(j.z * UNIT_KM)]
        const dist = haversine(me, lngLat)
        const open = (trade === 'all' || j.trade === trade) && (kind === 'all' || j.kind === kind) && dist <= km
        return { ...j, lngLat, dist, open }
      }),
    [anchor, me, trade, kind, km],
  )
  const list = jobs.filter((j) => j.open).sort((a, b) => a.dist - b.dist)
  const sel = jobs.find((j) => j.id === selected)
  stateRef.current = { ...stateRef.current, jobs, selected, hover, sent, me }

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      stateRef.current.active = entry.isIntersecting
      if (entry.isIntersecting) {
        setNearby(true)
        mapRef.current?.resize()
        mapRef.current?.triggerRepaint()
      }
    }, { rootMargin: '300px' })
    observer.observe(sec.current)
    return () => observer.disconnect()
  }, [])

  // Start the map as the city approaches, rather than during the climb.
  useEffect(() => {
    if (!nearby) return
    let map
    try {
      map = new maplibregl.Map({
        container: box.current,
        style: STYLE,
        center: [me[0] + 0.004, me[1] - 0.002],
        zoom: 14.4,
        pitch: 60,
        bearing: -24,
        maxPitch: 75,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      })
    } catch {
      setFailed(true)
      return
    }
    mapRef.current = map
    if (import.meta.env.DEV) window.__agora = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.on('error', (e) => {
      if (!map.isStyleLoaded()) setFailed(true)
      console.warn('[agora]', e?.error?.message || e)
    })
    map.on('load', () => {
      setFailed(false)
      try {
        greekify(map)
      } catch (err) {
        console.warn('[agora] style', err)
      }
      map.addSource('reach', { type: 'geojson', data: circle(me, km) })
      map.addLayer({ id: 'reach-fill', type: 'fill', source: 'reach', paint: { 'fill-color': '#e8b06a', 'fill-opacity': 0.12 } })
      map.addLayer({ id: 'reach-line', type: 'line', source: 'reach', paint: { 'line-color': '#b8782f', 'line-width': 2, 'line-dasharray': [2, 2] } })
      const layer = createFlowerLayer({ read: () => stateRef.current, colorOf: (t) => tradeOf(t).color })
      layerRef.current = layer
      map.addLayer(layer)
      const marker = new maplibregl.Marker({ element: meElement(), draggable: true, anchor: 'bottom' }).setLngLat(me).addTo(map)
      marker.on('drag', () => {
        const p = marker.getLngLat()
        map.getSource('reach')?.setData(circle([p.lng, p.lat], stateRef.current.km ?? 4))
      })
      marker.on('dragend', () => {
        const p = marker.getLngLat()
        setMe([p.lng, p.lat])
      })
      meRef.current = marker
      setReady(true)
    })

    // Flowers are 3D, so they're picked by distance to their stem on screen.
    const pick = (pt) => {
      const layer = layerRef.current
      if (!layer) return null
      const h = layer.screenHeight()
      let best = null
      let bestD = 30
      for (const j of stateRef.current.jobs.filter((job) => job.open)) {
        const b = map.project(j.lngLat)
        const hx = b.x
        const hy = b.y - h * 0.85
        // Distance to the segment from base to head.
        const vx = hx - b.x
        const vy = hy - b.y
        const t = Math.max(0, Math.min(1, ((pt.x - b.x) * vx + (pt.y - b.y) * vy) / (vx * vx + vy * vy || 1)))
        const d = Math.hypot(pt.x - (b.x + vx * t), pt.y - (b.y + vy * t)) - (t > 0.75 ? 14 : 0)
        if (d < bestD) {
          bestD = d
          best = j.id
        }
      }
      return best
    }
    map.on('mousemove', (e) => {
      const id = pick(e.point)
      map.getCanvas().style.cursor = id ? 'pointer' : ''
      setHover((h) => (h === id ? h : id))
    })
    map.on('click', (e) => {
      const id = pick(e.point)
      setSelected(id)
      if (id) {
        const j = stateRef.current.jobs.find((x) => x.id === id)
        map.easeTo({ center: j.lngLat, duration: 900, offset: [140, 80], zoom: Math.max(map.getZoom(), 14.8) })
      }
    })
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby])

  // Scrolling into the agora flies the camera down from above the city to
  // street level; after that the map is yours to move.
  useEffect(() => {
    let raf = 0
    let last = -1
    const smooth = (a, b, v) => {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
      return t * t * (3 - 2 * t)
    }
    const mix = (a, b, t) => a + (b - a) * t
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const el = sec.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (r.top > vh || r.bottom < 0) return
      const q = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const d = reduced ? 1 : smooth(0.04, 0.62, q)
      if (dawn.current) dawn.current.style.opacity = (1 - smooth(0, 0.3, q)).toFixed(3)
      if (head.current) {
        const h = 1 - smooth(0.26, 0.5, q)
        head.current.style.opacity = h.toFixed(3)
        head.current.style.transform = `translate3d(0, ${(-(1 - h) * 40).toFixed(1)}px, 0)`
      }
      const ui = smooth(0.55, 0.78, q)
      el.style.setProperty('--ui', ui.toFixed(3))
      el.classList.toggle('ui-on', ui > 0.5)
      const map = mapRef.current
      if (map && Math.abs(q - last) > 0.0004 && (d < 0.999 || last < 0.62)) {
        const m = stateRef.current.me ?? ANDHERI
        map.jumpTo({
          center: [m[0] + mix(0.02, 0.004, d), m[1] + mix(-0.035, -0.002, d)],
          zoom: mix(11.4, 14.4, d),
          pitch: mix(0, 60, d),
          bearing: mix(32, -24, d),
        })
      }
      last = q
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Keep the ring and the figure in step with state.
  useEffect(() => {
    stateRef.current.km = km
    mapRef.current?.getSource('reach')?.setData(circle(me, km))
    meRef.current?.setLngLat(me)
  }, [me, km, ready])

  const locate = () => {
    if (!navigator.geolocation) return setGeo('denied')
    setGeo('asking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.longitude, pos.coords.latitude]
        setMe(p)
        setGeo('here')
        mapRef.current?.flyTo({ center: p, zoom: 14.6, pitch: 60, duration: 2200 })
      },
      () => setGeo('denied'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const send = (j) => {
    if (sent.has(j.id)) return
    setSent(new Set([...sent, j.id]))
    layerRef.current?.send(me, j)
  }

  const walk = (d) => `${d.toFixed(1)} km · ${Math.max(2, Math.round((d / 4.5) * 60))} min estimated walk`

  return (
    <section className="agora" id="agora" ref={sec} aria-labelledby="agora-title">
      <div className="agora-stage">
      <div className="agora-frame">
        <div className="agora-map" ref={box} aria-label="Map of work nearby" role="region" />
        {/* From a painting of the city at dawn down into the real streets. */}
        <div className="agora-dawn" ref={dawn} aria-hidden="true" />
        <header className="agora-head" ref={head}>
          <p className="agora-kicker">
            <img src="/art/gods/hermes.jpg" alt="" aria-hidden="true" />
            The agora · kept by Hermes
          </p>
          <h2 id="agora-title" className="agora-title">
            Every flower is a day’s work, <span>waiting nearby.</span>
          </h2>
          <p className="agora-sub">
            A real map of the streets around your naka. Scroll down into it, drag yourself to where you stand, and touch a flower to see the
            whole offer before you go.
          </p>
        </header>
        {failed && <p className="agora-fail">The map needs WebGL and a network connection. The list beside it still works.</p>}

        <aside className="sheet ui" aria-label="Work within reach">
          {!sel ? (
            <>
              <div className="sheet-filters">
                <div className="sheet-scroll" role="group" aria-label="Trade">
                  <button type="button" className={trade === 'all' ? 'on' : ''} onClick={() => setTrade('all')}>
                    All
                  </button>
                  {TRADES.map((t) => (
                    <button key={t.id} type="button" className={trade === t.id ? 'on' : ''} onClick={() => setTrade(t.id)} style={{ '--c': t.color }}>
                      <i aria-hidden="true" />
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="sheet-row">
                  <div className="seg" role="group" aria-label="When">
                    <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>
                      Any
                    </button>
                    {KINDS.map((k) => (
                      <button key={k.id} type="button" className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <div className="seg" role="group" aria-label="How far">
                    {REACH.map((r) => (
                      <button key={r.km} type="button" className={km === r.km ? 'on' : ''} onClick={() => setKm(r.km)}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="sheet-demo">Demo listings · Andheri, Mumbai · no employer is contacted</p>
              <p className="sheet-count">
                <b>{list.length}</b> {list.length === 1 ? 'job' : 'jobs'} within {km} km
              </p>
              {list.length === 0 && <p className="sheet-empty">Nothing open here yet. Walk a little further, or try another trade.</p>}
              <ol className="sheet-list">
                {list.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      className={hover === j.id ? 'hot' : ''}
                      onPointerEnter={() => setHover(j.id)}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => {
                        setSelected(j.id)
                        mapRef.current?.easeTo({ center: j.lngLat, duration: 900, offset: [140, 80] })
                      }}
                      style={{ '--c': tradeOf(j.trade).color }}
                    >
                      <span className="row-pay">{money(j.pay)}</span>
                      <span className="row-unit">/ {j.unit}</span>
                      <span className="row-what">{j.title}</span>
                      <span className="row-meta">
                        <i aria-hidden="true" />
                        {tradeOf(j.trade).label} · {j.dist.toFixed(1)} km · {j.start}
                        {sent.has(j.id) ? ' · sent' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="offer-sheet" style={{ '--c': tradeOf(sel.trade).color }}>
              <button type="button" className="sheet-back" onClick={() => setSelected(null)}>
                ‹ All work
              </button>
              <p className="offer-trade">
                <i aria-hidden="true" />
                {tradeOf(sel.trade).label} · <span lang="hi">{tradeOf(sel.trade).hi}</span>
              </p>
              <h3 className="offer-title">{sel.title}</h3>
              <p className="offer-pay">
                {money(sel.pay)}
                <span> / {sel.unit}</span>
              </p>
              <dl className="offer-terms">
                <div>
                  <dt>Starts</dt>
                  <dd>{sel.start}</dd>
                </div>
                <div>
                  <dt>Hours</dt>
                  <dd>{sel.hours}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{sel.days}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{walk(sel.dist)}</dd>
                </div>
                <div className="wide">
                  <dt>Where</dt>
                  <dd>{sel.place}</dd>
                </div>
                <div className="wide">
                  <dt>Bring</dt>
                  <dd>{sel.bring}</dd>
                </div>
              </dl>
              <p className={`offer-trust ${sel.verified ? 'ok' : 'warn'}`}>
                {sel.verified ? `${sel.employer} is verified, with ${sel.hires} hires through Ergon.` : `${sel.employer} isn’t verified yet. Meet somewhere public and agree the rate before starting.`}
              </p>
              <div className="offer-actions">
                <button type="button" className={`btn btn-primary ${sent.has(sel.id) ? 'done' : ''}`} onClick={() => send(sel)} disabled={sent.has(sel.id)}>
                  {sent.has(sel.id) ? 'Word sent · demo interest saved' : 'Try sending word'}
                </button>
                <Listen
                  label="सुनिए"
                  lines={() => [[`${tradeOf(sel.trade).hi} का काम। ${sel.pay} रुपये। ${sel.dist.toFixed(1)} किलोमीटर दूर। ${sel.start}।`, 'hi-IN']]}
                />
              </div>
            </div>
          )}
        </aside>

        <button type="button" className={`locate ui ${geo}`} onClick={locate}>
          <span aria-hidden="true" className="locate-dot" />
          {geo === 'asking' ? 'Finding you…' : geo === 'here' ? 'You’re on the map' : geo === 'denied' ? 'Location blocked · drag yourself instead' : 'Use my location'}
        </button>
      </div>
      </div>
    </section>
  )
}
