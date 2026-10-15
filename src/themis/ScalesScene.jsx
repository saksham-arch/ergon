// Themis' balance in a marble hall. Bronze beam, glass pans, coins for every
// term of an offer (gold for what's fair, red enamel for what's not). The
// beam settles with real spring physics. Her sword stands beside it: touch
// it to start a claim for unpaid wages.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { LatheGeometry, Vector2, Vector3 } from 'three'
import Painterly from '../gl/Painterly.jsx'
import { tex } from '../gl/tex.js'

const PIVOT = 3.45
const L = 1.85
const CHAIN = 1.3

function Backdrop() {
  const map = useMemo(() => tex('/art/hall.jpg'), [])
  return (
    <mesh position={[0.2, 4.3, -10]}>
      <planeGeometry args={[30, 20]} />
      <meshBasicMaterial map={map} fog={false} />
    </mesh>
  )
}

const bronze = <meshStandardMaterial color="#b58b52" metalness={0.95} roughness={0.28} />

function Pillar() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.24, 48]} />
        <meshStandardMaterial color="#ebe3d6" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.2, 48]} />
        <meshStandardMaterial color="#e2d9ca" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 2.9, 24]} />
        {bronze}
      </mesh>
      {[0.6, 1.5, 3.1].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.11, 0.025, 10, 32]} />
          {bronze}
        </mesh>
      ))}
      <mesh position={[0, PIVOT + 0.28, 0]}>
        <sphereGeometry args={[0.13, 32, 16]} />
        {bronze}
      </mesh>
      <mesh position={[0, PIVOT + 0.45, 0]}>
        <coneGeometry args={[0.06, 0.25, 16]} />
        {bronze}
      </mesh>
    </group>
  )
}

function Coin({ tone, at, born }) {
  const ref = useRef()
  useFrame(() => {
    const t = (performance.now() - born) / 1000
    const fall = Math.max(0, 1 - t / 0.45)
    const bounce = t > 0.45 ? Math.max(0, Math.sin((t - 0.45) * 14) * Math.exp(-(t - 0.45) * 8) * 0.06) : 0
    ref.current.position.set(at[0], at[1] + fall * fall * 1.6 + bounce, at[2])
  })
  const color = tone === 'fair' ? '#e2b65c' : tone === 'risk' ? '#8f2a1c' : '#efc970'
  return (
    <mesh ref={ref} position={at} castShadow>
      <cylinderGeometry args={[0.16, 0.16, 0.05, 32]} />
      <meshStandardMaterial color={color} metalness={tone === 'risk' ? 0.3 : 1} roughness={tone === 'risk' ? 0.35 : 0.25} emissive={tone === 'scheme' ? '#c98a2a' : '#000000'} emissiveIntensity={0.5} />
    </mesh>
  )
}

function Pan({ side, coins, onHover }) {
  const geo = useMemo(() => {
    const pts = [new Vector2(0, 0), new Vector2(0.45, 0.02), new Vector2(0.72, 0.1), new Vector2(0.82, 0.2), new Vector2(0.84, 0.22)]
    return new LatheGeometry(pts, 64)
  }, [])
  // Coins settle in rings inside the dish, then stack.
  const spots = useMemo(() => {
    const s = []
    for (let k = 0; k < 40; k++) {
      const layer = Math.floor(k / 7)
      const i = k % 7
      const r = i === 0 ? 0 : 0.34
      const a = (i / 6) * Math.PI * 2 + layer * 0.5
      s.push([Math.cos(a) * r, 0.05 + layer * 0.055 + (r ? 0.03 : 0), Math.sin(a) * r])
    }
    return s
  }, [])
  return (
    <group name={side}>
      <mesh geometry={geo} receiveShadow>
        <meshPhysicalMaterial transmission={0.92} thickness={0.12} roughness={0.06} ior={1.48} color="#fffaf0" side={2} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.84, 0.022, 10, 64]} />
        {bronze}
      </mesh>
      {coins.map((c, k) => (
        <group
          key={c.key}
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(c)
          }}
          onPointerOut={() => onHover(null)}
        >
          <Coin tone={c.tone} at={spots[k % spots.length]} born={c.born} />
        </group>
      ))}
    </group>
  )
}

function Chain({ from, to }) {
  const ref = useRef()
  const up = useMemo(() => new Vector3(0, 1, 0), [])
  const d = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const a = from()
    const b = to()
    d.subVectors(b, a)
    const len = d.length()
    ref.current.position.copy(a).addScaledVector(d, 0.5)
    ref.current.scale.set(1, len, 1)
    ref.current.quaternion.setFromUnitVectors(up, d.normalize())
  })
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
      <meshStandardMaterial color="#c79d5c" metalness={1} roughness={0.3} />
    </mesh>
  )
}

function Balance({ left, right, onHover }) {
  const beam = useRef()
  const panL = useRef()
  const panR = useRef()
  const phys = useRef({ a: 0.2, v: 0 })
  const wl = left.reduce((s, c) => s + 1, 0)
  const wr = right.reduce((s, c) => s + 1, 0)
  const ends = useMemo(() => ({ l: new Vector3(), r: new Vector3() }), [])
  useFrame((s, dt) => {
    const p = phys.current
    const target = Math.max(-0.3, Math.min(0.3, (wl - wr) * 0.055))
    const step = Math.min(dt, 1 / 30)
    p.v += (-(p.a - target) * 18 - p.v * 2.6) * step
    p.a += p.v * step
    const a = p.a + Math.sin(s.clock.elapsedTime * 0.9) * 0.004
    beam.current.rotation.z = a
    ends.l.set(-L * Math.cos(a), PIVOT - L * Math.sin(a), 0)
    ends.r.set(L * Math.cos(a), PIVOT + L * Math.sin(a), 0)
    panL.current.position.set(ends.l.x, ends.l.y - CHAIN, 0)
    panR.current.position.set(ends.r.x, ends.r.y - CHAIN, 0)
  })
  const rim = (pan, k) => () => {
    const ang = (k / 3) * Math.PI * 2 + 0.4
    const g = pan.current
    return new Vector3(g ? g.position.x + Math.cos(ang) * 0.8 : 0, g ? g.position.y + 0.22 : 0, Math.sin(ang) * 0.8)
  }
  return (
    <group>
      <group ref={beam} position={[0, PIVOT, 0]}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.045, 0.045, L * 2 + 0.1, 16]} />
          {bronze}
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * (L + 0.06), 0, 0]}>
            <sphereGeometry args={[0.07, 20, 12]} />
            {bronze}
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.05, 0.36, 12]} />
          {bronze}
        </mesh>
      </group>
      {[0, 1, 2].map((k) => (
        <Chain key={`l${k}`} from={() => ends.l} to={rim(panL, k)} />
      ))}
      {[0, 1, 2].map((k) => (
        <Chain key={`r${k}`} from={() => ends.r} to={rim(panR, k)} />
      ))}
      <group ref={panL}>
        <Pan side="left" coins={left} onHover={onHover} />
      </group>
      <group ref={panR}>
        <Pan side="right" coins={right} onHover={onHover} />
      </group>
    </group>
  )
}

function Sword({ onSword, pulse }) {
  const blade = useRef()
  useFrame((s) => {
    const t = (performance.now() - pulse) / 1000
    blade.current.material.emissiveIntensity = t < 1.5 ? Math.max(0, 1 - t / 1.5) * 1.6 : 0.05 + Math.sin(s.clock.elapsedTime * 1.5) * 0.04
  })
  return (
    <group
      position={[3.05, 0, -0.4]}
      rotation-z={0.04}
      onClick={(e) => {
        e.stopPropagation()
        onSword()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.5, 0.24, 0.5]} />
        <meshStandardMaterial color="#e2d9ca" roughness={0.45} />
      </mesh>
      <mesh ref={blade} position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[0.13, 2.75, 0.025]} />
        <meshStandardMaterial color="#d6d9dc" metalness={1} roughness={0.18} emissive="#ffe0b0" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 3.02, 0]} castShadow>
        <boxGeometry args={[0.72, 0.07, 0.1]} />
        {bronze}
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.5, 12]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <sphereGeometry args={[0.08, 20, 12]} />
        {bronze}
      </mesh>
    </group>
  )
}

function Rig() {
  const look = useMemo(() => new Vector3(0.35, 2.2, 0), [])
  const want = useMemo(() => new Vector3(), [])
  useFrame(({ camera, pointer, size }, dt) => {
    const narrow = size.width / size.height < 0.9
    want.set(0.35 + pointer.x * 0.5, 2.7 + pointer.y * 0.25, narrow ? 13 : 8.6)
    camera.position.lerp(want, 1 - Math.exp(-dt * 3))
    camera.lookAt(look)
  })
  return null
}

export default function ScalesScene({ left, right, onHover, onSword, pulse }) {
  return (
    <>
      <color attach="background" args={['#e8dfcf']} />
      <fog attach="fog" args={['#ece2d2', 14, 30]} />
      <Backdrop />
      <hemisphereLight args={['#fff6e6', '#b59c80', 1.0]} />
      <directionalLight
        position={[-6, 9, 5]}
        intensity={2.6}
        color="#fff0d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0004}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      <Pillar />
      <Balance left={left} right={right} onHover={onHover} />
      <Sword onSword={onSword} pulse={pulse} />
      <Rig />
      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.9} />
        <Painterly radius={2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
