// The small chrome boulders the big one bursts into, and the ring of light
// at the moment it breaks. Drawn in the same screen-space stage as the big
// boulder, so they sit over everything as they fall into the vase.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Object3D, SRGBColorSpace } from 'three'
import { SHARDS, descent } from './descent.js'

// A warm chrome matcap: cream sky above, the clay hill below, a softbox and
// two window strips, like the studio the big boulder reflects.
function chromeMatcap() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, 256)
  sky.addColorStop(0, '#fbf3e6')
  sky.addColorStop(0.46, '#e9d9c2')
  sky.addColorStop(0.54, '#b8582c')
  sky.addColorStop(1, '#3a160a')
  g.fillStyle = sky
  g.beginPath()
  g.arc(128, 128, 128, 0, Math.PI * 2)
  g.fill()
  const box = g.createRadialGradient(100, 70, 0, 100, 70, 46)
  box.addColorStop(0, 'rgba(255,255,255,1)')
  box.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = box
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = 'rgba(255,250,240,0.55)'
  g.fillRect(28, 96, 10, 70)
  g.fillRect(218, 96, 10, 70)
  // Darken the rim, the way a sphere falls off at grazing angles.
  const rim = g.createRadialGradient(128, 128, 96, 128, 128, 128)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(30,12,4,0.55)')
  g.fillStyle = rim
  g.fillRect(0, 0, 256, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function ringTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const r = g.createRadialGradient(128, 128, 60, 128, 128, 128)
  r.addColorStop(0, 'rgba(255,200,120,0)')
  r.addColorStop(0.7, 'rgba(255,214,150,0.9)')
  r.addColorStop(0.82, 'rgba(255,240,210,1)')
  r.addColorStop(1, 'rgba(255,200,120,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,236,200,1)')
  r.addColorStop(0.35, 'rgba(255,180,100,0.45)')
  r.addColorStop(1, 'rgba(255,150,60,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

export default function Shards() {
  const im = useRef()
  const ring = useRef()
  const glow = useRef()
  const matcap = useMemo(chromeMatcap, [])
  const ringMap = useMemo(ringTexture, [])
  const glowMap = useMemo(glowTexture, [])
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(({ size }) => {
    const d = descent
    const toWorld = (x, y) => [x - size.width / 2, size.height / 2 - y]
    let n = 0
    if (d.active) {
      for (const s of d.shards) {
        if (!s.visible) continue
        const [x, y] = toWorld(s.x, s.y)
        dummy.position.set(x, y, 0)
        dummy.scale.setScalar(s.r)
        dummy.updateMatrix()
        im.current.setMatrixAt(n++, dummy.matrix)
      }
    }
    im.current.count = n
    im.current.instanceMatrix.needsUpdate = true

    // The burst: a ring that races outward and a bloom of warm light.
    const k = d.active ? d.flash.k : 0
    const [fx, fy] = toWorld(d.flash.x, d.flash.y)
    const R = d.start ? d.start.r : 100
    ring.current.visible = k > 0.001
    ring.current.position.set(fx, fy, 1)
    ring.current.scale.setScalar(R * (0.9 + (1 - k) * 2.2))
    ring.current.material.opacity = k * k
    glow.current.visible = k > 0.001
    glow.current.position.set(fx, fy, 0.5)
    glow.current.scale.setScalar(R * (0.9 + (1 - k) * 0.7))
    glow.current.material.opacity = k * 0.65
  })

  return (
    <>
      <instancedMesh ref={im} args={[undefined, undefined, SHARDS]} frustumCulled={false} renderOrder={3}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshMatcapMaterial matcap={matcap} />
      </instancedMesh>
      <mesh ref={glow} visible={false} renderOrder={4}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={glowMap} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring} visible={false} renderOrder={5}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={ringMap} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}
