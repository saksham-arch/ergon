import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Euler, LinearFilter, Object3D, Quaternion, SRGBColorSpace, Vector2, Vector3, Vector4, VideoTexture } from 'three'
import { project, step, MAX_DROPLETS } from './engine.js'
import { H, W, ground, slope } from './hill.js'

function makeShadow() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(40,16,8,0.55)')
  grd.addColorStop(0.45, 'rgba(40,16,8,0.22)')
  grd.addColorStop(1, 'rgba(40,16,8,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// Glossy graphite matcap for the ink droplets.
function makeDropMatcap() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const base = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  base.addColorStop(0, '#3a3c42')
  base.addColorStop(0.8, '#1a1b1e')
  base.addColorStop(1, '#5a5d64')
  g.fillStyle = base
  g.fillRect(0, 0, 128, 128)
  const hi = g.createRadialGradient(44, 38, 0, 44, 38, 22)
  hi.addColorStop(0, 'rgba(255,255,255,0.95)')
  hi.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = hi
  g.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const vertexShader = /* glsl */ `
  varying vec3 vN;
  varying vec3 vO;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vO = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Ortho camera, so every view ray is (0,0,-1). The world is a pair of planes
// either side of the boulder: rays heading back (z < 0) are traced to the
// hillside behind it, rays heading toward the viewer to a mirror copy in front.
// Between them, a pale studio with soft light. The statue is painted into its
// own small texture each frame and composited onto both planes, and the
// viewer's camera fills most of the ball when they've opted in. A band of black glaze with
// a gold key pattern is inlaid around it, tilted off the view axis, so you can
// see it roll.
const fragmentShader = /* glsl */ `
  uniform sampler2D uPage;
  uniform sampler2D uFig;
  uniform sampler2D uCam;
  uniform vec2 uBall;
  uniform vec2 uDoc;
  uniform vec4 uFigRect;
  uniform float uFigOn;
  uniform float uR;
  uniform float uHeight;
  uniform float uCamOn;
  uniform float uCamAspect;
  uniform float uHover;
  uniform float uOpacity;
  uniform vec3 uKey;
  varying vec3 vN;
  varying vec3 vO;

  const vec3 SKY = vec3(0.953, 0.918, 0.859);

  // d: y up. A warm room: bright ceiling softbox, two tall window strips, a
  // clay-coloured floor. No hard horizon.
  vec3 studio(vec3 d) {
    vec3 c = mix(vec3(0.62, 0.36, 0.24), vec3(0.96, 0.92, 0.86), smoothstep(-0.6, 0.5, d.y));
    float top = smoothstep(0.6, 0.82, d.y) * (1.0 - smoothstep(0.3, 0.6, abs(d.x)));
    c = mix(c, vec3(1.75, 1.66, 1.52), top);
    float strip = smoothstep(0.7, 0.8, abs(d.x)) * (1.0 - smoothstep(0.25, 0.5, d.y)) * smoothstep(-0.1, 0.05, d.y);
    c = mix(c, vec3(1.4, 1.34, 1.24), strip);
    return c;
  }

  // Inlay: x = black glaze band, y = gold (rims and stopped keys).
  vec2 inlay(vec3 on) {
    vec3 nb = normalize(vec3(1.0, 0.3, 0.9));
    float t = dot(on, nb);
    float w = 0.125;
    float band = 1.0 - smoothstep(w - 0.004, w + 0.004, abs(t));
    vec3 b1 = normalize(cross(nb, vec3(0.0, 1.0, 0.0)));
    vec3 b2 = cross(nb, b1);
    float a = atan(dot(on, b2), dot(on, b1));
    float tt = t / w;
    float rim = step(0.8, abs(tt)) * (1.0 - step(0.93, abs(tt)));
    float kx = fract((a / 6.2831853 + 0.5) * 36.0);
    float ky = clamp((tt + 0.66) / 1.32, 0.0, 0.9999);
    float ix = floor(kx * 6.0);
    float iy = floor(ky * 5.0);
    float key = 0.0;
    if (abs(tt) < 0.66 && ix < 5.0) {
      if (iy == 4.0 || ix == 4.0 || iy == 0.0 || (ix == 0.0 && iy <= 2.0) || (iy == 2.0 && ix <= 2.0)) key = 1.0;
    }
    return vec2(band, max(rim, key) * band);
  }

  // How much of the viewer shows at this point of the ball: all but the rim.
  float camWeight(vec3 n) {
    return (1.0 - smoothstep(0.8, 0.96, length(n.xy))) * uCamOn;
  }

  // The viewer's camera, mirrored. A true convex mirror would squeeze them
  // into the middle of the ball; this bulges them out like a fisheye instead,
  // so their face fills most of it and only the rim keeps the hillside.
  vec3 viewer(vec3 n) {
    float th = acos(clamp(n.z, 0.0, 1.0)) / 1.5707963;
    vec2 off = normalize(n.xy + 1e-6) * th * 0.45;
    vec2 uv = 0.5 + vec2(-off.x / max(uCamAspect, 1.0), off.y * min(uCamAspect, 1.0));
    vec3 cam = texture2D(uCam, uv).rgb;
    return mix(vec3(dot(cam, vec3(0.299, 0.587, 0.114))), cam, 0.7) * 1.08;
  }

  // The world at doc (world units, y down): hillside copy plus the statue.
  vec3 world(vec2 doc) {
    vec2 uv = vec2(doc.x / uDoc.x, 1.0 - doc.y / uDoc.y);
    vec3 c = SKY;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) c = texture2D(uPage, uv).rgb;
    vec2 fu = (doc - uFigRect.xy) / uFigRect.zw;
    if (uFigOn > 0.5 && fu.x > 0.0 && fu.x < 1.0 && fu.y > 0.0 && fu.y < 1.0) {
      vec4 f = texture2D(uFig, vec2(fu.x, 1.0 - fu.y));
      c = mix(c, f.rgb, f.a);
    }
    return c;
  }

  void main() {
    vec3 n = normalize(vN);
    vec3 Rs = reflect(vec3(0.0, 0.0, -1.0), n);
    vec3 P = n * uR;
    vec3 env = studio(Rs);

    if (Rs.z < 0.0) {
      // Hillside behind; the ground right under the boulder sits in its shadow.
      float t = (-uR - uHeight - P.z) / Rs.z;
      vec3 H = P + t * Rs;
      vec3 c = world(vec2(uBall.x + H.x, uBall.y - H.y));
      c = mix(c, c * c, 0.45);
      float dist = length(H.xy - vec2(uR * 0.1, -uR * 0.15));
      c *= mix(0.5, 1.0, smoothstep(uR * 0.15, uR * 1.4 + uHeight, dist));
      env = mix(env, c, smoothstep(0.0, 0.12, -Rs.z));
    } else {
      // The world again, mirrored in front; rays that run nearly parallel to
      // it fade into the studio.
      float t = (uR * 1.5 - P.z) / max(Rs.z, 1e-3);
      vec3 H = P + t * Rs;
      vec3 c = world(vec2(uBall.x + H.x, uBall.y - H.y));
      c = mix(c, c * c, 0.45); // chrome deepens what it mirrors
      env = mix(env, c, (1.0 - smoothstep(5.0 * uR, 11.0 * uR, t)) * 0.92);
    }

    float cw = 0.0;
    if (uCamOn > 0.001) {
      cw = camWeight(n);
      env = mix(env, viewer(n), cw * 0.9);
    }

    // Below the horizon reads a touch darker, like polished studio floor; the
    // upper half catches the light.
    env *= mix(0.8, 1.04, smoothstep(-0.55, 0.35, Rs.y));
    // A soft falloff at grazing angles gives the sphere its edge.
    env *= 1.0 - 0.22 * pow(1.0 - max(n.z, 0.0), 3.0);

    // Chrome, black glaze and gold all mirror the same world, differently.
    vec2 inl = inlay(normalize(vO));
    vec3 col = env * vec3(0.97, 0.95, 0.93);
    // Over the viewer the glaze goes smoky, so the band doesn't black out their face.
    col = mix(col, env * mix(0.07, 0.32, cw) + vec3(0.012, 0.01, 0.009), inl.x);
    col = mix(col, env * vec3(1.02, 0.74, 0.44), inl.y);
    // A warm clay rim where the sphere turns away.
    col += vec3(0.42, 0.16, 0.06) * pow(1.0 - max(n.z, 0.0), 4.0) * (1.0 - inl.x);

    // Key light that follows the cursor (screen space).
    float k = max(dot(Rs, uKey), 0.0);
    col += vec3(2.6) * pow(k, 260.0) + vec3(0.1 + 0.3 * uHover) * pow(k, 9.0);

    gl_FragColor = vec4(min(col, vec3(1.0)), uOpacity);
  }
`

const DEFAULT_KEY = new Vector3(-0.45, 0.6, 0.75).normalize()

export default function BallScene() {
  const ball = useRef()
  const shadow = useRef()
  const drops = useRef()
  const shadowMap = useMemo(makeShadow, [])
  const dropMatcap = useMemo(makeDropMatcap, [])

  const uniforms = useMemo(
    () => ({
      uPage: { value: null },
      uFig: { value: null },
      uFigRect: { value: new Vector4(0, 0, 1, 1) },
      uFigOn: { value: 0 },
      uCam: { value: null },
      uBall: { value: new Vector2() },
      uDoc: { value: new Vector2(1, 1) },
      uR: { value: 100 },
      uHeight: { value: 0 },
      uCamOn: { value: 0 },
      uCamAspect: { value: 4 / 3 },
      uHover: { value: 0 },
      uOpacity: { value: 0 },
      uKey: { value: DEFAULT_KEY.clone() },
    }),
    [],
  )

  const tmp = useMemo(
    () => ({
      roll: new Quaternion(),
      dq: new Quaternion(),
      intro: new Quaternion(),
      euler: new Euler(),
      axis: new Vector3(),
      key: new Vector3(),
      dummy: new Object3D(),
      prev: null,
      proxyVersion: -1,
      camVideo: null,
      hoverScale: 1,
      figVersion: -1,
    }),
    [],
  )

  useEffect(
    () => () => {
      const u = ball.current?.material.uniforms
      u?.uPage.value?.dispose()
      u?.uFig.value?.dispose()
      u?.uCam.value?.dispose()
    },
    [],
  )

  useFrame(({ size }, dt) => {
    const e = step(Math.min(dt, 1 / 20))
    const mesh = ball.current
    if (!e) {
      mesh.visible = shadow.current.visible = false
      return
    }
    mesh.visible = shadow.current.visible = true
    // R3F hands the material its own copy of `uniforms`; write to the live one.
    const u = mesh.material.uniforms
    const { x, y } = e.ball
    const r = e.r

    // Page reflection source, rebuilt whenever layout is re-measured.
    if (e.proxy.version !== tmp.proxyVersion && e.proxy.canvas) {
      tmp.proxyVersion = e.proxy.version
      u.uPage.value?.dispose()
      const t = new CanvasTexture(e.proxy.canvas)
      t.minFilter = LinearFilter
      t.generateMipmaps = false
      u.uPage.value = t
    }

    // The statue, repainted by figure.js every frame.
    const fig = e.figure
    if (fig && fig.version !== tmp.figVersion) {
      tmp.figVersion = fig.version
      if (!u.uFig.value) {
        const t = new CanvasTexture(fig.canvas)
        t.minFilter = LinearFilter
        t.generateMipmaps = false
        u.uFig.value = t
      }
      u.uFig.value.needsUpdate = true
      u.uFigRect.value.set(fig.rect.x, fig.rect.y, fig.rect.w, fig.rect.h)
      u.uFigOn.value = 1
    }

    // Viewer reflection (opt-in camera).
    const video = e.cam?.video ?? null
    if (video !== tmp.camVideo) {
      tmp.camVideo = video
      if (video) {
        u.uCam.value?.dispose()
        u.uCam.value = new VideoTexture(video)
        u.uCamAspect.value = e.cam.aspect
      }
    }
    u.uCamOn.value += ((video ? 1 : 0) - u.uCamOn.value) * Math.min(1, dt * 4)

    // Seen from the side, rolling is a spin about the view axis: clockwise
    // while it climbs to the right. Not while it's still landing.
    if (tmp.prev && e.intro >= 1) {
      const dx = x - tmp.prev.x
      const dy = y - tmp.prev.y
      const dist = Math.hypot(dx, dy) * Math.sign(dx || 1)
      if (Math.abs(dist) > 1e-4) {
        tmp.dq.setFromAxisAngle(tmp.axis.set(0, 0, 1), -dist / r)
        tmp.roll.premultiply(tmp.dq)
      }
    }
    tmp.prev = { x, y }

    // Intro: the ball drops onto the page, settling its spin as it lands.
    const k = 1 - Math.pow(1 - e.intro, 3)
    const lift = 1 - k
    tmp.euler.set(-lift * 1.8, lift * 0.7, lift * 0.3)
    tmp.intro.setFromEuler(tmp.euler)
    mesh.quaternion.copy(tmp.intro).multiply(tmp.roll)

    // Height off the hillside (world units): intro drop plus any hop from a
    // click. The boulder, its shadow and the droplets share one projection.
    const height = lift * r * 2.6 + e.hop.z
    const c = project(x, y, height)
    const bx = e.ball.bx
    const g = project(bx, ground(bx), 0)
    tmp.hoverScale += ((e.hover ? 1.03 : 1) - tmp.hoverScale) * Math.min(1, dt * 10)

    const toWorld = (px, py) => [px - size.width / 2, size.height / 2 - py]
    const [wx, wy] = toWorld(c.x, c.y)
    mesh.position.set(wx, wy, 0)
    mesh.scale.setScalar(r * c.s * tmp.hoverScale * (1 + e.hop.squash))

    // Key light follows the cursor around the ball.
    const p = e.pointer
    if (p.active) {
      const R = r * c.s * 3
      const lx = Math.max(-1.5, Math.min(1.5, (p.x - c.x) / R))
      const ly = Math.max(-1.5, Math.min(1.5, -(p.y - c.y) / R))
      tmp.key.set(lx, ly, 0.85).normalize()
    } else {
      tmp.key.copy(DEFAULT_KEY)
    }
    u.uKey.value.lerp(tmp.key, Math.min(1, dt * 6)).normalize()
    u.uHover.value += ((e.hover ? 1 : 0) - u.uHover.value) * Math.min(1, dt * 8)

    u.uBall.value.set(x, y)
    u.uDoc.value.set(W, H)
    u.uR.value = r
    u.uHeight.value = height
    u.uOpacity.value = Math.min(1, e.intro * 3) * e.ball.respawn

    // Contact shadow: a thin ellipse lying along the slope under the boulder.
    const sh = shadow.current
    const spread = 1 + height / (r * 3)
    const [gx, gy] = toWorld(g.x, g.y)
    sh.position.set(gx, gy, -r * 2)
    sh.rotation.z = -Math.atan(slope(bx))
    sh.scale.set(r * 2.3 * spread * g.s, r * 0.42 * spread * g.s, 1)
    sh.material.opacity = (k / spread) * e.ball.respawn

    // Ink droplets in flight: they shrink as they fall back toward the page.
    const im = drops.current
    const d0 = tmp.dummy
    let n = 0
    for (const d of e.drops) {
      if (!d.alive) continue
      const q = project(d.x, d.y, d.z)
      const [qx, qy] = toWorld(q.x, q.y)
      d0.position.set(qx, qy, d.z)
      d0.scale.setScalar(d.s * q.s)
      d0.updateMatrix()
      im.setMatrixAt(n++, d0.matrix)
    }
    im.count = n
    im.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <mesh ref={shadow} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowMap} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ball} renderOrder={1}>
        <sphereGeometry args={[1, 128, 64]} />
        <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, MAX_DROPLETS]} renderOrder={2} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshMatcapMaterial matcap={dropMatcap} />
      </instancedMesh>
    </>
  )
}
