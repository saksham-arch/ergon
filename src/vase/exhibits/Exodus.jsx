import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'
import { hall, smooth } from '../hall.js'
import { MOUTH_R, MOUTH_Y } from '../profile.js'

const COUNT = 24000

const vertexShader = `
  uniform float uProgress;
  uniform float uReduced;
  uniform float uDpr;
  uniform float uHeight;
  uniform float uMouthY;
  uniform float uMouthR;
  attribute float aSeed;
  attribute float aDelay;
  attribute float aRadius;
  attribute float aSpeed;
  varying float vAlpha;
  varying float vColor;

  void main() {
    float age = max(0.0, (uProgress - aDelay) / (1.0 - aDelay));
    // A slower cohort still reaches the exit at the end of the scroll.
    float t = pow(age, mix(1.0 / aSpeed, 1.6 / aSpeed, uReduced));
    float turn = smoothstep(0.0, 0.58, t);
    float launch = smoothstep(0.52, 1.0, t);
    float angle = aSeed * 6.283185 + turn * 6.283185 * mix(1.0, 0.25, uReduced);
    float radius = mix(aRadius * uMouthR * 0.92, 1.5 + aRadius * 0.8, turn);
    vec3 helix = vec3(cos(angle) * radius, uMouthY + 1.25 * turn, sin(angle) * radius);
    vec3 exit = vec3((aSeed - 0.5) * 13.0, -4.0 - aRadius * 3.0, 12.5 + aSeed * 2.0);
    vec3 p = mix(helix, exit, launch);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    float distanceToLens = length(view.xyz);
    float twinkle = 0.82 + 0.18 * sin(aSeed * 137.0 + t * mix(44.0, 8.0, uReduced));
    vAlpha = smoothstep(0.0, 0.045, age) * (1.0 - smoothstep(0.9, 1.0, t));
    vAlpha *= smoothstep(1.5, 2.5, distanceToLens) * twinkle * 0.48;
    vColor = aSeed;
    gl_Position = projectionMatrix * view;
    float pixels = (0.009 + aRadius * 0.014) * uHeight * projectionMatrix[1][1] / max(0.1, -view.z);
    gl_PointSize = clamp(pixels, 1.0, 6.0 * uDpr);
  }
`

const fragmentShader = `
  uniform vec3 uGold;
  uniform vec3 uCream;
  varying float vAlpha;
  varying float vColor;

  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    float soft = 1.0 - smoothstep(0.05, 1.0, radius);
    float alpha = soft * soft * vAlpha;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(mix(uGold, uCream, vColor) * 1.8, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function Exodus() {
  const root = useRef()
  const glow = useRef()
  const reduced = useRef(false)
  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry()
    const seeds = new Float32Array(COUNT)
    const delays = new Float32Array(COUNT)
    const radii = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)
    // Fixed seeds keep remounts and scroll reversals visually identical.
    let seed = 8191
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < COUNT; i++) {
      seeds[i] = random()
      delays[i] = random() * 0.38
      radii[i] = Math.sqrt(random())
      speeds[i] = 0.8 + random() * 0.4
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
    geometry.setAttribute('aDelay', new BufferAttribute(delays, 1))
    geometry.setAttribute('aRadius', new BufferAttribute(radii, 1))
    geometry.setAttribute('aSpeed', new BufferAttribute(speeds, 1))
    const material = new ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uReduced: { value: 0 },
        uDpr: { value: 1 },
        uHeight: { value: 1 },
        uMouthY: { value: MOUTH_Y },
        uMouthR: { value: MOUTH_R },
        uGold: { value: new Color('#f2c46a') },
        uCream: { value: new Color('#fff1d6') },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    return { geometry, material }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reduced.current = media.matches
      material.uniforms.uReduced.value = media.matches ? 1 : 0
      geometry.setDrawRange(0, media.matches ? 4000 : COUNT)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [geometry, material])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame(({ gl, size }) => {
    const u = smooth(0.9, 1, hall.p)
    root.current.visible = hall.active && u > 0
    material.uniforms.uProgress.value = u
    const dpr = gl.getPixelRatio()
    material.uniforms.uDpr.value = dpr
    material.uniforms.uHeight.value = size.height * dpr
    glow.current.intensity = u * (reduced.current ? 0.8 : 2.2)
  })

  return (
    <group ref={root} visible={false}>
      {/* Shader positions leave the CPU bounds at the origin. */}
      <points geometry={geometry} material={material} frustumCulled={false} />
      <pointLight ref={glow} position={[0, MOUTH_Y + 0.12, 0]} color="#f2c46a" intensity={0} distance={2.4} decay={2} />
    </group>
  )
}
