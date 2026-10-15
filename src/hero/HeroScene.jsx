// Act one, in three.js: a painted golden-hour hillside above the sea. The
// marble Sisyphus (a rigged cut-out, posed in figure.js) pushes a limestone
// boulder threaded with gold. The story is told by things that belong on a
// hill: a swallow carrying a silk ribbon above him, and inscribed marble
// stelae on the slope below, carved as he passes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RGBADepthPacking,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import Painterly from '../gl/Painterly.jsx'
import { rng, snoise } from '../gl/noise.js'
import { SANS, SERIF, canvas, canvasTex, spaced, tex, whenFonts } from '../gl/tex.js'
import { CLIMB, X_START, X_SUMMIT } from '../hill.js'
import { BEATS, F, R3, climb, stepClimb, toX, toY } from './climb.js'
import { heightAt, input } from './terrain.js'

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const mix = (a, b, t) => a + (b - a) * t

/* ---------- Driver: steps the climb before anything reads it ---------- */

function Driver() {
  useFrame((_, dt) => stepClimb(Math.min(dt, 1 / 20), input.u))
  return null
}

/* ---------- Backdrop: the painted sea, always at eye level ---------- */

function Backdrop() {
  const ref = useRef()
  const map = useMemo(() => tex('/art/hero/backdrop.jpg'), [])
  useFrame(({ camera }) => {
    ref.current.position.set(camera.position.x * 0.9, camera.position.y + 30, camera.position.z - 175)
  })
  return (
    <mesh ref={ref} renderOrder={-1}>
      <planeGeometry args={[330, 220]} />
      <meshBasicMaterial map={map} fog={false} depthWrite={false} />
    </mesh>
  )
}

/* ---------- Terrain ---------- */

const terrainVert = (s) =>
  s
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
       vWN = normalize(mat3(modelMatrix) * objectNormal);`,
    )

function Terrain() {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(112, 76, 448, 300)
    g.rotateX(-Math.PI / 2)
    g.translate(18, 0, -16)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0 })
    const uniforms = {
      uGround: { value: tex('/art/hero/ground.jpg', { repeat: true }) },
      uRock: { value: tex('/art/hero/rock.jpg', { repeat: true }) },
    }
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms)
      s.vertexShader = terrainVert(s.vertexShader)
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform sampler2D uGround;
           uniform sampler2D uRock;
           varying vec3 vWPos;
           varying vec3 vWN;
           ${snoise}`,
        )
        .replace(
          '#include <map_fragment>',
          `vec2 gUv = vWPos.xz * 0.14;
           vec3 grass = mix(texture2D(uGround, gUv).rgb, texture2D(uGround, gUv * 0.31 + 0.37).rgb, 0.45);
           vec3 rk = texture2D(uRock, vec2(vWPos.x + vWPos.z * 0.55, vWPos.y) * 0.2).rgb;
           float n = snoise(vWPos * 0.16) * 0.5 + 0.5;
           float n2 = snoise(vWPos * 0.9) * 0.5 + 0.5;
           float steep = 1.0 - smoothstep(0.62, 0.88, normalize(vWN).y);
           float rockAmt = clamp(steep * 1.25 + (n - 0.66) * 2.4, 0.0, 1.0);
           vec3 col = mix(grass, rk * vec3(1.02, 0.98, 0.92), rockAmt);
           // A path worn into the hill by every day of pushing.
           float path = 1.0 - smoothstep(0.7, 2.0, abs(vWPos.z - 0.15));
           col = mix(col, vec3(0.6, 0.47, 0.33) * (0.82 + 0.36 * n2), path * 0.55);
           // Patches where the grass is greener, and where it's burnt.
           col *= mix(vec3(0.86, 0.92, 0.78), vec3(1.08, 1.0, 0.9), n);
           diffuseColor.rgb *= col;`,
        )
    }
    return m
  }, [])
  return <mesh geometry={geo} material={mat} receiveShadow />
}

/* ---------- Scatter: grass, cypresses, olives, rocks ---------- */

function scatter(n, seed, pick) {
  const r = rng(seed)
  const out = []
  let guard = 0
  while (out.length < n && guard++ < n * 20) {
    const p = pick(r)
    if (p) out.push(p)
  }
  return out
}

function Grass() {
  const ref = useRef()
  const { geo, mat, items } = useMemo(() => {
    const g = new PlaneGeometry(0.07, 0.62, 1, 4)
    g.translate(0, 0.31, 0)
    // Taper to a point.
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) / 0.66))
    const uniforms = { uTime: { value: 0 } }
    const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: DoubleSide })
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = uniforms.uTime
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float hh = position.y / 0.62;
         vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
         float w = sin(uTime * 1.6 + ip.x * 0.55 + ip.z * 0.3) * 0.6 + sin(uTime * 3.1 + ip.x * 1.7) * 0.25;
         transformed.x += w * hh * hh * 0.22;
         transformed.z += w * hh * hh * 0.08;`,
      )
    }
    m.userData.uniforms = uniforms
    const items = scatter(14000, 11, (r) => {
      const x = -16 + r() * 76
      const z = -6 + Math.pow(r(), 0.8) * 16
      if (Math.abs(z - 0.15) < 1.1 && r() > 0.12) return null
      return { x, z, y: heightAt(x, z), s: 0.6 + r() * 0.9, a: r() * Math.PI * 2, tilt: (r() - 0.5) * 0.5, c: r() }
    })
    return { geo: g, mat: m, items }
  }, [])
  useEffect(() => {
    const im = ref.current
    const o = new Object3D()
    const cols = ['#c9a95e', '#b8954a', '#d9c07c', '#a48d4d', '#c2b071', '#9a8a52'].map((c) => new Color(c))
    items.forEach((it, i) => {
      o.position.set(it.x, it.y - 0.02, it.z)
      o.rotation.set(it.tilt, it.a, it.tilt * 0.5)
      o.scale.set(1, it.s, 1)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      im.setColorAt(i, cols[Math.floor(it.c * cols.length)])
    })
    im.instanceMatrix.needsUpdate = true
    im.instanceColor.needsUpdate = true
  }, [items])
  useFrame((s) => (mat.userData.uniforms.uTime.value = s.clock.elapsedTime))
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} receiveShadow frustumCulled={false} />
}

function cypressGeometry() {
  const pts = []
  for (let i = 0; i <= 18; i++) {
    const h = i / 18
    const r = 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(h, 0.62)), 0.9) * (1 - h * 0.35) + 0.02
    pts.push(new Vector2(r, h))
  }
  let g = new LatheGeometry(pts, 12)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  g = mergeVertices(g)
  const p = g.attributes.position
  const v = new Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const k = 1 + 0.18 * Math.sin(v.y * 23 + Math.atan2(v.z, v.x) * 3) + 0.1 * Math.sin(v.y * 51)
    p.setXYZ(i, v.x * k, v.y, v.z * k)
  }
  g.computeVertexNormals()
  return g
}

function canopyGeometry() {
  const r = rng(5)
  const parts = []
  for (let i = 0; i < 5; i++) {
    let s = new IcosahedronGeometry(0.55 + r() * 0.3, 2)
    s.deleteAttribute('uv')
    s.deleteAttribute('normal')
    s = mergeVertices(s)
    const p = s.attributes.position
    const v = new Vector3()
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k)
      v.multiplyScalar(1 + (Math.sin(v.x * 9) * Math.sin(v.z * 7) + Math.sin(v.y * 11)) * 0.07)
      p.setXYZ(k, v.x, v.y * 0.7, v.z)
    }
    s.translate((r() - 0.5) * 1.3, 1.5 + r() * 0.5, (r() - 0.5) * 0.9)
    parts.push(s)
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

function Trees() {
  const cyp = useRef()
  const can = useRef()
  const trunk = useRef()
  const data = useMemo(() => {
    const cy = scatter(90, 21, (r) => {
      const x = -30 + r() * 105
      const z = -4.5 - Math.pow(r(), 0.7) * 34
      return { x, z, y: heightAt(x, z) - 0.3, h: 3.5 + r() * 5.5, w: 0.8 + r() * 0.5, c: r() }
    })
    // A few cypresses in groups, the way they're planted.
    const r = rng(9)
    for (let i = 0; i < 6; i++) {
      const x = -10 + r() * 70
      const z = -6 - r() * 6
      for (let k = 0; k < 3; k++) {
        const xx = x + k * 0.9 + r() * 0.3
        cy.push({ x: xx, z: z + r() * 0.6, y: heightAt(xx, z) - 0.3, h: 5 + r() * 4, w: 0.85, c: r() })
      }
    }
    const ol = scatter(46, 33, (r) => {
      const x = -25 + r() * 95
      const z = -3.8 - Math.pow(r(), 0.8) * 24
      return { x, z, y: heightAt(x, z) - 0.1, s: 0.9 + r() * 0.8, a: r() * 6.28, c: r() }
    })
    return { cy, ol, cypGeo: cypressGeometry(), canGeo: canopyGeometry() }
  }, [])
  useEffect(() => {
    const o = new Object3D()
    const greens = ['#2e3b22', '#34432a', '#283420', '#3a4a2c'].map((c) => new Color(c))
    data.cy.forEach((t, i) => {
      o.position.set(t.x, t.y, t.z)
      o.rotation.set(0, t.c * 6, 0)
      o.scale.set(t.w, t.h, t.w)
      o.updateMatrix()
      cyp.current.setMatrixAt(i, o.matrix)
      cyp.current.setColorAt(i, greens[Math.floor(t.c * greens.length)])
    })
    const silvers = ['#7d8a5c', '#8a9466', '#6f7b52'].map((c) => new Color(c))
    data.ol.forEach((t, i) => {
      o.position.set(t.x, t.y, t.z)
      o.rotation.set(0, t.a, 0)
      o.scale.setScalar(t.s)
      o.updateMatrix()
      can.current.setMatrixAt(i, o.matrix)
      can.current.setColorAt(i, silvers[Math.floor(t.c * silvers.length)])
      o.position.y += 0.75 * t.s
      o.updateMatrix()
      trunk.current.setMatrixAt(i, o.matrix)
    })
    for (const m of [cyp.current, can.current, trunk.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [data])
  return (
    <>
      <instancedMesh ref={cyp} args={[data.cypGeo, undefined, data.cy.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={can} args={[data.canGeo, undefined, data.ol.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, data.ol.length]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 1.7, 7]} />
        <meshStandardMaterial color="#5b4a39" roughness={1} />
      </instancedMesh>
    </>
  )
}

function Rocks() {
  const ref = useRef()
  const { geo, items } = useMemo(() => {
    let g = new IcosahedronGeometry(1, 1)
    const p = g.attributes.position
    const r = rng(77)
    const v = new Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      v.multiplyScalar(0.8 + 0.35 * Math.abs(Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7)))
      p.setXYZ(i, v.x, v.y * 0.62, v.z)
    }
    g = mergeVertices(g)
    g.computeVertexNormals()
    const items = scatter(130, 41, () => {
      const x = -18 + r() * 80
      const z = -10 + r() * 20
      if (Math.abs(z - 0.15) < 1.6) return null
      const s = 0.18 + Math.pow(r(), 2.2) * 1.3
      return { x, z, y: heightAt(x, z) - s * 0.25, s, a: r() * 6.28, b: r() * 0.5 }
    })
    return { geo: g, items }
  }, [])
  useEffect(() => {
    const o = new Object3D()
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z)
      o.rotation.set(it.b, it.a, it.b * 0.6)
      o.scale.set(it.s * 1.2, it.s, it.s)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items])
  const map = useMemo(() => tex('/art/hero/rock.jpg', { repeat: true }), [])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial map={map} color="#e6dccb" roughness={0.92} flatShading />
    </instancedMesh>
  )
}

/* ---------- The boulder: limestone with gold in its cracks ---------- */

function Boulder() {
  const ref = useRef()
  const { geo, mat, uniforms } = useMemo(() => {
    let g = new IcosahedronGeometry(1, 48)
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    g = mergeVertices(g)
    const p = g.attributes.position
    const v = new Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize()
      const k =
        1 +
        0.04 * Math.sin(v.x * 4.1 + v.y * 2.7) * Math.cos(v.z * 3.3) +
        0.018 * Math.sin(v.x * 11 + v.z * 9) * Math.sin(v.y * 13) +
        0.008 * Math.sin(v.x * 31 + v.y * 27 + v.z * 23)
      p.setXYZ(i, v.x * k, v.y * k, v.z * k)
    }
    g.computeVertexNormals()
    const uniforms = {
      uRock: { value: tex('/art/hero/rock.jpg', { repeat: true }) },
      uGlow: { value: 0.3 },
      uGold: { value: new Color('#ffb85c') },
    }
    const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0 })
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms)
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vO;\nvarying vec3 vON;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvO = position;\nvON = normal;')
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform sampler2D uRock;
           uniform float uGlow;
           uniform vec3 uGold;
           varying vec3 vO;
           varying vec3 vON;
           ${snoise}`,
        )
        .replace(
          '#include <map_fragment>',
          `vec3 bw = pow(abs(normalize(vON)), vec3(4.0));
           bw /= dot(bw, vec3(1.0));
           vec3 rock = texture2D(uRock, vO.yz * 0.8).rgb * bw.x + texture2D(uRock, vO.zx * 0.8).rgb * bw.y + texture2D(uRock, vO.xy * 0.8).rgb * bw.z;
           float n = snoise(vO * 2.2);
           rock *= 0.86 + 0.22 * n;
           // Kintsugi: thin ridged-noise veins filled with gold.
           float r1 = 1.0 - abs(snoise(vO * 1.6 + 3.0));
           float r2 = 1.0 - abs(snoise(vO * 3.4 - 7.0));
           float vein = smoothstep(0.955, 0.99, r1) + smoothstep(0.972, 0.995, r2) * 0.7;
           vein = clamp(vein, 0.0, 1.0);
           diffuseColor.rgb *= mix(rock * vec3(1.0, 0.96, 0.9), uGold * 0.9, vein);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, 0.28, vein);`,
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
           metalnessFactor = mix(metalnessFactor, 1.0, vein);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           totalEmissiveRadiance += uGold * vein * uGlow;`,
        )
    }
    return { geo: g, mat: m, uniforms }
  }, [])
  const q = useMemo(() => new Quaternion(), [])
  const axis = useMemo(() => new Vector3(0, 0, 1), [])
  useFrame((s, dt) => {
    const b = climb.ball
    const m = ref.current
    const lift = 1 - Math.pow(1 - climb.intro, 3)
    m.position.set(toX(b.x), toY(b.y) + climb.hop.z * F + (1 - lift) * 5, 0)
    q.setFromAxisAngle(axis, b.spin)
    m.quaternion.copy(q)
    m.scale.setScalar(R3 * (b.released ? 1 : b.respawn))
    // The gold wakes as the climb goes on, and when you touch it.
    const target = 0.25 + (climb.u / CLIMB) * 1.4 + (climb.hover ? 1.2 : 0) + Math.sin(s.clock.elapsedTime * 2) * 0.08
    uniforms.uGlow.value += (target - uniforms.uGlow.value) * Math.min(1, dt * 4)
  })
  return (
    <mesh
      ref={ref}
      geometry={geo}
      material={mat}
      castShadow
      receiveShadow
      onPointerOver={() => {
        climb.hover = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        climb.hover = false
        document.body.style.cursor = ''
      }}
      onClick={() => {
        if (climb.hop.z <= 0) climb.hop.v = 900
      }}
    />
  )
}

/* ---------- The statue: a posed cut-out on a plane ---------- */

function Statue() {
  const ref = useRef()
  const [t, setT] = useState(null)
  useEffect(() => {
    // The figure exists after the first climb step.
    const id = requestAnimationFrame(function wait() {
      if (climb.figure) setT(canvasTex(climb.figure.canvas))
      else requestAnimationFrame(wait)
    })
    return () => cancelAnimationFrame(id)
  }, [])
  const depth = useMemo(() => (t ? new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: t, alphaTest: 0.5 }) : null), [t])
  const last = useRef(-1)
  useFrame(() => {
    const f = climb.figure
    if (!f || !t || !ref.current) return
    if (f.version !== last.current) {
      last.current = f.version
      t.needsUpdate = true
    }
    const r = f.rect
    ref.current.position.set(toX(r.x + r.w / 2), toY(r.y + r.h / 2), 0.35)
    ref.current.scale.set(r.w * F, r.h * F, 1)
    ref.current.material.opacity = smooth(0.25, 1, climb.intro)
  })
  if (!t) return null
  return (
    <mesh ref={ref} castShadow customDepthMaterial={depth}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={t} transparent alphaTest={0.04} color="#fff1df" />
    </mesh>
  )
}

/* ---------- Stelae: the story, carved below the path ---------- */

function marble(g, w, h, seed) {
  const r = rng(seed)
  const grd = g.createLinearGradient(0, 0, w, h)
  grd.addColorStop(0, '#efe6d6')
  grd.addColorStop(1, '#e2d6c2')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  g.globalAlpha = 0.18
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = r() < 0.5 ? '#b9ab95' : '#fffaf0'
    g.lineWidth = 0.6 + r() * 1.6
    g.beginPath()
    let x = r() * w
    let y = r() * h
    g.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.3) * 120
      y += (r() - 0.5) * 60
      g.lineTo(x, y)
    }
    g.stroke()
  }
  g.globalAlpha = 1
}

// Text cut into stone: a dark floor with a lit lower lip.
function carve(g, draw) {
  g.save()
  g.fillStyle = 'rgba(255,250,240,0.85)'
  g.translate(1.5, 2)
  draw()
  g.restore()
  g.fillStyle = 'rgba(64,50,36,0.9)'
  draw()
}

function steleCanvases(beat, i) {
  const W = 1200
  const H = 760
  const blank = canvas(W, H)
  marble(blank.getContext('2d'), W, H, 100 + i)
  const c = canvas(W, H)
  const g = c.getContext('2d')
  g.drawImage(blank, 0, 0)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `600 30px ${SANS}`
  carve(g, () => spaced(g, ['I', 'II', 'III', 'IV', 'V'][i] ?? '', W / 2, 120, 10))
  g.font = `600 84px ${SERIF}`
  carve(g, () => spaced(g, beat.title.toUpperCase(), W / 2, 250, 6))
  g.fillStyle = 'rgba(64,50,36,0.5)'
  g.fillRect(W / 2 - 140, 330, 280, 3)
  g.font = `italic 500 56px ${SERIF}`
  beat.lines.forEach((l, k) => carve(g, () => g.fillText(l, W / 2, 440 + k * 78)))
  return { blank, c }
}

function Stele({ beat, i }) {
  const ref = useRef()
  const [mats, setMats] = useState(null)
  const x = toX(X_START + beat.u) + 1.4
  const z = 3.5
  const y = heightAt(x, z) - 0.15
  useEffect(() => {
    let alive = true
    whenFonts().then(() => {
      if (!alive) return
      const { blank, c } = steleCanvases(beat, i)
      const uniforms = { uBlank: { value: canvasTex(blank) }, uCarve: { value: 0 } }
      const m = new MeshStandardMaterial({ map: canvasTex(c), roughness: 0.62 })
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, uniforms)
        s.fragmentShader = s.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D uBlank;\nuniform float uCarve;')
          .replace(
            '#include <map_fragment>',
            `vec4 cut = texture2D(map, vMapUv);
             vec4 raw = texture2D(uBlank, vMapUv);
             float k = smoothstep(vMapUv.x - 0.04, vMapUv.x + 0.04, uCarve * 1.1 - 0.05);
             diffuseColor *= mix(raw, cut, k);`,
          )
      }
      m.userData.uniforms = uniforms
      setMats(m)
    })
    return () => {
      alive = false
    }
  }, [beat, i])
  useFrame(() => {
    if (!mats) return
    const reached = climb.ball.maxX - X_START - (beat.u - 900)
    mats.userData.uniforms.uCarve.value = smooth(0, 700, reached)
  })
  const stone = <meshStandardMaterial color="#e9e0d0" roughness={0.7} />
  const pediment = useMemo(() => {
    const s = new Shape()
    s.moveTo(-1.7, 0)
    s.lineTo(1.7, 0)
    s.lineTo(0, 0.5)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: false })
    g.translate(0, 0, -0.21)
    return g
  }, [])
  return (
    <group ref={ref} position={[x, y, z]} rotation={[0, -0.14, (i % 2 ? 1 : -1) * 0.025]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.32, 0.72]} />
        {stone}
      </mesh>
      <mesh position={[0, 1.27, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.9, 0.34]} />
        {stone}
      </mesh>
      {mats && (
        <mesh position={[0, 1.27, 0.172]} material={mats}>
          <planeGeometry args={[3.2, 1.9]} />
        </mesh>
      )}
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[3.45, 0.16, 0.48]} />
        {stone}
      </mesh>
      <mesh geometry={pediment} position={[0, 2.38, 0]} castShadow>
        {stone}
      </mesh>
    </group>
  )
}

/* ---------- The swallow and its ribbon ---------- */

function wingGeometry() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.25, 0.05, 0.6, 0.12, 1.15, 0.02)
  s.bezierCurveTo(0.7, -0.06, 0.35, -0.2, 0.05, -0.26)
  s.closePath()
  const g = new ShapeGeometry(s, 12)
  // Lay the wing out along +z, sweeping back along -x.
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    p.setXYZ(i, y * 1.1 - x * 0.35, x * 0.08, x)
  }
  g.computeVertexNormals()
  return g
}

function ribbonCanvas(text) {
  const c = canvas(2400, 220)
  const g = c.getContext('2d')
  const grd = g.createLinearGradient(0, 0, 0, 220)
  grd.addColorStop(0, '#f6ead2')
  grd.addColorStop(0.5, '#efe0c2')
  grd.addColorStop(1, '#e4d0ac')
  g.fillStyle = grd
  g.fillRect(0, 0, 2400, 220)
  g.fillStyle = '#b58a4c'
  g.fillRect(0, 14, 2400, 4)
  g.fillRect(0, 202, 2400, 4)
  g.fillStyle = '#3b2c1e'
  g.font = `600 92px ${SERIF}`
  g.textBaseline = 'middle'
  spaced(g, text, 1200, 114, 14)
  return c
}

const ribbonVert = (s) =>
  s.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     float a = clamp(-position.x / 6.6, 0.0, 1.0);
     transformed.y += sin(position.x * 0.95 + uTime * 3.4) * 0.26 * a - a * a * 0.55;
     transformed.z += sin(position.x * 0.6 - uTime * 2.2) * 0.55 * a;`,
  )

function Bird() {
  const group = useRef()
  const wl = useRef()
  const wr = useRef()
  const ribbon = useRef()
  const wing = useMemo(wingGeometry, [])
  const state = useMemo(() => ({ pos: new Vector3(-4, 9, 2), beat: -1, mix: 1, t0: 0 }), [])
  const { mat, uniforms } = useMemo(() => {
    const uniforms = { uTime: { value: 0 }, uMap2: { value: null }, uMix: { value: 1 } }
    const m = new MeshStandardMaterial({ roughness: 0.75, side: DoubleSide })
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms)
      s.vertexShader = ribbonVert(s.vertexShader)
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uMap2;\nuniform float uMix;')
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
             diffuseColor *= mix(texture2D(map, vMapUv), texture2D(uMap2, vMapUv), uMix);
           #endif`,
        )
    }
    return { mat: m, uniforms }
  }, [])
  const ribbonGeo = useMemo(() => {
    const g = new PlaneGeometry(6.6, 0.62, 140, 2)
    g.translate(-3.3, 0, 0)
    return g
  }, [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    uniforms.uTime.value = t
    // A new line on the ribbon whenever the story moves on.
    if (climb.beat !== state.beat) {
      const ready = document.fonts ? document.fonts.check(`600 92px ${SERIF}`) : true
      if (ready || t - state.t0 > 2) {
        state.beat = climb.beat
        const c = canvasTex(ribbonCanvas(BEATS[climb.beat].ribbon))
        if (!mat.map) {
          mat.map = c
          uniforms.uMap2.value = c
          mat.needsUpdate = true
        } else {
          mat.map = uniforms.uMap2.value
          uniforms.uMap2.value = c
          uniforms.uMix.value = 0
        }
      }
    }
    uniforms.uMix.value = Math.min(1, uniforms.uMix.value + dt * 1.5)

    const b = climb.ball
    const bx = Math.min(toX(b.released ? X_SUMMIT : b.x), toX(X_SUMMIT))
    const by = toY(b.released ? climb.figure.rect.y + 200 : b.y)
    const hero = 1 - smooth(0, 600, climb.u)
    const target = new Vector3(bx + 1.4 + hero * 1.2, by + 4.4 + hero * 0.8 + Math.sin(t * 0.8) * 0.3, 1.2)
    const prevY = state.pos.y
    state.pos.lerp(target, 1 - Math.exp(-dt * 1.8))
    group.current.position.copy(state.pos)
    group.current.rotation.z = Math.max(-0.4, Math.min(0.4, (state.pos.y - prevY) / Math.max(dt, 1e-3) * 0.08))
    const flap = Math.sin(t * 11) * 0.85 + 0.15
    wl.current.rotation.x = -flap
    wr.current.rotation.x = flap
  })

  return (
    <group ref={group} scale={1.25}>
      <mesh scale={[1.9, 0.72, 0.78]} castShadow>
        <sphereGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color="#1d2130" roughness={0.55} />
      </mesh>
      <mesh position={[0.06, -0.06, 0]} scale={[1.5, 0.5, 0.62]}>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial color="#e9d6b6" roughness={0.8} />
      </mesh>
      <mesh position={[0.38, 0.05, 0]}>
        <sphereGeometry args={[0.12, 14, 10]} />
        <meshStandardMaterial color="#7a2e1c" roughness={0.6} />
      </mesh>
      <mesh position={[0.52, 0.04, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.035, 0.12, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[-0.5, 0.0, 0.05 * k]} rotation={[0, 0.25 * k, 0]} scale={[0.6, 1, 1]}>
          <coneGeometry args={[0.05, 0.6, 4]} />
          <meshStandardMaterial color="#1d2130" />
        </mesh>
      ))}
      <group ref={wl} position={[0.02, 0.06, 0.1]}>
        <mesh geometry={wing}>
          <meshStandardMaterial color="#232838" roughness={0.6} side={DoubleSide} />
        </mesh>
      </group>
      <group ref={wr} position={[0.02, 0.06, -0.1]} scale={[1, 1, -1]}>
        <mesh geometry={wing}>
          <meshStandardMaterial color="#232838" roughness={0.6} side={DoubleSide} />
        </mesh>
      </group>
      <mesh ref={ribbon} geometry={ribbonGeo} material={mat} position={[-0.25, -0.22, 0]} scale={0.8} />
    </group>
  )
}

/* ---------- Pollen in the low sun ---------- */

const moteVert = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.3 + aSeed * 40.0) * 0.5;
    p.x += uTime * (0.08 + aSeed * 0.1);
    p.x = mod(p.x + 20.0, 90.0) - 20.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float near = smoothstep(2.0, 5.0, -mv.z);
    vA = near * (0.35 + 0.65 * sin(uTime * 1.4 + aSeed * 50.0) * 0.5 + 0.3);
    gl_PointSize = min((1.0 + aSeed * 2.2) * uScale / -mv.z, uScale * 0.4);
    gl_Position = projectionMatrix * mv;
  }
`
const moteFrag = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * smoothstep(0.5, 0.0, d) * vA, 1.0);
  }
`

function Motes() {
  const geo = useMemo(() => {
    const n = 900
    const r = rng(3)
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = -20 + r() * 90
      const z = -8 + r() * 16
      pos[i * 3] = x
      pos[i * 3 + 1] = heightAt(x, 0) + 0.5 + r() * 9
      pos[i * 3 + 2] = z
      seed[i] = r()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 6 } }), [])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uScale.value = (s.size.height * s.viewport.dpr) / 160
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial uniforms={uniforms} vertexShader={moteVert} fragmentShader={moteFrag} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}

/* ---------- Sun and camera ---------- */

function Sun() {
  const ref = useRef()
  useFrame(() => {
    const b = climb.ball
    const x = Math.min(toX(b.x), toX(X_SUMMIT))
    const y = toY(b.y)
    ref.current.position.set(x + 22, y + 17, -9)
    ref.current.target.position.set(x - 2, y - 2, 1)
    ref.current.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={ref}
      color="#ffcf98"
      intensity={3.1}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-15}
      shadow-camera-right={15}
      shadow-camera-top={13}
      shadow-camera-bottom={-11}
      shadow-camera-near={1}
      shadow-camera-far={80}
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
    />
  )
}

function Rig() {
  const look = useMemo(() => new Vector3(), [])
  const want = useMemo(() => ({ pos: new Vector3(), at: new Vector3(), init: false }), [])
  useFrame(({ camera, size }, dt) => {
    const b = climb.ball
    const bx = Math.min(toX(b.released ? X_SUMMIT : b.bx), toX(X_SUMMIT))
    const by = toY(b.released ? climb.figure?.rect.y + 150 : b.y)
    const h = smooth(0, 560, climb.u)
    const narrow = size.width / size.height < 0.9
    // Opening: close, the pair on the right and sky above for the title.
    // Climbing: further back, with room for the ribbon above and the stelae below.
    const hx = narrow ? bx - 2 : bx - 0.6
    want.pos.set(mix(hx, bx - 1.7, h), mix(by + 1.6, by + 2.2, h), mix(narrow ? 19 : 14, narrow ? 24 : 17.5, h))
    want.at.set(mix(hx, bx - 1.3, h), mix(by + 1.75, by + 0.55, h), 0)
    want.pos.x += input.nx * 0.5
    want.pos.y += input.ny * 0.3
    const k = 1 - Math.exp(-dt * 4)
    if (!want.init) {
      want.init = true
      camera.position.copy(want.pos)
      look.copy(want.at)
    }
    camera.position.lerp(want.pos, k)
    look.lerp(want.at, k)
    camera.lookAt(look)
  })
  return null
}

export default function HeroScene() {
  return (
    <>
      <color attach="background" args={['#e9cfa6']} />
      <fogExp2 attach="fog" args={['#e8cba2', 0.0125]} />
      <hemisphereLight args={['#ffe8c8', '#6a4a2c', 1.05]} />
      <Sun />
      <Driver />
      <Backdrop />
      <Terrain />
      <Grass />
      <Trees />
      <Rocks />
      <Boulder />
      <Statue />
      {BEATS.slice(1).map((b, i) => (
        <Stele key={b.u} beat={b} i={i} />
      ))}
      <Bird />
      <Motes />
      <Rig />
      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.85} luminanceSmoothing={0.3} />
        <Painterly radius={3} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

