/**
 * Inside a Canvas component:
 * const chrome = useRef()
 * const { texture } = useGalleryEnv({ hide: [chrome] })
 * // <mesh ref={chrome}><sphereGeometry /><meshStandardMaterial envMap={texture} metalness={1} roughness={0.15} /></mesh>
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CubeCamera, LinearMipmapLinearFilter, WebGLCubeRenderTarget } from 'three'
import { hall } from '../hall.js'

export function useGalleryEnv(options = {}) {
  const { scene } = useThree()
  const { size = 256, position = [0, 3.6, 0], every = 3, hide = [] } = options
  const [x, y, z] = position
  const frame = useRef(0)
  const visibility = useMemo(() => new Map(), [])
  const { target, camera } = useMemo(() => {
    const target = new WebGLCubeRenderTarget(size)
    target.texture.generateMipmaps = true
    target.texture.minFilter = LinearMipmapLinearFilter
    const camera = new CubeCamera(0.1, 60, target)
    return { target, camera }
  }, [size])

  useEffect(() => {
    scene.add(camera)
    frame.current = 0
    return () => {
      scene.remove(camera)
      target.dispose()
    }
  }, [scene, camera, target])

  useEffect(() => {
    camera.position.set(x, y, z)
  }, [camera, x, y, z])

  useFrame(({ gl }) => {
    if (!hall.active) {
      frame.current = 0
      return
    }
    const interval = Number.isFinite(every) ? Math.max(1, Math.floor(every)) : 3
    if (frame.current++ % interval !== 0) return

    visibility.clear()
    const previousTarget = gl.getRenderTarget()
    const previousFace = gl.getActiveCubeFace()
    const previousMip = gl.getActiveMipmapLevel()
    const xrEnabled = gl.xr.enabled
    try {
      for (const ref of hide) {
        const object = ref?.current
        // Duplicate refs must preserve the original visibility too.
        if (!object || visibility.has(object)) continue
        visibility.set(object, object.visible)
        object.visible = false
      }
      camera.update(gl, scene)
    } finally {
      for (const [object, visible] of visibility) object.visible = visible
      visibility.clear()
      // Keep the main render intact even if a capture throws.
      gl.setRenderTarget(previousTarget, previousFace, previousMip)
      gl.xr.enabled = xrEnabled
    }
  })

  return { texture: target.texture, camera }
}
