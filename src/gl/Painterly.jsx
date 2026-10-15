// Turns a render into an oil painting: a Kuwahara filter (each pixel takes the
// calmest of the four neighbourhoods around it, which flattens texture into
// brush-like patches while keeping edges), then a faint canvas weave, a warm
// glaze in the shadows and a soft vignette. One convolution pass.

import { useEffect, useMemo } from 'react'
import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'
import { usePrefs } from './prefs.js'

const fragment = /* glsl */ `
  uniform float uRadius;
  uniform float uAmount;
  uniform float uWeave;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);
    vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);
    // Brushes run a touch diagonal, like a right hand's strokes.
    vec2 ax = vec2(0.94, 0.34) * texelSize;
    vec2 ay = vec2(-0.34, 0.94) * texelSize;
    for (int j = -4; j <= 4; j++) {
      for (int i = -4; i <= 4; i++) {
        if (abs(float(i)) > uRadius || abs(float(j)) > uRadius) continue;
        vec3 c = texture2D(inputBuffer, uv + float(i) * ax + float(j) * ay).rgb;
        vec3 c2 = c * c;
        if (i <= 0 && j <= 0) { m0 += c; s0 += c2; }
        if (i >= 0 && j <= 0) { m1 += c; s1 += c2; }
        if (i <= 0 && j >= 0) { m2 += c; s2 += c2; }
        if (i >= 0 && j >= 0) { m3 += c; s3 += c2; }
      }
    }
    float n = (uRadius + 1.0) * (uRadius + 1.0);
    m0 /= n; m1 /= n; m2 /= n; m3 /= n;
    float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
    float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
    float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
    float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
    vec3 col = m0; float best = v0;
    if (v1 < best) { best = v1; col = m1; }
    if (v2 < best) { best = v2; col = m2; }
    if (v3 < best) { best = v3; col = m3; }
    col = mix(inputColor.rgb, col, uAmount);

    // Warm glaze in the darks, as if over an umber ground.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * vec3(1.06, 0.95, 0.82), (1.0 - smoothstep(0.0, 0.5, l)) * 0.5 * uAmount);

    // Canvas: a fine weave plus grain.
    vec2 px = uv * resolution;
    float weave = sin(px.x * 1.7) * sin(px.y * 1.7);
    float grain = hash(floor(px)) - 0.5;
    col *= 1.0 + (weave * 0.018 + grain * 0.03) * uWeave;

    // Vignette.
    vec2 q = uv - 0.5;
    col *= 1.0 - dot(q, q) * 0.55;

    outputColor = vec4(col, inputColor.a);
  }
`

class PainterlyEffect extends Effect {
  constructor() {
    super('PainterlyEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['uRadius', new Uniform(3)],
        ['uAmount', new Uniform(1)],
        ['uWeave', new Uniform(1)],
      ]),
    })
  }
}

export default function Painterly({ radius = 3 }) {
  const effect = useMemo(() => new PainterlyEffect(), [])
  const { painted } = usePrefs()
  useEffect(() => {
    effect.uniforms.get('uRadius').value = painted ? radius : 0
    effect.uniforms.get('uAmount').value = painted ? 1 : 0
    effect.uniforms.get('uWeave').value = painted ? 1 : 0.3
  }, [effect, painted, radius])
  useEffect(() => () => effect.dispose(), [effect])
  return <primitive object={effect} dispose={null} />
}
