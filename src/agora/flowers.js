// A three.js layer drawn inside the MapLibre map: one glass-petalled flower
// per job, standing on the real street where the work is, and the small
// messengers that fly to a flower when you send word. It shares the map's
// WebGL context and depth buffer, so buildings hide flowers behind them.

import * as maplibregl from 'maplibre-gl'
import { createAgoraLandmarks } from './landmarks.js'
import { disposeObject } from '../world/balance.js'
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Camera,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'

/* ---------- Geometry ---------- */

function petals() {
  const pos = []
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
  layer(7, 0.46, 0.17, 0, 0)
  layer(5, 0.32, 0.13, 1, 0.45)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
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
  s.quadraticCurveTo(0.13, 0.15, 0, 0.42)
  s.quadraticCurveTo(-0.13, 0.15, 0, 0)
  return new ShapeGeometry(s, 8)
}

// Petals open on a hinge in the vertex shader, so one geometry serves every
// flower and every state.
function petalMaterial(color) {
  const u = { uOpen: { value: 0 }, uTime: { value: 0 }, uSway: { value: 0 }, uGlow: { value: 0 } }
  const m = new MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    sheen: 0.8,
    sheenColor: new Color('#fff1dc'),
    side: DoubleSide,
    transparent: true,
    opacity: 0.92,
    emissive: new Color(color),
  })
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u)
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
         float tilt = mix(0.1, 1.45 - aLayer * 0.5, uOpen) + sin(uTime * 1.6 + aAng * 2.0) * (0.03 + uSway * 0.1);
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
         totalEmissiveRadiance *= uGlow * (0.3 + vPV);`,
      )
  }
  m.userData.u = u
  return m
}

/* ---------- Layer ---------- */

const UP = 1.6 // flower height in model units

export function createFlowerLayer({ read, colorOf }) {
  let map
  let renderer
  let animationTimer
  const scene = new Scene()
  const camera = new Camera()
  const root = new Group()
  scene.add(root)
  scene.add(new HemisphereLight('#fff4e4', '#c9a27a', 1.8))
  scene.add(new AmbientLight('#ffffff', 0.5))
  const sun = new DirectionalLight('#ffe2bd', 2.2)
  sun.position.set(-0.5, 1, 0.8)
  scene.add(sun)

  const petalGeo = petals()
  const leafGeo = leaf()
  const flowers = new Map() // id -> { group, head, mat, ring, h }
  const flights = []
  const landmarks = createAgoraLandmarks(root)
  let previousTime = performance.now()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let origin = null
  let unit = 1 // mercator units per metre at the origin
  const t0 = performance.now()

  function flowerFor(job) {
    const g = new Group()
    const h = 1.0 + (((job.x * 7.3 + job.z * 3.1) % 1) + 1) % 1 * 0.45
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.05, h * 0.4, 0.02), new Vector3(-0.03, h * 0.75, 0), new Vector3(0, h, 0)])
    const stemMat = new MeshStandardMaterial({ color: '#56743a', roughness: 0.6 })
    g.add(new Mesh(new TubeGeometry(curve, 20, 0.03, 6, false), stemMat))
    const leafMat = new MeshStandardMaterial({ color: '#6c8c45', roughness: 0.55, side: DoubleSide })
    const l1 = new Mesh(leafGeo, leafMat)
    l1.position.y = h * 0.3
    l1.rotation.set(0.9, 0.4, -0.6)
    const l2 = new Mesh(leafGeo, leafMat)
    l2.position.y = h * 0.48
    l2.rotation.set(-0.9, -2.4, 0.6)
    l2.scale.setScalar(0.8)
    g.add(l1, l2)
    const head = new Group()
    head.position.y = h
    const mat = petalMaterial(colorOf(job.trade))
    head.add(new Mesh(petalGeo, mat))
    const heart = new Mesh(new SphereGeometry(0.07, 16, 12), new MeshStandardMaterial({ color: '#e9ba5c', emissive: '#c98a2a', emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.4 }))
    heart.position.y = 0.03
    head.add(heart)
    g.add(head)
    const ring = new Mesh(new TorusGeometry(0.32, 0.018, 8, 48), new MeshStandardMaterial({ color: '#f0c46a', emissive: '#e0a83a', emissiveIntensity: 1.6, metalness: 0.8, roughness: 0.25 }))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.02
    ring.visible = false
    g.add(ring)
    root.add(g)
    return { group: g, head, mat, ring, h, scale: 1 }
  }

  function local(lngLat) {
    const mc = maplibregl.MercatorCoordinate.fromLngLat(lngLat, 0)
    return new Vector3((mc.x - origin.x) / unit, 0, (mc.y - origin.y) / unit)
  }

  return {
    id: 'ergon-flowers',
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m
      renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
      animationTimer = setInterval(() => { if (read().active && !reduced.matches) map.triggerRepaint() }, 1000 / 30)
    },
    onRemove() {
      clearInterval(animationTimer)
      disposeObject(scene)
      petalGeo.dispose()
      leafGeo.dispose()
      renderer?.dispose()
    },
    // Metres per model unit, so a flower stays about the same size on screen
    // at every zoom.
    scaleFor() {
      return 92 * Math.pow(2, 15 - map.getZoom())
    },
    screenHeight() {
      const mpp = (156543.034 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / Math.pow(2, map.getZoom())
      return ((this.scaleFor() * UP) / mpp) * Math.sin((map.getPitch() * Math.PI) / 180)
    },
    send(fromLngLat, job) {
      if (!origin) return
      flights.push({ a: local(fromLngLat), job, t: performance.now() })
    },
    render(gl, args) {
      const { jobs, selected, hover, sent = new Set() } = read()
      if (!origin) {
        const c = map.getCenter()
        origin = maplibregl.MercatorCoordinate.fromLngLat(c, 0)
        unit = origin.meterInMercatorCoordinateUnits()
      }
      if (!origin) return
      const stamp = performance.now()
      const dt = Math.min(.1, (stamp - previousTime) / 1000)
      previousTime = stamp
      const now = reduced.matches ? 0 : (stamp - t0) / 1000
      const k = this.scaleFor()
      landmarks.update(now, dt, k, local, read().weights, reduced.matches)
      const seen = new Set()
      for (const j of jobs) {
        seen.add(j.id)
        let f = flowers.get(j.id)
        if (!f) {
          f = flowerFor(j)
          flowers.set(j.id, f)
        }
        f.group.position.copy(local(j.lngLat))
        const u = f.mat.userData.u
        const isSel = selected === j.id
        const isHov = hover === j.id
        const tOpen = !j.open ? 0.05 : isSel ? 1.0 : isHov ? 0.94 : 0.8
        u.uOpen.value += (tOpen - u.uOpen.value) * (reduced.matches ? 1 : 0.08)
        u.uTime.value = now + j.x
        u.uSway.value += ((isSel || isHov ? 1 : 0) - u.uSway.value) * (reduced.matches ? 1 : 0.1)
        u.uGlow.value += ((isSel ? 1.6 : isHov ? 0.8 : j.open ? 0.25 : 0) - u.uGlow.value) * 0.1
        f.mat.opacity = j.open ? 0.94 : 0.5
        const s = (j.open ? 1 : 0.7) * (isSel ? 1.25 : isHov ? 1.12 : 1)
        f.scale += (s - f.scale) * (reduced.matches ? 1 : 0.12)
        f.group.scale.setScalar(f.scale * k)
        f.head.position.y = f.h + (isSel ? Math.sin(now * 2.2) * 0.04 : 0)
        f.ring.visible = sent.has(j.id)
        f.ring.rotation.z = now * 0.8
      }
      for (const [id, f] of flowers) f.group.visible = seen.has(id)

      // Messengers: a bright seed arcing from you to the flower.
      for (let i = flights.length - 1; i >= 0; i--) {
        const fl = flights[i]
        const p = (performance.now() - fl.t) / 1700
        if (!fl.mesh) {
          fl.mesh = new Group()
          for (let q = 0; q < 10; q++) {
            const s = new Mesh(new SphereGeometry(0.09 * (1 - q / 12), 12, 8), new MeshStandardMaterial({ color: '#ffe3a0', emissive: '#f0b44a', emissiveIntensity: 2.5 - q * 0.2, transparent: true, opacity: 1 - q / 10 }))
            fl.mesh.add(s)
          }
          root.add(fl.mesh)
        }
        // Positions are in metres; the flower stands k metres per model unit.
        const f = flowers.get(fl.job.id)
        const b = local(fl.job.lngLat).setY((f ? f.h * f.scale : 1.2) * k)
        const a = fl.a.clone().setY(0.9 * k)
        const c = a.clone().lerp(b, 0.5)
        c.y += 3.5 * k
        const curve = new QuadraticBezierCurve3(a, c, b)
        fl.mesh.children.forEach((s, q) => {
          const e = Math.min(1, Math.max(0, p - q * 0.025))
          const ee = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2
          curve.getPoint(ee, s.position)
          s.scale.setScalar(k)
        })
        fl.mesh.visible = p < 1.25
        if (p > 1.3) {
          root.remove(fl.mesh)
          disposeObject(fl.mesh)
          flights.splice(i, 1)
        }
      }

      const mm = args?.defaultProjectionData?.mainMatrix ?? args
      const l = new Matrix4().makeTranslation(origin.x, origin.y, origin.z).scale(new Vector3(unit, -unit, unit)).multiply(new Matrix4().makeRotationX(Math.PI / 2))
      camera.projectionMatrix = new Matrix4().fromArray(mm).multiply(l)
      renderer.resetState()
      renderer.render(scene, camera)

    },
  }
}
