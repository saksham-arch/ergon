import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, Vector3 } from 'three'
import { hall, T, smooth } from '../hall.js'

const bronze = { color: '#b58b52', metalness: 0.9, roughness: 0.3 }
const marble = { color: '#f3eadb', roughness: 0.48, metalness: 0.02 }
const slots = Array.from({ length: 12 }, (_, i) => {
  const a = (i % 6) * Math.PI / 3
  return [Math.cos(a) * 0.205, 0.035 + Math.floor(i / 6) * 0.034, Math.sin(a) * 0.205]
})
const count = (v) => Number.isFinite(v) ? Math.min(12, Math.max(0, Math.floor(v))) : 0

export default function Balance() {
  const root = useRef()
  const beam = useRef()
  const pans = useRef([])
  const chains = useRef([])
  const coins = useRef([])
  const motion = useRef({ angle: 0, velocity: 0, counts: [0, 0], born: new Array(24).fill(0) })
  const points = useMemo(() => [
    [0, 0], [0.12, 0], [0.25, 0.018], [0.34, 0.065], [0.37, 0.11],
    [0.36, 0.115], [0.33, 0.075], [0.245, 0.03], [0.12, 0.012], [0, 0.012],
  ].map(([x, y]) => new Vector2(x, y)), [])
  const tmp = useMemo(() => ({ top: new Vector3(), bottom: new Vector3(), direction: new Vector3(), up: new Vector3(0, 1, 0) }), [])

  useFrame((state, dt) => {
    const p = hall.p
    const [a, b] = T.chapters[2]
    const reveal = smooth(a, a + 0.03, p) * (1 - smooth(b - 0.03, b, p))
    root.current.visible = p > a && p < b && reveal > 0
    root.current.position.y = -1.2 - 4.2 * (1 - reveal)
    const t = state.clock.elapsedTime
    const fair = count(hall.offer?.fair)
    const risk = count(hall.offer?.risk)
    const m = motion.current
    const target = Math.max(-0.3, Math.min(0.3, (fair - risk) * 0.06)) + Math.sin(t * 1.1) * 0.008
    // Substeps keep the spring stable after a slow frame or a tab switch.
    const elapsed = Math.min(dt, 0.1)
    const steps = Math.max(1, Math.ceil(elapsed / 0.008))
    for (let i = 0; i < steps; i++) {
      m.velocity += ((target - m.angle) * 30 - m.velocity * 8) * elapsed / steps
      m.angle += m.velocity * elapsed / steps
    }
    beam.current.rotation.z = m.angle
    for (let side = 0; side < 2; side++) {
      const n = side === 0 ? fair : risk
      const x = side === 0 ? -1 : 1
      const endX = x * Math.cos(m.angle)
      const endY = 3.08 + x * Math.sin(m.angle)
      const panY = endY - 0.88
      pans.current[side].position.set(endX, panY, 0)
      for (let j = 0; j < 3; j++) {
        const angle = j * Math.PI * 2 / 3 + Math.PI / 6
        tmp.top.set(endX, endY, 0)
        tmp.bottom.set(endX + Math.cos(angle) * 0.36, panY + 0.11, Math.sin(angle) * 0.36)
        const chain = chains.current[side * 3 + j]
        chain.position.copy(tmp.top).add(tmp.bottom).multiplyScalar(0.5)
        tmp.direction.subVectors(tmp.top, tmp.bottom)
        chain.scale.y = tmp.direction.length()
        chain.quaternion.setFromUnitVectors(tmp.up, tmp.direction.normalize())
      }
      for (let i = 0; i < 12; i++) {
        const index = side * 12 + i
        if (i >= m.counts[side] && i < n) m.born[index] = t
        const coin = coins.current[index]
        coin.visible = i < n
        const u = Math.min(1, Math.max(0, (t - m.born[index]) / 0.5))
        // A short rebound settles exactly onto the stack at half a second.
        const drop = u < 0.7 ? 0.8 * (1 - (u / 0.7) ** 2) : 0.065 * Math.sin((u - 0.7) / 0.3 * Math.PI)
        coin.position.y = slots[i][1] + drop
      }
      m.counts[side] = n
    }
  })

  return (
    <group ref={root} position={[-2.45, -5.4, -0.8]} visible={false}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.02, 0.18, 1.02]} />
        <meshStandardMaterial {...marble} />
      </mesh>
      <mesh position={[0, 0.61, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.4, 0.86, 64]} />
        <meshStandardMaterial {...marble} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => {
        const a = i * Math.PI / 10
        return (
          <mesh key={i} position={[Math.cos(a) * 0.36, 0.61, Math.sin(a) * 0.36]} castShadow receiveShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.82, 10]} />
            <meshStandardMaterial {...marble} />
          </mesh>
        )
      })}
      <mesh position={[0, 1.075, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.15, 1]} />
        <meshStandardMaterial {...marble} />
      </mesh>
      <mesh position={[0, 1.21, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.12, 40]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <mesh position={[0, 2.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.075, 1.88, 32]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <mesh position={[0, 3.26, 0]} castShadow>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <group ref={beam} position={[0, 3.08, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.06, 0.07, 0.075]} />
          <meshStandardMaterial {...bronze} />
        </mesh>
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x, 0, 0]} castShadow>
            <sphereGeometry args={[0.065, 20, 12]} />
            <meshStandardMaterial {...bronze} />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(el) => { chains.current[i] = el }} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
          <meshStandardMaterial {...bronze} />
        </mesh>
      ))}
      {[0, 1].map((side) => (
        <group key={side} ref={(el) => { pans.current[side] = el }}>
          <mesh receiveShadow>
            <latheGeometry args={[points, 64]} />
            <meshPhysicalMaterial color="#f3eadb" transmission={0.9} thickness={0.1} roughness={0.06} ior={1.5} />
          </mesh>
          <mesh position={[0, 0.11, 0]} rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[0.365, 0.012, 10, 64]} />
            <meshStandardMaterial {...bronze} />
          </mesh>
          {slots.map((slot, i) => (
            <group key={i} ref={(el) => { coins.current[side * 12 + i] = el }} position={slot} visible={false}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.03, 32]} />
                <meshPhysicalMaterial color={side === 0 ? '#e8b06a' : '#8f2a1c'} metalness={side === 0 ? 1 : 0.3} roughness={side === 0 ? 0.25 : 0.35} clearcoat={side === 0 ? 0 : 0.7} />
              </mesh>
              <mesh rotation-x={Math.PI / 2} castShadow>
                <torusGeometry args={[0.099, 0.006, 8, 32]} />
                <meshStandardMaterial color="#e8b06a" metalness={1} roughness={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
