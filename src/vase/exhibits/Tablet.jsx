import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { hall, T, smooth } from '../hall.js'

export default function Tablet() {
  const root = useRef()
  const slab = useRef()
  const face = useRef()
  const { gl } = useThree()
  const texture = useRef({ canvas: null, map: null, version: null })
  const drag = useRef({ on: false, pointer: null, target: null, x: 0, time: 0, offset: 0, velocity: 0, idle: 0, hover: false, cursor: null })

  const cursor = (value) => {
    const d = drag.current
    if (d.cursor === null) d.cursor = gl.domElement.style.cursor
    gl.domElement.style.cursor = value
  }
  const restoreCursor = () => {
    const d = drag.current
    if (d.cursor !== null) gl.domElement.style.cursor = d.cursor
    d.cursor = null
  }
  const release = () => {
    const d = drag.current
    if (d.target?.hasPointerCapture?.(d.pointer)) d.target.releasePointerCapture(d.pointer)
    d.on = false
    d.target = null
    d.pointer = null
    d.idle = 0
    hall.grab = false
  }

  useEffect(() => () => {
    release()
    restoreCursor()
    texture.current.map?.dispose()
    texture.current = { canvas: null, map: null, version: null }
  }, [gl])

  useFrame((state, dt) => {
    const p = hall.p
    const [a, b] = T.chapters[1]
    const reveal = smooth(a, a + 0.03, p) * (1 - smooth(b - 0.03, b, p))
    const visible = p > a && p < b && reveal > 0
    root.current.visible = visible
    const d = drag.current
    if (!visible) {
      if (d.on) release()
      d.hover = false
      restoreCursor()
    }
    const card = hall.card
    const tex = texture.current
    const canvas = card?.canvas || null
    if (canvas !== tex.canvas) {
      tex.map?.dispose()
      tex.canvas = canvas
      tex.map = canvas ? new CanvasTexture(canvas) : null
      if (tex.map) {
        tex.map.colorSpace = SRGBColorSpace
        tex.map.anisotropy = 8
      }
      tex.version = null
      face.current.map = tex.map
      face.current.emissiveMap = tex.map
      face.current.needsUpdate = true
    }
    if (tex.map && card.version !== tex.version) {
      tex.map.needsUpdate = true
      tex.version = card.version
    }
    const t = state.clock.elapsedTime
    const step = Math.min(dt, 0.1)
    if (!d.on) {
      d.idle += dt
      d.offset += d.velocity * (1 - Math.exp(-4 * step)) / 4
      d.velocity *= Math.exp(-4 * step)
      if (d.idle > 2) {
        d.offset *= Math.exp(-2.4 * step)
        d.velocity *= Math.exp(-4 * step)
      }
    }
    root.current.position.y = 1.75 - 3 * (1 - reveal) + Math.sin(t * 0.8) * 0.04 * reveal
    root.current.rotation.y = -0.28 + Math.sin(t * 0.45) * 0.06 + d.offset
    slab.current.opacity = reveal
    face.current.opacity = reveal
    slab.current.depthWrite = reveal > 0.99
    face.current.depthWrite = reveal > 0.99
    face.current.emissiveIntensity = tex.map ? 0.12 + Math.sin(t * 1.4) * 0.025 : 0
  })

  return (
    <group
      ref={root}
      position={[2.25, -1.25, 0.4]}
      rotation-y={-0.28}
      scale={0.72}
      visible={false}
      onPointerOver={(e) => {
        e.stopPropagation()
        drag.current.hover = true
        cursor(drag.current.on ? 'grabbing' : 'grab')
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        drag.current.hover = false
        if (!drag.current.on) restoreCursor()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.button !== 0 || drag.current.on) return
        const d = drag.current
        d.on = true
        // Tell the hall this drag is ours, so the vase doesn't turn too.
        hall.grab = true
        d.pointer = e.pointerId
        d.target = e.target
        d.x = e.clientX
        d.time = e.timeStamp
        d.velocity = 0
        d.idle = 0
        e.target.setPointerCapture(e.pointerId)
        cursor('grabbing')
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        const d = drag.current
        if (!d.on || e.pointerId !== d.pointer) return
        const delta = (e.clientX - d.x) * 0.008
        const elapsed = Math.max(0.008, (e.timeStamp - d.time) / 1000)
        d.offset += delta
        d.velocity = Math.max(-5, Math.min(5, delta / elapsed))
        d.x = e.clientX
        d.time = e.timeStamp
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        if (e.pointerId !== drag.current.pointer) return
        release()
        if (drag.current.hover) cursor('grab')
        else restoreCursor()
      }}
      onPointerCancel={(e) => {
        e.stopPropagation()
        release()
        restoreCursor()
      }}
      onLostPointerCapture={(e) => {
        e.stopPropagation()
        drag.current.on = false
        hall.grab = false
        drag.current.target = null
        drag.current.pointer = null
        drag.current.idle = 0
        restoreCursor()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.6, 0.08]} />
        <meshStandardMaterial ref={slab} color="#8c5c2e" metalness={0.85} roughness={0.38} transparent opacity={0} />
      </mesh>
      <mesh position={[0, 0, 0.041]} receiveShadow>
        <planeGeometry args={[2.32, 1.5467]} />
        <meshStandardMaterial ref={face} color="#ffffff" metalness={0.55} roughness={0.36} emissive="#ff7a2a" emissiveIntensity={0.12} transparent opacity={0} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    </group>
  )
}
