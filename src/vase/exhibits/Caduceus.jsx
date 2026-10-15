import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, CatmullRomCurve3, CylinderGeometry, DoubleSide, MeshStandardMaterial, Shape, ShapeGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { hall, T, smooth, mix } from '../hall.js'
import { JOBS, tradeOf } from '../../hermes/jobs.js'
import { agora } from '../../agora/state.js'

const TAU = Math.PI * 2
const TOP = 1.15
const bronze = { color: '#b58b52', metalness: 0.9, roughness: 0.3 }
const marble = { color: '#e9e1d3', roughness: 0.48, metalness: 0.02 }
const nearest = [...JOBS].sort((a, b) => distance(a) - distance(b)).slice(0, 3)
const flutes = Array.from({ length: 20 }, (_, i) => i * TAU / 20)
const feathers = Array.from({ length: 6 }, (_, i) => i)
const stop = (e) => e.stopPropagation()

function distance(job) {
  return Math.hypot(job.x + 0.6, job.z - 0.3)
}

function jobFace(job) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const g = canvas.getContext('2d')
  g.fillStyle = '#c65b2b'
  g.beginPath()
  g.arc(256, 256, 250, 0, TAU)
  g.fill()
  g.strokeStyle = '#e8b06a'
  g.lineWidth = 5
  g.beginPath()
  g.arc(256, 256, 237, 0, TAU)
  g.stroke()
  g.fillStyle = '#f3eadb'
  g.textAlign = 'center'
  const font = '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  g.font = `500 29px ${font}`
  g.fillText(tradeOf(job.trade)?.label || job.trade, 256, 136)
  g.font = `600 92px ${font}`
  g.fillText(`₹${job.pay}`, 256, 251)
  g.font = `400 37px ${font}`
  g.fillText(`/ ${job.unit}`, 256, 308)
  g.font = `500 34px ${font}`
  g.fillText(`${(distance(job) * 0.75).toFixed(1)} km`, 256, 391)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  return map
}

function Medallion({ job, index, reduced, active }) {
  const root = useRef()
  const face = useRef()
  const hover = useRef(false)
  const previousCursor = useRef(null)
  const map = useMemo(() => jobFace(job), [job])
  const restore = () => {
    hover.current = false
    if (previousCursor.current !== null) document.body.style.cursor = previousCursor.current
    previousCursor.current = null
  }

  useEffect(() => () => {
    restore()
    map.dispose()
  }, [map])

  useFrame((state, dt) => {
    if (!active.current) {
      restore()
      return
    }
    const t = reduced.current ? 0 : state.clock.elapsedTime
    const angle = index * TAU / 3 + t * (0.12 + index * 0.015)
    root.current.position.set(Math.cos(angle) * 0.75, TOP + 1.8 + index * 0.4, Math.sin(angle) * 0.75)
    // The parent only translates, so the camera quaternion is also local.
    face.current.quaternion.copy(state.camera.quaternion)
    const scale = mix(root.current.scale.x, hover.current ? 1.15 : 1, 1 - Math.exp(-Math.min(dt, 0.1) * 12))
    root.current.scale.setScalar(scale)
  })

  return (
    <group
      ref={root}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!active.current) return
        hover.current = true
        if (previousCursor.current === null) previousCursor.current = document.body.style.cursor
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        restore()
      }}
      onPointerDown={stop}
      onPointerUp={stop}
      onPointerMove={stop}
      onPointerCancel={(e) => {
        stop(e)
        restore()
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (active.current && e.delta < 6) agora.show(job.trade)
      }}
    >
      <mesh>
        <sphereGeometry args={[0.34, 32, 20]} />
        <meshPhysicalMaterial color="#fff6e2" transmission={0.9} thickness={0.15} roughness={0.05} attenuationColor="#e8b06a" attenuationDistance={2} ior={1.45} />
      </mesh>
      <mesh ref={face}>
        <circleGeometry args={[0.285, 64]} />
        <meshBasicMaterial map={map} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function Caduceus({ standalone = false }) {
  const root = useRef()
  const wings = useRef([])
  const light = useRef()
  const reduced = useRef(false)
  const active = useRef(false)
  const geometry = useMemo(() => {
    const serpents = [0, Math.PI].map((phase) => {
      const points = Array.from({ length: 121 }, (_, i) => {
        const u = i / 120
        const angle = u * TAU * 2.4 + phase
        const radius = 0.16 + u * 0.025
        return new Vector3(Math.cos(angle) * radius, TOP + 0.15 + u * 1.75, Math.sin(angle) * radius)
      })
      return new TubeGeometry(new CatmullRomCurve3(points), 160, 0.035, 10, false)
    })
    const shape = new Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(0.14, 0.18, 0.55, 0.28, 0.83, 0.16)
    shape.bezierCurveTo(0.59, 0.12, 0.27, -0.05, 0, 0)
    const feather = new ShapeGeometry(shape, 20)
    // A shallow cup catches the gallery's light across each feather.
    const positions = feather.attributes.position
    for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getX(i) / 0.83 * Math.PI) * 0.055)
    feather.computeVertexNormals()
    return {
      serpents,
      feather,
      flute: new CylinderGeometry(0.035, 0.045, 0.82, 10),
      marble: new MeshStandardMaterial(marble),
      bronze: new MeshStandardMaterial(bronze),
      gold: new MeshStandardMaterial({ color: '#d8ad5c', metalness: 1, roughness: 0.25, side: DoubleSide }),
      patina: new MeshStandardMaterial({ color: '#7d7a4a', metalness: 0.85, roughness: 0.3 }),
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = query.matches }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => () => {
    geometry.serpents.forEach((g) => g.dispose())
    geometry.feather.dispose()
    geometry.flute.dispose()
    geometry.marble.dispose()
    geometry.bronze.dispose()
    geometry.gold.dispose()
    geometry.patina.dispose()
  }, [geometry])

  useFrame((state) => {
    const p = hall.p
    const [a, b] = T.chapters[0]
    const reveal = standalone ? 1 : smooth(a, a + 0.03, p) * (1 - smooth(b - 0.03, b, p))
    active.current = standalone || (hall.active && p > a && p < b && reveal > 0)
    root.current.visible = active.current
    root.current.position.y = standalone ? -2.2 : -1.2 - 4.2 * (1 - reveal)
    const t = reduced.current ? 0 : state.clock.elapsedTime
    for (let i = 0; i < 2; i++) wings.current[i].rotation.y = (i === 0 ? -1 : 1) * Math.sin(t * TAU * 0.6) * 0.08
    light.current.intensity = active.current ? (0.55 + Math.sin(t * 0.9) * 0.08) * reveal : 0
  }, -1)

  return (
    <group ref={root} position={standalone ? [0, -2.2, 0] : [-2.45, -5.4, -0.6]} visible={false}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.02, 0.18, 1.02]} />
        <primitive object={geometry.marble} attach="material" />
      </mesh>
      <mesh position={[0, 0.61, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.4, 0.86, 64]} />
        <primitive object={geometry.marble} attach="material" />
      </mesh>
      {flutes.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.36, 0.61, Math.sin(a) * 0.36]} castShadow receiveShadow>
          <primitive object={geometry.flute} attach="geometry" />
          <primitive object={geometry.marble} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 1.075, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.15, 1]} />
        <primitive object={geometry.marble} attach="material" />
      </mesh>
      <group position={[0, TOP, 0]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.21, 0.12, 32]} />
          <primitive object={geometry.bronze} attach="material" />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.055, 2.16, 24]} />
          <primitive object={geometry.bronze} attach="material" />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
          <sphereGeometry args={[0.1, 24, 16]} />
          <meshStandardMaterial {...bronze} emissive="#e8b06a" emissiveIntensity={0.3} />
        </mesh>
        <pointLight ref={light} position={[0, 2.2, 0]} color="#e8b06a" intensity={0} distance={3} decay={2} />
        {[-1, 1].map((side, index) => (
          <group key={side} ref={(el) => { wings.current[index] = el }} position={[side * 0.06, 1.94, 0]}>
            <group scale={[side, 1, 1]}>
              {feathers.map((i) => (
                <mesh key={i} geometry={geometry.feather} rotation-z={-0.45 + i * 0.2} position={[i * 0.012, i * 0.015, i * 0.012]} scale={1 - i * 0.065} castShadow>
                  <primitive object={geometry.gold} attach="material" />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>
      {geometry.serpents.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <primitive object={geometry.patina} attach="material" />
        </mesh>
      ))}
      {nearest.map((job, index) => <Medallion key={job.id} job={job} index={index} reduced={reduced} active={active} />)}
    </group>
  )
}
