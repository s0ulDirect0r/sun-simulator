import * as THREE from 'three'

/**
 * Event Horizon Shader
 *
 * Creates a visually spectacular black hole event horizon with:
 * - Spacetime distortion effect on edges
 * - Fresnel-based photon sphere glow
 * - Animated "boiling" surface using noise
 * - Perfect darkness in the center
 *
 * Physics basis:
 * - Schwarzschild radius defines the event horizon
 * - Photon sphere at 1.5× Schwarzschild radius creates visible glow
 * - No light escapes from inside the horizon
 */

export const EventHorizonVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform float time;
uniform float schwarzschildRadius;

// 3D Simplex noise function for surface perturbation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;

  // Apply subtle noise-based surface perturbation (spacetime "boiling")
  vec3 noisePos = position * 2.0 + vec3(time * 0.1);
  float noise = snoise(noisePos) * 0.05;

  // Perturb position along normal
  vec3 perturbedPosition = position + normal * noise * schwarzschildRadius * 0.02;

  vec4 worldPosition = modelMatrix * vec4(perturbedPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(perturbedPosition, 1.0);
}
`

export const EventHorizonFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform float time;
uniform float schwarzschildRadius;
uniform vec3 glowColor;
uniform float glowIntensity;
// cameraPosition is provided automatically by Three.js

void main() {
  // Calculate view direction for Fresnel
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel term - 0 at center (looking straight at surface), 1 at edges (grazing angle)
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 1.5);

  // VOID CALCULATION: Use viewing angle, not geometric distance
  // When looking at the center of the sphere (fresnel ~0), we want pure black
  // Only at the edges (fresnel ~1) should we see glow

  // Pulsating glow effect - slower, more dramatic
  float pulse = sin(time * 1.5) * 0.5 + 0.5;

  // PURE VOID - completely black, no glow
  // The glow will be a separate shell object
  vec3 voidColor = vec3(0.0, 0.0, 0.0); // Absolute blackness
  vec3 finalColor = voidColor; // Pure black everywhere

  // Alpha: FULLY OPAQUE everywhere to block background
  float alpha = 1.0;

  gl_FragColor = vec4(finalColor, alpha);
}
`

/**
 * Creates a shader material for the event horizon
 */
export function createEventHorizonMaterial(schwarzschildRadius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: EventHorizonVertexShader,
    fragmentShader: EventHorizonFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      schwarzschildRadius: { value: schwarzschildRadius },
      glowColor: { value: new THREE.Color(0xff8800) }, // M87-style orange/yellow glow
      glowIntensity: { value: 4.0 } // DOUBLED for M87-style brightness
      // cameraPosition is provided automatically by Three.js
    },
    transparent: true,
    side: THREE.FrontSide, // Only render front faces for proper depth occlusion
    depthWrite: true, // CRITICAL: Write to depth buffer to block objects behind the void!
    blending: THREE.NormalBlending // Normal blending - we want to BLOCK the background, not add to it
  })
}
