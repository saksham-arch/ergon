import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  LatheGeometry,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hall, T, smooth, mix } from '../hall.js'

const rows = [-6.2, 6.2].flatMap((x) => Array.from({ length: 6 }, (_, i) => [x, -1.2, 4 - i * 3.6]))
const windows = [-2, -6, -10]
const vertex = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`
const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vLocal;
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
      mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
      mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    float h = vLocal.y + 0.5;
    float edge = 1.0 - smoothstep(0.12, 0.5, min(abs(vLocal.x), abs(vLocal.z)));
    float ends = smoothstep(0.0, 0.22, h) * (1.0 - smoothstep(0.8, 1.0, h));
    float drift = noise(vLocal * vec3(5.0, 9.0, 5.0) + vec3(uTime * 0.025, uTime * 0.018, 0.0));
    gl_FragColor = vec4(1.0, 0.76, 0.48, edge * ends * mix(0.7, 1.0, drift) * uOpacity);
  }
`

function instances(mesh, items) {
  const object = new Object3D()
  items.forEach(({ position, scale = [1, 1, 1], direction }, i) => {
    object.position.set(...position)
    object.scale.set(...scale)
    object.quaternion.identity()
    if (direction) object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction)
    object.updateMatrix()
    mesh.setMatrixAt(i, object.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
}

export default function Stoa() {
  const root = useRef()
  const shafts = useRef()
  const capitals = useRef()
  const beams = useRef()
  const coffers = useRef()
  const openings = useRef()
  const rays = useRef()
  const wall = useRef()
  const glow = useRef()
  const reduced = useRef(false)
  const [marbleSource, wallSource] = useTexture(['/art/marble.jpg', '/art/wall.jpg'])
  const maps = useMemo(() => {
    // Clone cached textures so this room cannot change another exhibit's tiling.
    const marble = marbleSource.clone()
    marble.colorSpace = SRGBColorSpace
    marble.wrapS = marble.wrapT = RepeatWrapping
    marble.repeat.set(2, 5)
    const backdrop = wallSource.clone()
    backdrop.colorSpace = SRGBColorSpace
    return { marble, backdrop }
  }, [marbleSource, wallSource])
  const geometry = useMemo(() => {
    const profile = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24
      return new Vector2(0.42 - 0.075 * t + 0.026 * Math.sin(Math.PI * t), t * 6.9)
    })
    const shaft = new LatheGeometry(profile, 160)
    const p = shaft.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const a = Math.atan2(x, z)
      const flute = 1 - 0.055 * (1 - Math.cos(a * 20))
      p.setXYZ(i, x * flute, p.getY(i), z * flute)
    }
    shaft.computeVertexNormals()
    const echinus = new LatheGeometry([
      [0, 6.9], [0.35, 6.9], [0.36, 6.99], [0.42, 7.07],
      [0.52, 7.19], [0.55, 7.24], [0, 7.24],
    ].map(([r, y]) => new Vector2(r, y)), 48)
    const abacus = new BoxGeometry(1.16, 0.16, 1.16).translate(0, 7.32, 0)
    const capital = mergeGeometries([echinus, abacus])
    echinus.dispose()
    abacus.dispose()
    return { shaft, capital }
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), [])
  const tint = useMemo(() => ({ dark: new Color('#0b0807'), lit: new Color('#8a7c70') }), [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = media.matches }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => () => {
    maps.marble.dispose()
    maps.backdrop.dispose()
    geometry.shaft.dispose()
    geometry.capital.dispose()
  }, [maps, geometry])

  useLayoutEffect(() => {
    const columns = rows.map((position) => ({ position }))
    instances(shafts.current, columns)
    instances(capitals.current, columns)
    instances(beams.current, [-6.2, 6.2].map((x) => ({ position: [x, 6.44, -5], scale: [1.24, 0.48, 20.4] })))
    const frames = []
    for (let x = -6; x <= 6; x += 3) {
      for (let z = -15.2; z <= 3; z += 3.6) {
        // Raised centres leave a recessed panel between the four dark ribs.
        frames.push({ position: [x, 7.63, z], scale: [3, 0.14, 0.12] })
        frames.push({ position: [x - 1.5, 7.63, z + 1.8], scale: [0.12, 0.14, 3.6] })
      }
    }
    instances(coffers.current, frames)
    instances(openings.current, windows.map((z) => ({ position: [-6.6, 6.1, z], scale: [0.04, 2.2, 0.85] })))
    instances(rays.current, windows.map((z) => {
      const top = new Vector3(-6.55, 6.3, z)
      const bottom = new Vector3(-2.5, -1.16, z + 1.2)
      const direction = top.clone().sub(bottom)
      return { position: top.clone().add(bottom).multiplyScalar(0.5).toArray(), scale: [1.1, direction.length(), 1.4], direction: direction.normalize() }
    }))
  }, [])

  useFrame((_, dt) => {
    const reveal = smooth(T.kept[0], T.kept[0] + 0.06, hall.p)
    // Hiding the ceiling also keeps the opening overhead camera unobstructed.
    root.current.visible = hall.active && hall.p >= 0.18
    uniforms.uOpacity.value = 0.08 * reveal
    if (hall.active && !reduced.current) uniforms.uTime.value += Math.min(dt, 0.1)
    wall.current.color.copy(tint.dark).lerp(tint.lit, reveal)
    glow.current.emissiveIntensity = mix(0, 0.55, reveal)
    glow.current.color.setScalar(reveal * 0.18)
  })

  return (
    <group ref={root} visible={false}>
      <instancedMesh ref={shafts} args={[geometry.shaft, null, rows.length]} receiveShadow>
        <meshStandardMaterial color="#d9cfbf" map={maps.marble} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={capitals} args={[geometry.capital, null, rows.length]} receiveShadow>
        <meshStandardMaterial color="#d9cfbf" map={maps.marble} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={beams} args={[null, null, 2]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#d9cfbf" map={maps.marble} roughness={0.55} />
      </instancedMesh>
      <mesh position={[0, 7.82, -5.4]}>
        <boxGeometry args={[16, 0.2, 22.4]} />
        <meshStandardMaterial color="#100d0b" roughness={0.95} envMapIntensity={0.1} />
      </mesh>
      <instancedMesh ref={coffers} args={[null, null, 60]}>
        <boxGeometry />
        <meshStandardMaterial color="#211a14" roughness={0.9} envMapIntensity={0.1} />
      </instancedMesh>
      <mesh position={[0, 9.8, -17.5]}>
        <planeGeometry args={[34, 22]} />
        <meshBasicMaterial ref={wall} map={maps.backdrop} color="#0b0807" fog={false} />
      </mesh>
      <instancedMesh ref={openings} args={[null, null, 3]}>
        <boxGeometry />
        <meshStandardMaterial ref={glow} color="#000000" emissive="#e8b06a" emissiveIntensity={0} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={rays} args={[null, null, 3]} renderOrder={4}>
        <boxGeometry />
        <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={AdditiveBlending} side={DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
