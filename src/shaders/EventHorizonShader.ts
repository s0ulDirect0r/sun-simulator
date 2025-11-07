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

  // Fresnel term - glow at edges (simulates photon sphere at 1.5× Schwarzschild radius)
  // Gentler falloff for more visible glow
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 1.5);

  // Distance from center (normalized)
  float distFromCenter = length(vPosition) / schwarzschildRadius;

  // Create photon sphere ring effect - much wider and more visible
  // Start glow from center, peak at edges
  float photonSphereEdge = smoothstep(0.3, 1.0, distFromCenter);

  // Pulsating glow effect - slower, more dramatic
  float pulse = sin(time * 1.5) * 0.5 + 0.5;

  // Base glow - visible across entire sphere
  float glowStrength = (fresnel + 0.3) * photonSphereEdge * glowIntensity * (0.8 + pulse * 0.2);

  // Add extra brightness boost at the very edge
  float edgeBoost = smoothstep(0.8, 1.0, distFromCenter) * 3.0;
  glowStrength += edgeBoost * glowIntensity;

  // Core darkness - perfectly black in center, glowing at edges
  float coreDarkness = smoothstep(0.0, 0.8, distFromCenter);

  // Final color: black core with INTENSE glowing edge
  vec3 edgeGlow = glowColor * glowStrength;
  vec3 voidColor = vec3(0.0, 0.0, 0.0);

  // Mix between void and glow based on position
  vec3 finalColor = mix(voidColor, edgeGlow, coreDarkness);

  // Add dramatic turbulence at the edge
  float turbulence = sin(vUv.x * 20.0 + time) * cos(vUv.y * 20.0 + time * 0.7);
  finalColor += glowColor * turbulence * 0.15 * photonSphereEdge;

  // Extra additive glow boost to make it visible against bright disk (reduced for better balance)
  finalColor += edgeGlow * 0.1;

  // Set alpha based on distance from center - more opaque at edges
  float alpha = mix(1.0, 0.95 + glowStrength * 0.05, coreDarkness);

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
      glowColor: { value: new THREE.Color(0xff4400) }, // Red-orange photon sphere glow
      glowIntensity: { value: 2.0 } // Subtle intensity for balanced bloom
      // cameraPosition is provided automatically by Three.js
    },
    transparent: true,
    side: THREE.DoubleSide, // Changed from FrontSide - render both sides
    depthWrite: false, // Changed from true - prevent z-fighting
    blending: THREE.AdditiveBlending // Changed from NormalBlending - matches accretion disk
  })
}
