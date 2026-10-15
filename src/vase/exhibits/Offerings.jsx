import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, CuboidCollider, Physics, RigidBody, TrimeshCollider } from '@react-three/rapier'
import { LatheGeometry, MeshStandardMaterial, Raycaster, SphereGeometry, Vector2, Vector3 } from 'three'
import { hall, T, clamp } from '../hall.js'
import { MOUTH_Y, PROFILE } from '../profile.js'

let throwMounted = null
// Throwing belongs to the coda, once the chapters are done with the vase.
const ready = () => hall.active && hall.p > T.coda[0] - 0.01
// Not over a figure (that opens a record) or while the tablet is held.
const blocked = (target) => hall.hover >= 0 || hall.grab || Boolean(target?.closest?.('.panel, .drawer, .coda, .rail, button, a, input, select, label'))

// Only gate changes notify React, keeping mutable scroll state out of renders.
const subscribe = (notify) => {
  let previous = ready()
  const timer = window.setInterval(() => {
    const next = ready()
    if (next !== previous) {
      previous = next
      notify()
    }
  }, 32)
  return () => window.clearInterval(timer)
}

export function throwOne() {
  return throwMounted?.() ?? false
}

export default function Offerings({ envMap = null }) {
  const { camera, gl } = useThree()
  const active = useSyncExternalStore(subscribe, ready, () => false)
  const glow = useRef()
  const pulse = useRef(0)
  const sequence = useRef(0)
  const reduced = useRef(false)
  const slots = useMemo(() => Array.from({ length: 24 }, () => {
    const slot = { body: null, collider: null, mesh: null, live: false, kept: false, order: 0 }
    slot.bindBody = (body) => {
      slot.body = body
      if (body) body.setEnabled(false)
    }
    slot.bindCollider = (collider) => { slot.collider = collider }
    slot.bindMesh = (mesh) => { slot.mesh = mesh }
    return slot
  }), [])
  const resources = useMemo(() => {
    const lathe = new LatheGeometry(PROFILE.points, 48)
    lathe.deleteAttribute('uv')
    const collider = [lathe.attributes.position.array.slice(), new Uint32Array(lathe.index.array)]
    lathe.dispose()
    return {
      collider,
      sphere: new SphereGeometry(1, 32, 24),
      chrome: new MeshStandardMaterial({ color: '#efe8e1', metalness: 1, roughness: 0.06, envMapIntensity: 1.6 }),
      ray: new Raycaster(),
      pointer: new Vector2(),
      origin: new Vector3(),
      velocity: new Vector3(),
    }
  }, [])

  useEffect(() => {
    resources.chrome.envMap = envMap
    resources.chrome.needsUpdate = true
  }, [envMap, resources])

  useEffect(() => {
    hall.kept = hall.kept ?? 0
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = media.matches }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const launch = (x = 0, y = 0) => {
      if (!ready()) return false
      const slot = slots.find((item) => !item.live) || slots.reduce((a, b) => a.order < b.order ? a : b)
      if (!slot.body || !slot.collider || !slot.mesh) return false
      const r = resources
      camera.updateWorldMatrix(true, false)
      r.pointer.set(x, y)
      r.ray.setFromCamera(r.pointer, camera)
      r.ray.ray.at(1.2, r.origin)
      const radius = 0.13 + Math.random() * 0.09
      const scatter = reduced.current ? 0.025 : 0.08
      const targetX = (Math.random() - 0.5) * scatter
      const targetZ = (Math.random() - 0.5) * scatter
      const distance = Math.hypot(r.origin.x - targetX, r.origin.z - targetZ)
      // Reach the target on the descending side of an arc that clears the lip.
      const apex = Math.max(7.5, r.origin.y + 0.7)
      const vy = Math.sqrt(2 * 9.81 * (apex - r.origin.y))
      const flight = vy / 9.81 + Math.sqrt(2 * (apex - 3.6) / 9.81)
      r.velocity.set((targetX - r.origin.x) / flight, vy, (targetZ - r.origin.z) / flight)
      // Very distant cursor rays get more flight time without changing the destination.
      if (distance > 12) {
        const time = Math.max(flight, distance / 10)
        r.velocity.set((targetX - r.origin.x) / time, (3.6 - r.origin.y + 4.905 * time * time) / time, (targetZ - r.origin.z) / time)
      }
      slot.body.setEnabled(false)
      slot.collider.setRadius(radius)
      slot.body.recomputeMassPropertiesFromColliders()
      slot.body.setTranslation(r.origin, false)
      slot.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false)
      slot.body.setLinvel(r.velocity, false)
      const spin = reduced.current ? 0 : 3
      slot.body.setAngvel({ x: (Math.random() - 0.5) * spin, y: spin * 0.4, z: (Math.random() - 0.5) * spin }, false)
      slot.mesh.scale.setScalar(radius)
      slot.mesh.visible = true
      slot.live = true
      slot.kept = false
      slot.order = ++sequence.current
      slot.body.setEnabled(true)
      slot.body.wakeUp()
      return true
    }
    let press = null
    const down = (event) => {
      if (event.button !== 0 || !event.isPrimary || !ready() || blocked(event.target)) return
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 }
    }
    const move = (event) => {
      if (press?.id !== event.pointerId) return
      press.moved = Math.max(press.moved, Math.hypot(event.clientX - press.x, event.clientY - press.y))
    }
    const cancel = () => { press = null }
    const up = (event) => {
      if (press?.id !== event.pointerId) return
      move(event)
      const click = press.moved < 6
      press = null
      if (!click || blocked(event.target)) return
      const rect = gl.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      launch((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    }
    throwMounted = launch
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    return () => {
      if (throwMounted === launch) throwMounted = null
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
    }
  }, [camera, gl, resources, slots])

  useEffect(() => () => {
    resources.sphere.dispose()
    resources.chrome.dispose()
  }, [resources])

  useFrame((_, dt) => {
    const running = ready()
    for (const slot of slots) {
      if (!slot.live || !slot.body || !running) continue
      const p = slot.body.translation()
      if (p.y < -3) {
        slot.live = false
        slot.mesh.visible = false
        slot.body.setEnabled(false)
      } else if (!slot.kept && p.y > 0.5 && p.y < 2.9 && Math.hypot(p.x, p.z) < 0.9) {
        slot.kept = true
        hall.kept = (hall.kept ?? 0) + 1
        pulse.current = 1
      }
    }
    pulse.current *= Math.exp(-clamp(dt, 0, 0.1) * 7)
    if (glow.current) glow.current.intensity = running ? pulse.current * (reduced.current ? 1.2 : 6) : 0
  })

  return (
    <>
      <Physics gravity={[0, -9.81, 0]} timeStep="vary" paused={!active}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1.7, 0.6, 1.7]} position={[0, -0.6, 0]} />
          <CuboidCollider args={[30, 0.1, 30]} position={[0, -1.3, 0]} />
          <TrimeshCollider args={resources.collider} friction={0.5} restitution={0.25} />
        </RigidBody>
        {slots.map((slot, i) => (
          <RigidBody key={i} ref={slot.bindBody} colliders={false} ccd restitution={0.32} friction={0.4}>
            <BallCollider ref={slot.bindCollider} args={[0.18]} />
            <mesh ref={slot.bindMesh} geometry={resources.sphere} material={resources.chrome} visible={false} castShadow dispose={null} />
          </RigidBody>
        ))}
      </Physics>
      <pointLight ref={glow} position={[0, MOUTH_Y + 0.2, 0]} color="#e8b06a" intensity={0} distance={3.5} decay={2} />
    </>
  )
}
