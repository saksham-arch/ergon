// Hermes' map: a painted neighbourhood on a walnut board, with a glass flower
// growing wherever there is work. You are the golden caduceus: drag it to the
// naka you stand at, and the glass ring shows how far you will walk. Flowers
// inside the ring open; the rest close to buds. Sending word launches a small
// winged messenger from your staff to the flower.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Trail } from '@react-three/drei'
import { EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  QuadraticBezierCurve3,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import Painterly from '../gl/Painterly.jsx'
import { tex } from '../gl/tex.js'
import { KM, tradeOf } from './jobs.js'

const BOARD = 12

/* ---------- Flower geometry (shared) ---------- */

function petals() {
  const pos = []
  const uv = []
  const ang = []
  const lay = []
  const vv = []
  const idx = []
  const NU = 6
  const NV = 10
  const layer = (n, len, width, L, offset) => {
    for (let p = 0; p < n; p++) {
      const a = offset + (p / n) * Math.PI * 2
      const base = pos.length / 3
      for (let j = 0; j <= NV; j++) {
        const v = j / NV
        const w = Math.sin(Math.PI * Math.pow(v, 0.72)) * width * (1 - 0.2 * v) + 0.004
        for (let i = 0; i <= NU; i++) {
          const u = (i / NU) * 2 - 1
          pos.push(u * w, v * len, -(u * u) * w * 0.55 + v * v * len * 0.14)
          uv.push(i / NU, v)
          ang.push(a)
          lay.push(L)
          vv.push(v)
        }
      }
      for (let j = 0; j < NV; j++) {
        for (let i = 0; i < NU; i++) {
          const k = base + j * (NU + 1) + i
          idx.push(k, k + NU + 1, k + 1, k + 1, k + NU + 1, k + NU + 2)
        }
      }
    }
  }
  layer(6, 0.42, 0.17, 0, 0)
  layer(5, 0.3, 0.13, 1, 0.5)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setAttribute('aAng', new BufferAttribute(new Float32Array(ang), 1))
  g.setAttribute('aLayer', new BufferAttribute(new Float32Array(lay), 1))
  g.setAttribute('aV', new BufferAttribute(new Float32Array(vv), 1))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function leaf() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(0.12, 0.14, 0, 0.38)
  s.quadraticCurveTo(-0.12, 0.14, 0, 0)
  return new ShapeGeometry(s, 8)
}

let shared = null
const geos = () => {
  if (!shared) {
    shared = {
      petals: petals(),
      leaf: leaf(),
      stem: (h) => new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.04, h * 0.4, 0.02), new Vector3(-0.03, h * 0.75, 0), new Vector3(0, h, 0)]),
    }
  }
  return shared
}

function petalMaterial(color) {
  const uniforms = { uOpen: { value: 0 }, uTime: { value: 0 }, uSway: { value: 0 }, uGlow: { value: 0 } }
  const m = new MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    transmission: 0.62,
    thickness: 0.25,
    ior: 1.35,
    sheen: 0.6,
    sheenColor: new Color('#fff3e0'),
    side: DoubleSide,
    emissive: new Color(color),
    emissiveIntensity: 0,
  })
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms)
    s.vertexShader = s.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aAng;
         attribute float aLayer;
         attribute float aV;
         varying float vPV;
         uniform float uOpen;
         uniform float uTime;
         uniform float uSway;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
         float tilt = mix(0.1, 1.5 - aLayer * 0.5, uOpen) + sin(uTime * 1.6 + aAng * 2.0) * (0.03 + uSway * 0.08);
         mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(tilt), sin(tilt), 0.0, -sin(tilt), cos(tilt));
         mat3 ry = mat3(cos(aAng), 0.0, -sin(aAng), 0.0, 1.0, 0.0, sin(aAng), 0.0, cos(aAng));
         objectNormal = ry * rx * objectNormal;`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = ry * rx * position;\nvPV = aV;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nvarying float vPV;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance *= uGlow * (0.35 + vPV);`,
      )
  }
  m.userData.uniforms = uniforms
  return m
}

/* ---------- One job, one flower ---------- */

function Flower({ job, open, selected, hovered, sent, onSelect, onHover }) {
  const g = geos()
  const group = useRef()
  const head = useRef()
  const light = useRef()
  const ring = useRef()
  const color = tradeOf(job.trade).color
  const mat = useMemo(() => petalMaterial(color), [color])
  const h = useMemo(() => 0.9 + ((job.x * 7.3 + job.z * 3.1) % 1 + 1) % 1 * 0.5, [job])
  const stem = useMemo(() => g.stem(h), [g, h])
  const grey = useMemo(() => new Color('#9c958a'), [])
  const base = useMemo(() => new Color(color), [color])

  useFrame((s, dt) => {
    const u = mat.userData.uniforms
    const k = 1 - Math.exp(-dt * 4)
    const targetOpen = !open ? 0.05 : selected ? 1.12 : hovered ? 1.02 : 0.82
    u.uOpen.value += (targetOpen - u.uOpen.value) * k
    u.uTime.value = s.clock.elapsedTime + job.x
    u.uSway.value += ((hovered || selected ? 1 : 0) - u.uSway.value) * k
    u.uGlow.value += ((selected ? 1.4 : hovered ? 0.7 : open ? 0.18 : 0) - u.uGlow.value) * k
    mat.emissiveIntensity = 1
    mat.color.lerpColors(grey, base, Math.min(1, u.uOpen.value * 1.4))
    const sc = (open ? 1 : 0.72) * (selected ? 1.18 : hovered ? 1.08 : 1)
    group.current.scale.setScalar(group.current.scale.x + (sc - group.current.scale.x) * k)
    head.current.position.y = h + (selected ? Math.sin(s.clock.elapsedTime * 2) * 0.03 : 0)
    if (light.current) light.current.intensity += ((selected ? 2.2 : 0) - light.current.intensity) * k
    if (ring.current) ring.current.rotation.z += dt * 0.6
  })

  return (
    <group
      ref={group}
      position={[job.x, 0, job.z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(job.id)
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(job.id)
      }}
    >
      <mesh castShadow>
        <tubeGeometry args={[stem, 24, 0.022, 6, false]} />
        <meshStandardMaterial color="#5c7a3c" roughness={0.7} />
      </mesh>
      <mesh geometry={g.leaf} position={[0, h * 0.3, 0]} rotation={[0.9, 0.4, -0.6]} castShadow>
        <meshStandardMaterial color="#6b8a45" roughness={0.6} side={DoubleSide} />
      </mesh>
      <mesh geometry={g.leaf} position={[0, h * 0.45, 0]} rotation={[-0.9, -2.4, 0.6]} scale={0.8} castShadow>
        <meshStandardMaterial color="#6b8a45" roughness={0.6} side={DoubleSide} />
      </mesh>
      <group ref={head} position={[0, h, 0]}>
        <mesh geometry={g.petals} material={mat} />
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color="#e7b85a" emissive="#c98a2a" emissiveIntensity={0.4} roughness={0.4} metalness={0.3} />
        </mesh>
        <pointLight ref={light} color={color} intensity={0} distance={2.4} decay={2} position={[0, 0.25, 0]} />
      </group>
      {sent && (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.26, 0.012, 8, 48]} />
          <meshStandardMaterial color="#e9c26a" emissive="#e0a83a" emissiveIntensity={1.4} metalness={0.8} roughness={0.25} />
        </mesh>
      )}
    </group>
  )
}

/* ---------- The caduceus: you are here ---------- */

function helix(phase) {
  const pts = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const y = 0.25 + t * 1.25
    const r = 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 0.035
    pts.push(new Vector3(Math.cos(t * Math.PI * 5 + phase) * r, y, Math.sin(t * Math.PI * 5 + phase) * r))
  }
  return new CatmullRomCurve3(pts)
}

function caduceusWing() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.12, 0.12, 0.32, 0.22, 0.5, 0.2)
  s.bezierCurveTo(0.38, 0.12, 0.36, 0.06, 0.42, 0.02)
  s.bezierCurveTo(0.3, 0.02, 0.22, -0.04, 0.3, -0.08)
  s.bezierCurveTo(0.16, -0.06, 0.06, -0.05, 0, 0)
  return new ShapeGeometry(s, 10)
}

function Caduceus({ here, onDragStart }) {
  const ref = useRef()
  const wing = useMemo(caduceusWing, [])
  const s1 = useMemo(() => helix(0), [])
  const s2 = useMemo(() => helix(Math.PI), [])
  useFrame((s, dt) => {
    const g = ref.current
    g.position.x += (here[0] - g.position.x) * Math.min(1, dt * 10)
    g.position.z += (here[1] - g.position.z) * Math.min(1, dt * 10)
    g.rotation.y = Math.sin(s.clock.elapsedTime * 0.6) * 0.3
  })
  const gold = <meshStandardMaterial color="#d8ad5c" metalness={1} roughness={0.22} />
  return (
    <group
      ref={ref}
      position={[here[0], 0, here[1]]}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDragStart()
      }}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.06, 32]} />
        {gold}
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 1.7, 12]} />
        {gold}
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[s1, 120, 0.022, 8, false]} />
        <meshStandardMaterial color="#9a8a4a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[s2, 120, 0.022, 8, false]} />
        <meshStandardMaterial color="#9a8a4a" metalness={0.9} roughness={0.3} />
      </mesh>
      {[1, -1].map((k) => (
        <mesh key={k} geometry={wing} position={[0, 1.58, 0]} scale={[k, 1, 1]} rotation-y={0.2 * k}>
          <meshStandardMaterial color="#efd9a6" metalness={0.6} roughness={0.35} side={DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.1, 32, 16]} />
        <meshPhysicalMaterial transmission={1} thickness={0.2} roughness={0.05} ior={1.5} color="#fff4e0" />
      </mesh>
    </group>
  )
}

// The walking distance, as a glass ring and a faint pool of light.
function Reach({ here, km }) {
  const ring = useRef()
  const pool = useRef()
  const r = useRef(km / KM)
  useFrame((_, dt) => {
    r.current += (km / KM - r.current) * Math.min(1, dt * 5)
    for (const m of [ring.current, pool.current]) {
      m.position.x += (here[0] - m.position.x) * Math.min(1, dt * 10)
      m.position.z += (here[1] - m.position.z) * Math.min(1, dt * 10)
    }
    ring.current.scale.setScalar(r.current)
    pool.current.scale.setScalar(r.current)
  })
  return (
    <>
      <mesh ref={ring} position={[here[0], 0.05, here[1]]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1, 0.012, 12, 128]} />
        <meshPhysicalMaterial transmission={1} thickness={0.1} roughness={0.05} ior={1.45} color="#ffffff" emissive="#f0c46a" emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={pool} position={[here[0], 0.012, here[1]]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#ffe2a8" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </>
  )
}

/* ---------- Messengers in flight ---------- */

function Messenger({ flight, jobs }) {
  const ref = useRef()
  const job = jobs.find((j) => j.id === flight.id)
  const curve = useMemo(() => {
    const a = new Vector3(flight.from[0], 1.8, flight.from[1])
    const b = new Vector3(job.x, 1.3, job.z)
    const c = a.clone().lerp(b, 0.5)
    c.y += 2.6
    return new QuadraticBezierCurve3(a, c, b)
  }, [flight, job])
  useFrame((s) => {
    const p = Math.min(1, (performance.now() - flight.t0) / 1600)
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    curve.getPoint(e, ref.current.position)
    ref.current.visible = p < 1
    ref.current.rotation.y = s.clock.elapsedTime * 8
  })
  return (
    <Trail width={1.2} length={7} color="#f2c46a" attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#ffe3a0" emissive="#f0b44a" emissiveIntensity={2.4} />
      </mesh>
    </Trail>
  )
}

/* ---------- Board ---------- */

function Board({ onMove, dragging }) {
  const map = useMemo(() => tex('/art/map.jpg'), [])
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onPointerMove={(e) => {
          if (dragging.current) onMove([Math.max(-5.6, Math.min(5.6, e.point.x)), Math.max(-5.6, Math.min(5.6, e.point.z))])
        }}
      >
        <planeGeometry args={[BOARD, BOARD]} />
        <meshStandardMaterial map={map} roughness={0.92} />
      </mesh>
      <mesh position={[0, -0.27, 0]} receiveShadow castShadow>
        <boxGeometry args={[BOARD + 0.6, 0.52, BOARD + 0.6]} />
        <meshStandardMaterial color="#2b1f16" roughness={0.6} />
      </mesh>
      {[
        [0, BOARD / 2 + 0.06, BOARD + 0.24, 0.1],
        [0, -BOARD / 2 - 0.06, BOARD + 0.24, 0.1],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.01, z]}>
          <boxGeometry args={[w, 0.05, d]} />
          <meshStandardMaterial color="#c49a52" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {[BOARD / 2 + 0.06, -BOARD / 2 - 0.06].map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0.01, 0]}>
          <boxGeometry args={[0.1, 0.05, BOARD + 0.24]} />
          <meshStandardMaterial color="#c49a52" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export default function MapScene({ jobs, here, km, selected, hover, sent, flights, onSelect, onHover, onMove }) {
  const controls = useRef()
  const dragging = useRef(false)
  const { gl } = useThree()
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  useEffect(() => {
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      if (controls.current) controls.current.enabled = !touch
      gl.domElement.style.cursor = ''
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [gl, touch])

  return (
    <>
      <color attach="background" args={['#e7dfd0']} />
      <fog attach="fog" args={['#e7dfd0', 22, 40]} />
      <hemisphereLight args={['#fff2de', '#8a6e52', 1.1]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={2.4}
        color="#ffe2bd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      <Board onMove={onMove} dragging={dragging} />
      <Reach here={here} km={km} />
      <Caduceus
        here={here}
        onDragStart={() => {
          dragging.current = true
          if (controls.current) controls.current.enabled = false
          gl.domElement.style.cursor = 'grabbing'
        }}
      />
      {jobs.map((j) => (
        <Flower
          key={j.id}
          job={j}
          open={j.open}
          selected={selected === j.id}
          hovered={hover === j.id}
          sent={sent.has(j.id)}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {flights.map((f) => (
        <Messenger key={f.t0} flight={f} jobs={jobs} />
      ))}
      <OrbitControls
        ref={controls}
        enabled={!touch}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minPolarAngle={0.5}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.75}
        maxAzimuthAngle={0.75}
        target={[0, 0, 0.4]}
      />
      <EffectComposer multisampling={2}>
        <Painterly radius={2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
