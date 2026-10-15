import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, CatmullRomCurve3, DoubleSide, MeshStandardMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { hall, T, smooth, mix, clamp } from '../hall.js'

const defaults = [
  { name: 'e-Shram card', need: ['Aadhaar', 'Phone linked to Aadhaar', 'Bank account'] },
  { name: 'Construction welfare board', need: ['Proof of 90 days of building work'] },
  { name: 'PM-SYM pension', need: ['Aadhaar', 'Savings account'] },
  { name: 'PM Suraksha Bima', need: ['Bank account'] },
]
const stop = (e) => e.stopPropagation()
const tube = (points, radius) => new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 32, radius, 8, false)

function paint(canvas, rights) {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e8d6b0'
  ctx.fillRect(0, 0, 900, 1400)
  for (let i = 0; i < 1800; i++) {
    const x = (i * 137.51) % 900
    const y = (i * 23.73) % 1400
    ctx.strokeStyle = i % 3 ? '#98774412' : '#fff4d730'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 30 + i % 170, y + Math.sin(i) * 2)
    ctx.stroke()
  }
  const edge = ctx.createLinearGradient(0, 0, 900, 0)
  edge.addColorStop(0, '#80522466')
  edge.addColorStop(0.08, '#80522400')
  edge.addColorStop(0.92, '#80522400')
  edge.addColorStop(1, '#80522466')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, 900, 1400)
  ctx.fillStyle = '#533a26'
  ctx.font = 'bold 43px Georgia, serif'
  ctx.fillText('ΔΙΚΑΙΑ · What is yours', 62, 110)
  ctx.fillRect(62, 140, 776, 3)
  const entries = rights.length ? rights : defaults
  const font = Math.min(34, 1050 / Math.max(1, entries.reduce((n, r) => n + 2 + (r.need?.length || 0), 0)))
  let y = 205
  for (const item of entries) {
    ctx.font = `bold ${font}px Georgia, serif`
    const lines = (text) => {
      let line = ''
      for (const word of String(text).split(' ')) {
        if (ctx.measureText(`${line} ${word}`).width > 760 && line) {
          ctx.fillText(line, 70, y)
          y += font * 1.3
          line = word
        } else line = line ? `${line} ${word}` : word
      }
      ctx.fillText(line, 70, y)
      y += font * 1.3
    }
    lines(item.name)
    ctx.font = `${font * 0.85}px Georgia, serif`
    for (const need of item.need || []) lines(`· ${need}`)
    y += font * 0.8
  }
}

export default function Owl() {
  const root = useRef()
  const head = useRef()
  const eyes = useRef([])
  const pupils = useRef([])
  const roll = useRef()
  const hit = useRef()
  const motion = useRef({ hover: false, manual: null, open: 0, next: 5, blink: -1, version: null })
  const reduced = useRef(false)
  const assets = useMemo(() => {
    const bronze = new MeshStandardMaterial({ color: '#9a7442', metalness: 0.9, roughness: 0.35 })
    const light = bronze.clone()
    light.color.set('#c29a5e')
    const marble = new MeshStandardMaterial({ color: '#e9e1d3', roughness: 0.48 })
    const eye = new MeshStandardMaterial({ color: '#ffb547', emissive: '#ffb547', emissiveIntensity: 1.8, roughness: 0.2 })
    const black = new MeshStandardMaterial({ color: '#17120f', roughness: 0.22 })
    const sphere = new SphereGeometry(1, 48, 32)
    const body = sphere.clone()
    const pos = body.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const row = Math.acos(clamp(y, -1, 1)) * 12
      const angle = Math.atan2(z, x)
      const scallop = Math.sin(row * Math.PI) ** 2 * (0.5 + 0.5 * Math.cos(angle * 18 + Math.floor(row) * Math.PI))
      const r = 1 + scallop * 0.018
      pos.setXYZ(i, x * r * (1 - y * 0.14), y * r, z * r)
    }
    body.computeVertexNormals()
    const wing = new PlaneGeometry(1, 1, 20, 28)
    const w = wing.attributes.position
    for (let i = 0; i < w.count; i++) {
      const x = w.getX(i)
      const y = w.getY(i)
      w.setXYZ(i, x * Math.sqrt(Math.max(0, 1 - (y * 2) ** 2)), y, 0.13 * (1 - (x * 2) ** 2) + 0.008 * Math.cos(y * 90))
    }
    wing.computeVertexNormals()
    const wingMat = bronze.clone()
    wingMat.side = DoubleSide
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1400
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    const unroll = { value: 0 }
    const paper = new MeshStandardMaterial({ map, side: DoubleSide, roughness: 0.92 })
    paper.onBeforeCompile = (shader) => {
      shader.uniforms.uUnroll = unroll
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uUnroll;')
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          float d = (0.5 - position.y / 1.4) * 1.4;
          float lengthOpen = 1.4 * uUnroll;
          float curled = max(0.0, d - lengthOpen);
          float angle = curled / 0.065;
          transformed.y = -min(d, lengthOpen) - sin(angle) * 0.065;
          transformed.z += (1.0 - cos(angle)) * 0.065;
        `)
        .replace('#include <beginnormal_vertex>', `
          float nd = (0.5 - position.y / 1.4) * 1.4;
          float na = max(0.0, nd - 1.4 * uUnroll) / 0.065;
          vec3 objectNormal = vec3(0.0, sin(na), cos(na));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif
        `)
    }
    const branch = tube([[-0.4, 1.34, 0.08], [-0.1, 1.37, 0.16], [0.2, 1.34, 0.12], [0.48, 1.43, 0.06]], 0.018)
    const toes = [-1, 1].flatMap((side) => [-1, 0, 1].map((n) => tube([[side * 0.12 + n * 0.025, 1.45, 0.08], [side * 0.12 + n * 0.03, 1.37, 0.2], [side * 0.12 + n * 0.03, 1.31, 0.15]], 0.012)))
    return { bronze, light, marble, eye, black, sphere, body, wing, wingMat, canvas, map, paper, unroll, branch, toes }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = query.matches }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => () => {
    for (const resource of Object.values(assets)) resource?.dispose?.()
    assets.toes.forEach((geo) => geo.dispose())
  }, [assets])

  useFrame((state, dt) => {
    const m = motion.current
    const [a, b] = T.chapters[3]
    const p = hall.p
    const reveal = smooth(a, a + 0.03, p) * (1 - smooth(b - 0.03, b, p))
    root.current.visible = hall.active && p > a && p < b
    root.current.position.y = -1.2 - 4.2 * (1 - reveal)
    if (!root.current.visible) {
      m.hover = false
      m.manual = null
    }
    const version = hall.rightsVersion ?? JSON.stringify(hall.rights || defaults).length
    if (version !== m.version) {
      paint(assets.canvas, Array.isArray(hall.rights) ? hall.rights : defaults)
      assets.map.needsUpdate = true
      m.version = version
    }
    const s = reduced.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 9)
    const target = m.manual ?? smooth(a + 0.02, a + 0.08, p)
    m.open = mix(m.open, target, s)
    assets.unroll.value = m.open
    roll.current.position.y = -1.4 * m.open
    hit.current.position.y = -0.7 * m.open
    hit.current.scale.y = Math.max(0.1, m.open)
    const t = state.clock.elapsedTime
    if (t >= m.next) {
      m.blink = t
      m.next = t + 4 + Math.random() * 3
    }
    const blink = t - m.blink
    const squash = blink >= 0 && blink < 0.12 ? Math.max(0.04, Math.abs(blink / 0.06 - 1)) : 1
    const nx = clamp(hall.pointer.nx, -1, 1)
    const ny = clamp(hall.pointer.ny, -1, 1)
    const amplitude = reduced.current ? 0.2 : 1
    head.current.rotation.y = mix(head.current.rotation.y, nx * 0.35 * amplitude, s)
    head.current.rotation.x = mix(head.current.rotation.x, -ny * 0.15 * amplitude, s)
    head.current.position.y = 1.99 + (m.hover && !reduced.current ? Math.sin(t * 9) * 0.016 : 0)
    assets.eye.emissiveIntensity = mix(assets.eye.emissiveIntensity, m.hover ? 3.4 : 1.8, s)
    for (let i = 0; i < 2; i++) {
      eyes.current[i].scale.y = squash
      pupils.current[i].position.x = mix(pupils.current[i].position.x, nx * 0.022, s)
      pupils.current[i].position.y = mix(pupils.current[i].position.y, ny * 0.018, s)
    }
  })

  return (
    <group ref={root} position={[2.35, -5.4, -0.5]} visible={false} onPointerDown={stop} onPointerUp={stop} onPointerMove={stop} onClick={stop}>
      <mesh position={[0, 0.08, 0]} material={assets.marble} receiveShadow castShadow><boxGeometry args={[0.8, 0.16, 0.7]} /></mesh>
      <mesh position={[0, 0.65, 0]} material={assets.marble} castShadow><cylinderGeometry args={[0.23, 0.28, 0.98, 48]} /></mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = i * Math.PI / 8
        return <mesh key={i} position={[Math.cos(a) * 0.245, 0.65, Math.sin(a) * 0.245]} material={assets.marble}><cylinderGeometry args={[0.022, 0.028, 0.87, 8]} /></mesh>
      })}
      {[0.2, 1.12].map((y) => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={assets.marble}><torusGeometry args={[0.27, 0.045, 12, 48]} /></mesh>)}
      {[-1, 1].map((side) => <mesh key={side} position={[side * 0.28, 1.16, 0]} material={assets.marble}><torusGeometry args={[0.09, 0.035, 12, 32, Math.PI * 1.8]} /></mesh>)}
      <mesh position={[0, 1.235, 0]} material={assets.marble} castShadow><boxGeometry args={[0.8, 0.07, 0.64]} /></mesh>
      <group onPointerOver={(e) => { stop(e); motion.current.hover = true }} onPointerOut={(e) => { stop(e); motion.current.hover = false }}>
        <mesh geometry={assets.body} material={assets.bronze} position={[0, 1.68, 0]} scale={[0.25, 0.3, 0.2]} castShadow />
        {[-1, 1].map((side) => <mesh key={side} geometry={assets.wing} material={assets.wingMat} position={[side * 0.225, 1.66, 0.035]} rotation={[0, side * 0.85, side * -0.22]} scale={[0.25, 0.48, 1]} castShadow />)}
        <mesh geometry={assets.sphere} material={assets.bronze} position={[0, 1.42, -0.16]} rotation-x={-0.4} scale={[0.11, 0.19, 0.045]} />
        <group ref={head} position={[0, 1.99, 0.015]}>
          <mesh geometry={assets.sphere} material={assets.bronze} scale={[0.29, 0.225, 0.21]} castShadow />
          {[-1, 1].map((side, i) => (
            <group key={side}>
              <mesh position={[side * 0.21, 0.19, -0.025]} rotation-z={side * -0.25} material={assets.bronze}><coneGeometry args={[0.075, 0.19, 24]} /></mesh>
              <mesh geometry={assets.sphere} material={assets.light} position={[side * 0.125, 0, 0.173]} scale={[0.143, 0.155, 0.045]} />
              <group ref={(el) => { eyes.current[i] = el }} position={[side * 0.125, 0.025, 0.214]}>
                <mesh geometry={assets.sphere} material={assets.eye} scale={[0.071, 0.074, 0.037]} />
                <group ref={(el) => { pupils.current[i] = el }}>
                  <mesh geometry={assets.sphere} material={assets.black} position={[0, 0, 0.035]} scale={[0.03, 0.046, 0.014]} />
                </group>
              </group>
            </group>
          ))}
          <mesh position={[0, -0.07, 0.23]} rotation={[0.5, 0, Math.PI]} material={assets.bronze}><coneGeometry args={[0.043, 0.12, 20]} /></mesh>
          <mesh geometry={assets.sphere} material={assets.bronze} position={[0, -0.035, 0.23]} scale={[0.043, 0.04, 0.05]} />
        </group>
        <mesh geometry={assets.branch} material={assets.bronze} castShadow />
        {assets.toes.map((geo, i) => <mesh key={i} geometry={geo} material={assets.light} />)}
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} geometry={assets.sphere} material={assets.light} position={[-0.36 + i * 0.105, 1.4 + i % 2 * 0.08, 0.1]} rotation-z={i % 2 ? -0.7 : 0.7} scale={[0.025, 0.085, 0.008]} />)}
        {[-1, 1].map((side) => <mesh key={side} geometry={assets.sphere} material={assets.bronze} position={[side * 0.32, 1.35, 0.14]} scale={[0.034, 0.047, 0.032]} />)}
      </group>
      <group position={[-0.87, 2.08, 0.22]} onClick={(e) => { stop(e); motion.current.manual = (motion.current.manual ?? motion.current.open) > 0.5 ? 0 : 1 }}>
        <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, 1.06, 20]} /><meshStandardMaterial color='#55351f' roughness={0.65} /></mesh>
        <mesh material={assets.paper} frustumCulled={false} raycast={() => null}><planeGeometry args={[0.9, 1.4, 8, 240]} /></mesh>
        <mesh ref={roll} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.064, 0.064, 0.91, 32]} /><meshStandardMaterial color='#e8d6b0' roughness={0.92} /></mesh>
        {/* Shader deformation does not move the CPU picking surface. */}
        <mesh ref={hit} position={[0, 0, 0.14]}><planeGeometry args={[0.94, 1.4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} /></mesh>
      </group>
    </group>
  )
}
