// The hall: one amphora on a plinth in a dark gallery, lit from above. It is
// the site's second act. Boulders fall into it, its frieze paints itself in,
// a glass case lowers and lifts, and the four chapters turn it to face you.
// Everything here is driven by `hall` (scroll, pointer, selection).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  LatheGeometry,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { FIGURES } from './data.js'
import { FACE, T, clamp, hall, mix, smooth } from './hall.js'
import { paintVase } from './paint.js'
import { MOUTH_R, MOUTH_Y, PROFILE } from './profile.js'
import Stoa from './exhibits/Stoa.jsx'
import Balance from './exhibits/Balance.jsx'
import Tablet from './exhibits/Tablet.jsx'
import Offerings from './exhibits/Offerings.jsx'
import Exodus from './exhibits/Exodus.jsx'
import { useGalleryEnv } from './exhibits/useGalleryEnv.js'

const TAU = Math.PI * 2
const N = FIGURES.length
const SLIP = '#17120f'
const wrap = (a) => a - TAU * Math.round(a / TAU)

/* ---------- Vase ---------- */

function useLathe() {
  return useMemo(() => {
    const geo = new LatheGeometry(PROFILE.points, 256)
    // Replace the evenly spaced v with the painted layout's.
    const uv = geo.attributes.uv
    const n = PROFILE.points.length
    for (let i = 0; i < uv.count; i++) uv.setY(i, PROFILE.vs[i % n])
    uv.needsUpdate = true
    return geo
  }, [])
}

function useVaseMaterial() {
  return useMemo(() => {
    const uniforms = {
      uMask: { value: null },
      uFigU: { value: Array.from({ length: N }, () => new Vector2(-1, -1)) },
      uReveal: { value: new Array(N).fill(1) },
      uFrieze: { value: new Vector2(0.4, 0.7) },
      uHover: { value: -1 },
      uSel: { value: -1 },
      uGlow: { value: new Vector3() },
      uTime: { value: 0 },
      uGold: { value: new Color('#ffad5a').multiplyScalar(1.4) },
      uClay: { value: new Color('#c65b2b') },
    }
    const m = new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 1,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.28,
      bumpScale: 0.6,
      sheen: 0.25,
      sheenRoughness: 0.6,
      sheenColor: new Color('#ffcf9e'),
      envMapIntensity: 0.9,
    })
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms)
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uMask;
          uniform vec2 uFigU[${N}];
          uniform float uReveal[${N}];
          uniform vec2 uFrieze;
          uniform float uHover;
          uniform float uSel;
          uniform vec3 uGlow;
          uniform float uTime;
          uniform vec3 uGold;
          uniform vec3 uClay;`,
        )
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D( map, vMapUv );
            vec3 msk = texture2D( uMask, vMapUv ).rgb;
            float rev = 1.0;
            float hov = 0.0;
            float fy = ( vMapUv.y - uFrieze.x ) / ( uFrieze.y - uFrieze.x );
            if ( fy > -0.02 && fy < 1.02 ) {
              for ( int i = 0; i < ${N}; i ++ ) {
                if ( vMapUv.x >= uFigU[ i ].x && vMapUv.x < uFigU[ i ].y ) {
                  rev = uReveal[ i ];
                  hov = max( step( abs( float( i ) - uHover ), 0.1 ), step( abs( float( i ) - uSel ), 0.1 ) * 0.75 );
                }
              }
            }
            // The frieze paints itself in from the ground line up, a bright
            // wet edge running ahead of the dry slip.
            float front = rev * 1.2 - 0.1;
            float shown = 1.0 - smoothstep( front - 0.05, front + 0.05, fy );
            float paint = clamp( msk.r + msk.g, 0.0, 1.0 );
            vec3 ghost = mix( uClay, sampledDiffuseColor.rgb, 0.14 );
            sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, ghost, paint * ( 1.0 - shown ) );
            float wet = ( 1.0 - smoothstep( 0.0, 0.06, abs( fy - front ) ) ) * step( 0.002, rev ) * ( 1.0 - step( 0.998, rev ) );
            float pulse = 0.7 + 0.3 * sin( uTime * 2.2 );
            totalEmissiveRadiance += uGold * paint * wet * 2.4;
            totalEmissiveRadiance += uGold * ( msk.g * 1.4 + msk.r * 0.06 ) * hov;
            totalEmissiveRadiance += uGold * ( msk.g * uGlow.x + msk.b * uGlow.y * 0.55 + msk.r * uGlow.z * 0.08 ) * pulse;
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        )
    }
    return { m, uniforms }
  }, [])
}

function Handle() {
  const geos = useMemo(() => {
    const strut = new CatmullRomCurve3(
      [[0.64, 2.62], [0.78, 2.63], [0.9, 2.58], [1.03, 2.38], [1.1, 2.22], [1.1, 2.1], [1.06, 2.0]].map(([x, y]) => new Vector3(x, y, 0)),
    )
    return { strut }
  }, [])
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[geos.strut, 64, 0.05, 16, false]} />
        <meshPhysicalMaterial color={SLIP} roughness={0.32} clearcoat={0.9} clearcoatRoughness={0.18} />
      </mesh>
      <mesh position={[1.08, 2.55, 0]} castShadow>
        <torusGeometry args={[0.15, 0.048, 24, 64]} />
        <meshPhysicalMaterial color={SLIP} roughness={0.32} clearcoat={0.9} clearcoatRoughness={0.18} />
      </mesh>
    </group>
  )
}

function Vase() {
  const group = useRef()
  const geo = useLathe()
  const { m, uniforms } = useVaseMaterial()
  const [ready, setReady] = useState(false)
  const keys = useRef(null)

  useEffect(() => {
    let alive = true
    paintVase().then((r) => {
      if (!alive) return
      const map = new CanvasTexture(r.map)
      map.colorSpace = SRGBColorSpace
      map.anisotropy = 8
      const surf = new CanvasTexture(r.surf)
      const mask = new CanvasTexture(r.mask)
      m.map = map
      m.bumpMap = surf
      m.roughnessMap = surf
      m.clearcoatMap = surf
      m.needsUpdate = true
      uniforms.uMask.value = mask
      r.ranges.forEach(([a, b], i) => uniforms.uFigU.value[i].set(a, b))
      uniforms.uFrieze.value.set(r.frieze[0], r.frieze[1])
      hall.ranges = r.ranges
      setReady(true)
    })
    return () => {
      alive = false
      m.map?.dispose()
      m.bumpMap?.dispose()
      uniforms.uMask.value?.dispose()
    }
  }, [m, uniforms])

  // Rotation keyframes over the scroll, once we know where the figures are.
  useEffect(() => {
    if (!ready) return
    const face = (i) => {
      const [a, b] = hall.ranges[i]
      return -((a + b) / 2) * TAU
    }
    const fS = face(FACE.kept)
    const f = []
    let prev = fS
    for (const i of FACE.chapters) {
      prev = prev + wrap(face(i) - prev)
      f.push(prev)
    }
    const [c0, c1, c2, c3] = T.chapters
    keys.current = [
      [0, fS + 2.6],
      [T.descent[1], fS + 0.35],
      [T.kept[0] + 0.03, fS],
      [T.kept[1] - 0.01, fS],
      [c0[0] + 0.04, f[0]],
      [c0[1] - 0.02, f[0]],
      [c1[0] + 0.04, f[1]],
      [c1[1] - 0.02, f[1]],
      [c2[0] + 0.04, f[2]],
      [c2[1] - 0.02, f[2]],
      [c3[0] + 0.04, f[3]],
      [c3[1] - 0.02, f[3]],
      [1, f[3] + 4.2],
    ]
  }, [ready])

  const pick = (e) => {
    const uv = e.uv
    if (!uv || !hall.ranges) return -1
    const [a, b] = [uniforms.uFrieze.value.x, uniforms.uFrieze.value.y]
    if (uv.y < a || uv.y > b) return -1
    return hall.ranges.findIndex(([u0, u1]) => uv.x >= u0 && uv.x < u1)
  }

  useFrame((state, dt) => {
    const g = group.current
    const p = hall.p
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t

    // Figures paint in as boulders land (or, after a video, on their own).
    for (let i = 0; i < N; i++) {
      const at = hall.hasVideo ? 0.215 + i * 0.009 : BOULDER_T(REVEAL_FROM + i) + FALL
      uniforms.uReveal.value[i] = smooth(at, at + 0.035, p)
    }
    uniforms.uHover.value = hall.hover
    uniforms.uSel.value = hall.selected
    const ch = T.chapters
    const glow = uniforms.uGlow.value
    glow.lerp(
      new Vector3(
        Math.max(smooth(ch[3][0], ch[3][0] + 0.03, p) * (1 - smooth(ch[3][1] - 0.02, ch[3][1], p)), 0),
        smooth(ch[2][0], ch[2][0] + 0.03, p) * (1 - smooth(ch[2][1] - 0.02, ch[2][1], p)),
        smooth(ch[1][0], ch[1][0] + 0.03, p) * (1 - smooth(ch[1][1] - 0.02, ch[1][1], p)),
      ),
      1 - Math.exp(-dt * 6),
    )

    if (!keys.current) return
    const K = keys.current
    let base = K[K.length - 1][1]
    for (let k = 0; k < K.length - 1; k++) {
      if (p <= K[k + 1][0]) {
        const u = smooth(K[k][0], K[k + 1][0], p)
        base = mix(K[k][1], K[k + 1][1], u)
        break
      }
    }

    const d = hall.drag
    if (d.on) {
      d.idle = 0
    } else {
      d.offset += d.vel
      d.vel *= Math.exp(-dt * 3.2)
      d.idle += dt
      // Let go for a moment and the chapter's figure turns back to you.
      if (d.idle > 2.4 && p < T.coda[0]) d.offset += (Math.round(d.offset / TAU) * TAU - d.offset) * (1 - Math.exp(-dt * 2.2))
    }
    let target = base + d.offset
    if (hall.selected >= 0) {
      const [a, b] = hall.ranges[hall.selected]
      target += wrap(-((a + b) / 2) * TAU - target)
    }
    if (!d.on) target += Math.sin(t * 0.35) * 0.04
    g.rotation.y += (target - g.rotation.y) * (1 - Math.exp(-dt * (d.on ? 14 : 3.6)))
  })

  const handleRot = (896 / 4096) * TAU - Math.PI / 2

  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        material={m}
        castShadow
        receiveShadow
        onPointerMove={(e) => {
          const i = pick(e)
          if (i !== hall.hover) {
            hall.hover = i
            hall.onHover?.(i)
          }
        }}
        onPointerOut={() => {
          if (hall.hover !== -1) {
            hall.hover = -1
            hall.onHover?.(-1)
          }
        }}
        onClick={(e) => {
          if (e.delta > 6 || hall.drag.moved > 6) return
          e.stopPropagation()
          const i = pick(e)
          if (i >= 0) hall.onSelect?.(i)
        }}
      />
      <group rotation-y={handleRot}>
        <Handle />
        <group rotation-y={Math.PI}>
          <Handle />
        </group>
      </group>
    </group>
  )
}

/* ---------- Boulders (the live descent, when there is no video) ---------- */

const COUNT = 22
const FALL = 0.03
const BOULDER_T = (i) => 0.012 + (i / (COUNT - 1)) * 0.15
// The late boulders, landing once the camera has swung round to the frieze,
// are the ones that paint a figure each.
const REVEAL_FROM = COUNT - N - 1

function Boulders({ envMap }) {
  const refs = useRef([])
  const ring = useRef()
  const glow = useRef()
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i * 2.399) % TAU
        const d = 1.2 + ((i * 0.618) % 1) * 2.2
        return {
          from: new Vector3(Math.cos(a) * d, 10 + ((i * 0.37) % 1) * 4, Math.sin(a) * d),
          to: new Vector3(Math.cos(a * 3) * 0.12, MOUTH_Y, Math.sin(a * 3) * 0.12),
          r: 0.2 + ((i * 0.53) % 1) * 0.16,
          spin: new Vector3(((i * 0.71) % 1) - 0.5, 1, ((i * 0.29) % 1) - 0.5).normalize(),
        }
      }),
    [],
  )

  useFrame((_, dt) => {
    const p = hall.p
    const live = !hall.hasVideo
    let flash = 0
    for (let i = 0; i < COUNT; i++) {
      const b = refs.current[i]
      if (!b) continue
      const s = (p - BOULDER_T(i)) / FALL
      const { from, to, r } = seeds[i]
      b.visible = live && s > -0.02 && s < 1.25
      if (!b.visible) continue
      if (s <= 1) {
        const e = Math.max(0, s) ** 2
        b.position.lerpVectors(from, to, e)
      } else {
        b.position.set(to.x, to.y - (s - 1) * 5, to.z)
      }
      b.scale.setScalar(r)
      b.rotateOnAxis(seeds[i].spin, dt * 3)
      flash = Math.max(flash, Math.exp(-(((s - 1) / 0.09) ** 2)))
    }
    // A ring of light at the lip for each landing, and a steady warmth once
    // the work is inside.
    const kept = live ? smooth(0.04, T.descent[1], p) : smooth(0.2, 0.26, p)
    if (ring.current) {
      ring.current.material.opacity = live ? flash * 0.9 : 0
      ring.current.scale.setScalar(1 + (1 - flash) * 0.15)
    }
    if (glow.current) glow.current.intensity = (live ? flash * 6 : 0) + kept * 1.6
  })

  return (
    <group>
      {seeds.map((s, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} visible={false} castShadow>
          <sphereGeometry args={[1, 64, 32]} />
          <meshStandardMaterial color="#efe8e1" metalness={1} roughness={0.07} envMapIntensity={1.5} envMap={envMap} />
        </mesh>
      ))}
      <mesh ref={ring} position={[0, MOUTH_Y + 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[MOUTH_R + 0.08, MOUTH_R + 0.2, 96]} />
        <meshBasicMaterial color="#ffb768" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position={[0, MOUTH_Y + 0.25, 0]} color="#ff9e4f" intensity={0} distance={3.5} decay={2} />
    </group>
  )
}

/* ---------- Plinth, floor and the glass case ---------- */

function plinthTexture() {
  const c = document.createElement('canvas')
  c.width = 1360
  c.height = 400
  const g = c.getContext('2d')
  g.fillStyle = '#1a1411'
  g.fillRect(0, 0, c.width, c.height)
  // A meander frieze along the top edge of each face, in clay.
  const h = 46
  const gy = h / 5
  const n = 22
  const gx = c.width / (n * 6)
  g.strokeStyle = '#b4532a'
  g.lineJoin = 'miter'
  for (let i = 0; i < n; i++) {
    g.save()
    g.translate(i * 6 * gx, 22)
    g.scale(gx, gy)
    g.lineWidth = 1
    g.beginPath()
    const K = [[0, 4.5], [4.5, 4.5], [4.5, 0.5], [0.5, 0.5], [0.5, 2.5], [2.5, 2.5]]
    g.moveTo(...K[0])
    for (const p of K.slice(1)) g.lineTo(...p)
    g.stroke()
    g.restore()
  }
  g.fillStyle = '#b4532a'
  g.fillRect(0, 12, c.width, 3)
  g.fillRect(0, 22 + h + 8, c.width, 3)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Plinth() {
  const map = useMemo(plinthTexture, [])
  return (
    <mesh position={[0, -0.6, 0]} receiveShadow castShadow>
      <boxGeometry args={[3.4, 1.2, 3.4]} />
      <meshPhysicalMaterial attach="material-0" map={map} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
      <meshPhysicalMaterial attach="material-1" map={map} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
      <meshPhysicalMaterial attach="material-2" color="#1d1713" roughness={0.36} clearcoat={0.7} clearcoatRoughness={0.2} />
      <meshPhysicalMaterial attach="material-3" color="#1d1713" roughness={0.5} />
      <meshPhysicalMaterial attach="material-4" map={map} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
      <meshPhysicalMaterial attach="material-5" map={map} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
    </mesh>
  )
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={1024}
        mixBlur={1}
        mixStrength={28}
        roughness={0.9}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0d0a08"
        metalness={0.55}
        mirror={0}
      />
    </mesh>
  )
}

// A museum case: low-iron glass, bright edges, a dark cap. It lowers over the
// vase when the work is "kept", and lifts away for the chapters.
function Vitrine() {
  const ref = useRef()
  const W = 3.1
  const H = 3.75
  const edges = useMemo(() => {
    const e = []
    for (const x of [-1, 1]) for (const z of [-1, 1]) e.push({ p: [(x * W) / 2, H / 2, (z * W) / 2], s: [0.014, H, 0.014] })
    for (const y of [0, H]) {
      for (const z of [-1, 1]) e.push({ p: [0, y, (z * W) / 2], s: [W, 0.014, 0.014] })
      for (const x of [-1, 1]) e.push({ p: [(x * W) / 2, y, 0], s: [0.014, 0.014, W] })
    }
    return e
  }, [])
  useFrame(() => {
    const p = hall.p
    const down = smooth(T.kept[0], T.kept[0] + 0.045, p)
    const up = smooth(T.kept[1] - 0.025, T.kept[1] + 0.03, p)
    const y = (1 - down) * 6 + up * 7
    ref.current.position.y = y
    ref.current.visible = y < 6.5
  })
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, W]} />
        <meshPhysicalMaterial
          transmission={1}
          thickness={0.06}
          roughness={0.02}
          ior={1.5}
          color="#ffffff"
          attenuationColor="#effff7"
          attenuationDistance={6}
          specularIntensity={1}
          envMapIntensity={1.6}
          clearcoat={1}
          clearcoatRoughness={0.02}
        />
      </mesh>
      {edges.map((e, i) => (
        <mesh key={i} position={e.p}>
          <boxGeometry args={e.s} />
          <meshStandardMaterial color="#fff6ea" emissive="#ffe4c4" emissiveIntensity={0.5} metalness={0.3} roughness={0.2} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, H + 0.05, 0]}>
        <boxGeometry args={[W + 0.04, 0.1, W + 0.04]} />
        <meshPhysicalMaterial color="#141010" roughness={0.35} clearcoat={0.8} />
      </mesh>
    </group>
  )
}

/* ---------- Light from above ---------- */

const coneVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mv;
  }
`
const coneFrag = /* glsl */ `
  uniform float uOpacity;
  uniform float uH;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.8);
    float h = vY / uH + 0.5; // 0 at the floor, 1 at the lamp
    float a = facing * smoothstep(0.0, 0.55, h) * (1.0 - smoothstep(0.92, 1.0, h));
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.55) * a * uOpacity, 1.0);
  }
`

function LightCone() {
  const H = 9
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.16 }, uH: { value: H } }), [])
  return (
    <mesh position={[0, H / 2 - 0.2, 0]} renderOrder={5}>
      <cylinderGeometry args={[0.35, 2.4, H, 64, 1, true]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={coneVert}
        fragmentShader={coneFrag}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  )
}

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * (0.04 + aSeed * 0.05);
    p.y = mod(p.y + t, 8.5) - 0.3;
    p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.12;
    p.z += cos(uTime * 0.25 + aSeed * 31.0) * 0.12;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Brightest inside the beam (which widens toward the floor).
    float beam = 0.35 + (1.0 - p.y / 9.0) * 2.0;
    float d = length(p.xz);
    // Motes right in front of the lens would bloom into blobs: fade them out.
    float near = smoothstep(1.5, 3.5, -mv.z);
    vA = (1.0 - smoothstep(beam * 0.6, beam, d)) * (0.45 + 0.55 * sin(uTime * 1.3 + aSeed * 60.0)) * near;
    gl_PointSize = min((1.0 + aSeed * 2.0) * uScale / -mv.z, uScale * 0.5);
    gl_Position = projectionMatrix * mv;
  }
`
const dustFrag = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a * 0.9, 1.0);
  }
`

function Dust() {
  const ref = useRef()
  const { size, viewport } = useThree()
  const geo = useMemo(() => {
    const n = 900
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU
      const r = Math.sqrt(Math.random()) * 3
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = Math.random() * 8.5
      pos[i * 3 + 2] = Math.sin(a) * r
      seed[i] = Math.random()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 300 } }), [])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uScale.value = (size.height * viewport.dpr) / 200
  })
  return (
    <points ref={ref} geometry={geo} renderOrder={6}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

/* ---------- Camera ---------- */

// [p, camera position, look-at], desktop framing. Chapters alternate the vase
// left and right of the copy.
const SHOTS = [
  [0, [0, 8.8, 2.4], [0, 3.0, 0]],
  [0.11, [0, 6.2, 5.0], [0, 2.4, 0]],
  [0.2, [0, 2.1, 9.6], [0, 1.55, 0]],
  [0.31, [0, 1.85, 8.8], [0, 1.6, 0]],
  [0.37, [1.55, 1.7, 7.4], [1.55, 1.5, 0]],
  [0.46, [1.45, 1.62, 7.0], [1.45, 1.5, 0]],
  [0.51, [-0.5, 1.8, 8.3], [-0.5, 1.5, 0]],
  [0.6, [-0.4, 1.72, 7.9], [-0.4, 1.5, 0]],
  [0.65, [0.05, 1.75, 9.4], [-0.15, 1.1, -0.4]],
  [0.74, [0.0, 1.68, 9.0], [-0.2, 1.08, -0.4]],
  [0.79, [-1.5, 2.6, 7.2], [-1.5, 1.75, 0]],
  [0.88, [-1.42, 2.5, 6.9], [-1.42, 1.72, 0]],
  [0.94, [0, 2.4, 10.4], [0, 1.45, 0]],
  [1, [0, 2.7, 11.6], [0, 1.4, 0]],
]

function Rig() {
  const { camera, size } = useThree()
  const tmp = useMemo(() => ({ pos: new Vector3(), at: new Vector3(), look: new Vector3(0, 2, 0), cur: null }), [])
  useFrame((_, dt) => {
    const p = hall.p
    let k = SHOTS.length - 2
    for (let i = 0; i < SHOTS.length - 1; i++) {
      if (p <= SHOTS[i + 1][0]) {
        k = i
        break
      }
    }
    const [p0, a0, t0] = SHOTS[k]
    const [p1, a1, t1] = SHOTS[k + 1]
    const u = smooth(p0, p1, p)
    tmp.pos.set(mix(a0[0], a1[0], u), mix(a0[1], a1[1], u), mix(a0[2], a1[2], u))
    tmp.at.set(mix(t0[0], t1[0], u), mix(t0[1], t1[1], u), mix(t0[2], t1[2], u))

    // Portrait screens: no side framing, pull back so the vase fits, and
    // lift it so the copy can sit underneath.
    const aspect = size.width / size.height
    if (aspect < 0.95) {
      tmp.pos.x = 0
      tmp.at.x = 0
      const k2 = clamp(1.15 / aspect, 1, 2.3)
      tmp.pos.sub(tmp.at).multiplyScalar(k2).add(tmp.at)
      tmp.pos.y -= 0.9
      tmp.at.y -= 0.9
    }

    // A little parallax from the pointer.
    const ptr = hall.pointer
    tmp.pos.x += ptr.nx * 0.28
    tmp.pos.y += ptr.ny * 0.16

    const s = 1 - Math.exp(-dt * 5)
    if (!tmp.cur) {
      tmp.cur = true
      camera.position.copy(tmp.pos)
      tmp.look.copy(tmp.at)
    }
    camera.position.lerp(tmp.pos, s)
    tmp.look.lerp(tmp.at, s)
    camera.lookAt(tmp.look)
  })
  return null
}

// A warm key that follows the cursor, so the glaze answers your hand.
function CursorLight() {
  const ref = useRef()
  useFrame((s, dt) => {
    const p = hall.pointer
    const tx = p.nx * 5
    const ty = 2.2 + p.ny * 2.4
    ref.current.position.x += (tx - ref.current.position.x) * Math.min(1, dt * 4)
    ref.current.position.y += (ty - ref.current.position.y) * Math.min(1, dt * 4)
    ref.current.position.z = s.camera.position.z * 0.55 + 1.5
  })
  return <pointLight ref={ref} color="#ffe2c2" intensity={14} distance={14} decay={2} position={[2, 3, 5]} />
}

export default function VaseScene() {
  // A live capture of the gallery for everything chrome.
  const { texture: gallery } = useGalleryEnv({ size: 256, every: 4 })

  return (
    <>
      <color attach="background" args={['#0b0807']} />
      <fog attach="fog" args={['#0b0807', 12, 26]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffe6cc" position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[5, 5, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-5, 2.2, 1.5]} rotation-y={Math.PI / 2} scale={[0.7, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd2a6" position={[5, 2.2, -1]} rotation-y={-Math.PI / 2} scale={[0.5, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#c8602e" position={[0, 1.5, -6]} scale={[10, 1.4, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[2.5, 4, 6]} scale={1.6} />
      </Environment>

      <ambientLight intensity={0.08} color="#ffd9b8" />
      <spotLight
        position={[0.4, 9.5, 1.2]}
        angle={0.32}
        penumbra={0.85}
        intensity={170}
        decay={2}
        distance={30}
        color="#ffe1c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-4, 3, -5]} intensity={0.9} color="#e8703a" />
      <CursorLight />

      <Stoa />
      <Vase />
      <Boulders envMap={gallery} />
      <Offerings envMap={gallery} />
      <Balance />
      <Tablet />
      <Exodus />
      <Plinth />
      <ContactShadows position={[0, 0.003, 0]} scale={3.3} blur={2.2} opacity={0.8} far={1.4} resolution={512} color="#000000" frames={1} />
      <Vitrine />
      <Floor />
      <LightCone />
      <Dust />
      <Rig />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.82} luminanceSmoothing={0.25} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.28} darkness={0.72} />
        <Noise opacity={0.035} />
      </EffectComposer>
    </>
  )
}
