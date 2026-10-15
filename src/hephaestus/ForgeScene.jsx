// Hephaestus' forge. An iron anvil on an oak stump, a hammer that strikes
// when you do, sparks, and the work card as a glowing bronze tablet. Once
// it's quenched it moves into a glass case you can open and turn by hand.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ExtrudeGeometry, Shape, Vector3 } from 'three'
import Painterly from '../gl/Painterly.jsx'
import { canvasTex, tex } from '../gl/tex.js'

const IMPACT = new Vector3(1.28, 2.32, 0.3)
const TABLET_FORGE = new Vector3(-0.15, 3.35, 0.35)
const CASE_X = 3.55
const TABLET_CASE = new Vector3(CASE_X, 2.55, 0)

function anvilGeometry() {
  const s = new Shape()
  s.moveTo(-0.95, 0)
  s.lineTo(1.0, 0)
  s.lineTo(0.92, 0.16)
  s.quadraticCurveTo(0.5, 0.26, 0.46, 0.72)
  s.lineTo(0.95, 0.86)
  s.lineTo(1.28, 0.92)
  s.lineTo(1.28, 1.35)
  s.lineTo(-0.92, 1.35)
  s.lineTo(-0.92, 1.12)
  s.quadraticCurveTo(-0.62, 0.92, -0.48, 0.72)
  s.quadraticCurveTo(-0.52, 0.26, -0.88, 0.16)
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 16 })
  g.translate(0, 0, -0.31)
  return g
}

function Backdrop() {
  const map = useMemo(() => tex('/art/forge.jpg'), [])
  return (
    <mesh position={[1, 4.2, -9]}>
      <planeGeometry args={[28, 18.7]} />
      <meshBasicMaterial map={map} fog={false} />
    </mesh>
  )
}

/* ---------- Sparks and steam ---------- */

const pVert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vLife = aLife;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale * max(aLife, 0.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const pFrag = /* glsl */ `
  varying float vLife;
  varying vec3 vColor;
  void main() {
    if (vLife <= 0.0) discard;
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vColor * smoothstep(0.5, 0.0, d) * min(1.0, vLife * 2.0), 1.0);
  }
`

function Particles({ bursts }) {
  const N = 600
  const { geo, vel, life } = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aLife', new BufferAttribute(new Float32Array(N), 1))
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(N), 1))
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(N * 3), 3))
    return { geo: g, vel: new Float32Array(N * 3), life: { next: 0, drag: new Float32Array(N), grav: new Float32Array(N) } }
  }, [])
  const uniforms = useMemo(() => ({ uScale: { value: 10 } }), [])
  const seen = useRef(0)
  useFrame((s, dt) => {
    uniforms.uScale.value = (s.size.height * s.viewport.dpr) / 60
    const pos = geo.attributes.position.array
    const L = geo.attributes.aLife.array
    const S = geo.attributes.aSize.array
    const C = geo.attributes.aColor.array
    // New bursts since last frame.
    for (; seen.current < bursts.current.length; seen.current++) {
      const b = bursts.current[seen.current]
      const spark = b.kind === 'spark'
      for (let k = 0; k < (spark ? 140 : 90); k++) {
        const i = life.next
        life.next = (life.next + 1) % N
        pos[i * 3] = b.at.x + (Math.random() - 0.5) * (spark ? 0.1 : 1.6)
        pos[i * 3 + 1] = b.at.y + (spark ? 0 : Math.random() * 0.3)
        pos[i * 3 + 2] = b.at.z + (Math.random() - 0.5) * (spark ? 0.1 : 0.4)
        const a = Math.random() * Math.PI * 2
        const sp = spark ? 1.5 + Math.random() * 5 : 0.2 + Math.random() * 0.5
        vel[i * 3] = Math.cos(a) * sp * (spark ? 1 : 0.3)
        vel[i * 3 + 1] = spark ? 1 + Math.random() * 4.5 : 0.8 + Math.random() * 1.2
        vel[i * 3 + 2] = Math.sin(a) * sp * (spark ? 0.6 : 0.3)
        L[i] = spark ? 0.5 + Math.random() * 0.7 : 1.2 + Math.random() * 1.3
        S[i] = spark ? 1 + Math.random() * 2.2 : 14 + Math.random() * 18
        life.grav[i] = spark ? 9.8 : -0.4
        life.drag[i] = spark ? 0.6 : 1.4
        const c = spark ? new Color().setHSL(0.07 + Math.random() * 0.06, 1, 0.55 + Math.random() * 0.25) : new Color(0.16, 0.15, 0.14)
        const boost = spark ? 3 : 1
        C[i * 3] = c.r * boost
        C[i * 3 + 1] = c.g * boost
        C[i * 3 + 2] = c.b * boost
      }
    }
    for (let i = 0; i < N; i++) {
      if (L[i] <= 0) continue
      L[i] -= dt
      vel[i * 3 + 1] -= life.grav[i] * dt
      const d = Math.exp(-dt * life.drag[i])
      vel[i * 3] *= d
      vel[i * 3 + 2] *= d
      pos[i * 3] += vel[i * 3] * dt
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      if (pos[i * 3 + 1] < 0.02 && life.grav[i] > 0) {
        pos[i * 3 + 1] = 0.02
        vel[i * 3 + 1] *= -0.3
      }
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aLife.needsUpdate = true
    geo.attributes.aSize.needsUpdate = true
    geo.attributes.aColor.needsUpdate = true
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial uniforms={uniforms} vertexShader={pVert} fragmentShader={pFrag} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}

/* ---------- Anvil, hammer, tablet ---------- */

function Anvil({ onStrike }) {
  const geo = useMemo(anvilGeometry, [])
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onStrike()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.88, 0.95, 0.95, 40]} />
        <meshStandardMaterial color="#4a3324" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.955, 0]}>
        <cylinderGeometry args={[0.86, 0.86, 0.01, 40]} />
        <meshStandardMaterial color="#7a5638" roughness={0.9} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.95, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3b3633" metalness={0.85} roughness={0.42} />
      </mesh>
      <mesh position={[-1.45, 2.18, 0]} rotation-z={Math.PI / 2} castShadow>
        <coneGeometry args={[0.21, 1.1, 32]} />
        <meshStandardMaterial color="#3b3633" metalness={0.85} roughness={0.42} />
      </mesh>
      <mesh position={[0.18, 2.302, 0]}>
        <boxGeometry args={[2.1, 0.01, 0.58]} />
        <meshStandardMaterial color="#6d6862" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Hammer({ strikes, onImpact }) {
  const ref = useRef()
  const st = useRef({ n: strikes, t: 1 })
  useFrame((_, dt) => {
    const s = st.current
    if (strikes !== s.n) {
      s.n = strikes
      s.t = 0
      s.hit = false
    }
    s.t += dt
    let a
    if (s.t < 0.14) a = -0.75 - (s.t / 0.14) * 0.35
    else if (s.t < 0.22) a = -1.1 + ((s.t - 0.14) / 0.08) * 1.13
    else if (s.t < 0.75) a = 0.03 - ((s.t - 0.22) / 0.53) ** 0.6 * 0.78
    else a = -0.75 + Math.sin(performance.now() / 700) * 0.04
    if (!s.hit && s.t >= 0.22 && s.t < 1) {
      s.hit = true
      onImpact()
    }
    ref.current.rotation.z = a
  })
  return (
    <group ref={ref} position={[2.45, 2.62, 0.3]}>
      <mesh position={[-0.55, 0, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 1.15, 12]} />
        <meshStandardMaterial color="#6b4a2c" roughness={0.7} />
      </mesh>
      <mesh position={[-1.12, 0, 0]} castShadow>
        <boxGeometry args={[0.24, 0.5, 0.24]} />
        <meshStandardMaterial color="#2f2b29" metalness={0.9} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Tablet({ card, version, heat, kept, caseOpen }) {
  const ref = useRef()
  const face = useRef()
  const map = useMemo(() => canvasTex(card), [card])
  const spin = useRef({ y: 0, v: 0, drag: false, x: 0 })
  useEffect(() => {
    map.needsUpdate = true
  }, [map, version])
  useEffect(() => {
    const move = (e) => {
      const s = spin.current
      if (!s.drag) return
      s.v = (e.clientX - s.x) * 0.012
      s.y += s.v
      s.x = e.clientX
    }
    const up = () => (spin.current.drag = false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])
  const heatNow = useRef(heat)
  useFrame((s, dt) => {
    const g = ref.current
    const t = s.clock.elapsedTime
    const target = kept ? TABLET_CASE : TABLET_FORGE
    g.position.lerp(target, 1 - Math.exp(-dt * (kept ? 2.2 : 4)))
    if (!kept) g.position.y += Math.sin(t * 1.4) * 0.0025
    const sc = kept ? 0.56 : 1
    g.scale.setScalar(g.scale.x + (sc - g.scale.x) * (1 - Math.exp(-dt * 3)))
    const sp = spin.current
    if (!sp.drag) {
      sp.v *= Math.exp(-dt * 2.5)
      sp.y += sp.v
      if (!kept) sp.y *= Math.exp(-dt * 3)
    }
    g.rotation.set(kept ? 0 : -0.1, sp.y + (kept && !caseOpen ? Math.sin(t * 0.5) * 0.25 : 0), 0)
    heatNow.current += (heat - heatNow.current) * Math.min(1, dt * (heat > heatNow.current ? 6 : 1.2))
    const m = face.current.material
    m.emissiveIntensity = heatNow.current * (1.4 + Math.sin(t * 9) * 0.08)
  })
  return (
    <group
      ref={ref}
      position={TABLET_FORGE.toArray()}
      onPointerDown={(e) => {
        // Inside an open case, the tablet turns under your hand.
        if (!kept || !caseOpen) return
        spin.current.drag = true
        spin.current.x = e.clientX
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[2.46, 1.66, 0.08]} />
        <meshStandardMaterial color="#8c5c2e" metalness={0.85} roughness={0.38} />
      </mesh>
      <mesh ref={face} position={[0, 0, 0.041]}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial map={map} emissiveMap={map} emissive="#ff5a12" emissiveIntensity={0} metalness={0.55} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0, -0.041]} rotation-y={Math.PI}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial color="#7a4e26" metalness={0.8} roughness={0.45} />
      </mesh>
    </group>
  )
}

// The case: marble plinth, glass walls, a glass lid that lifts when touched.
function Vitrine({ open, onToggle, glowing }) {
  const lid = useRef()
  const W = 1.75
  const H = 1.35
  const D = 0.9
  const top = 1.4 + H
  useFrame((_, dt) => {
    const y = top + (open ? 0.75 : 0)
    lid.current.position.y += (y - lid.current.position.y) * Math.min(1, dt * 5)
  })
  const glass = (
    <meshPhysicalMaterial transmission={1} thickness={0.04} roughness={0.03} ior={1.5} color="#ffffff" attenuationColor="#f2fff8" attenuationDistance={4} clearcoat={1} envMapIntensity={1.4} />
  )
  return (
    <group position={[CASE_X, 0, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.18, 1.4, D + 0.18]} />
        <meshStandardMaterial color="#e3dacb" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[W + 0.24, 0.05, D + 0.24]} />
        <meshStandardMaterial color="#b58a4c" metalness={0.9} roughness={0.3} />
      </mesh>
      <group
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta < 5) onToggle()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh position={[0, 1.4 + H / 2, D / 2]}>
          <planeGeometry args={[W, H]} />
          {glass}
        </mesh>
        <mesh position={[0, 1.4 + H / 2, -D / 2]} rotation-y={Math.PI}>
          <planeGeometry args={[W, H]} />
          {glass}
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[(k * W) / 2, 1.4 + H / 2, 0]} rotation-y={(k * Math.PI) / 2}>
            <planeGeometry args={[D, H]} />
            {glass}
          </mesh>
        ))}
        <group ref={lid} position={[0, top, 0]}>
          <mesh>
            <boxGeometry args={[W + 0.04, 0.035, D + 0.04]} />
            {glass}
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[W + 0.08, 0.025, D + 0.08]} />
            <meshStandardMaterial color="#b58a4c" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      </group>
      <pointLight position={[0, 2.9, 0.4]} color="#fff0d6" intensity={glowing ? 3 : 0} distance={3} />
    </group>
  )
}

function Fire() {
  const ref = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    ref.current.intensity = 34 + Math.sin(t * 7.3) * 4 + Math.sin(t * 13.1) * 3 + Math.sin(t * 2.1) * 5
  })
  return <pointLight ref={ref} position={[-5.5, 1.6, -2.5]} color="#ff7426" distance={22} decay={2} intensity={34} />
}

function Shake({ kick }) {
  const { camera } = useThree()
  const base = useMemo(() => new Vector3(), [])
  const look = useMemo(() => new Vector3(1.0, 2.25, 0), [])
  const st = useRef({ k: kick, amp: 0 })
  useFrame((s, dt) => {
    if (kick !== st.current.k) {
      st.current.k = kick
      st.current.amp = 0.05
    }
    st.current.amp *= Math.exp(-dt * 10)
    const narrow = s.size.width / s.size.height < 0.9
    base.set(1.0 + s.pointer.x * 0.35, 3.05 + s.pointer.y * 0.2, narrow ? 12 : 7.8)
    camera.position.lerp(base, 1 - Math.exp(-dt * 3))
    camera.position.x += (Math.random() - 0.5) * st.current.amp
    camera.position.y += (Math.random() - 0.5) * st.current.amp
    camera.lookAt(look)
  })
  return null
}

export default function ForgeScene({ card, version, strikes, heat, kept, caseOpen, onStrike, onCase, quenchId }) {
  const bursts = useRef([])
  const flash = useRef()
  const last = useRef(quenchId)
  useEffect(() => {
    if (quenchId !== last.current) {
      last.current = quenchId
      bursts.current.push({ kind: 'steam', at: TABLET_FORGE.clone().setY(2.9) })
    }
  }, [quenchId])
  useFrame((_, dt) => {
    if (flash.current) flash.current.intensity *= Math.exp(-dt * 14)
  })
  return (
    <>
      <color attach="background" args={['#120c09']} />
      <fog attach="fog" args={['#160e0a', 12, 24]} />
      <Backdrop />
      <hemisphereLight args={['#ffd8b0', '#1a0f08', 0.35]} />
      <spotLight position={[1.5, 8, 4]} angle={0.42} penumbra={0.8} intensity={70} decay={2} color="#ffe2c0" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[6, 4, -2]} intensity={0.8} color="#a9bfdc" />
      <Fire />
      <pointLight ref={flash} position={[IMPACT.x, IMPACT.y + 0.3, IMPACT.z + 0.4]} color="#ffb05a" intensity={0} distance={5} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.55} />
      </mesh>
      <Anvil onStrike={onStrike} />
      <Hammer
        strikes={strikes}
        onImpact={() => {
          bursts.current.push({ kind: 'spark', at: IMPACT.clone() })
          if (flash.current) flash.current.intensity = 26
        }}
      />
      <Tablet card={card} version={version} heat={heat} kept={kept} caseOpen={caseOpen} />
      <Vitrine open={caseOpen} onToggle={onCase} glowing={kept} />
      <Particles bursts={bursts} />
      <Shake kick={strikes} />
      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.7} luminanceSmoothing={0.3} />
        <Painterly radius={2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
