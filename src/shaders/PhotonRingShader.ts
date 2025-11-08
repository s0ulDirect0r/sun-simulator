import * as THREE from 'three'

/**
 * Photon Ring (Einstein Ring) Shader
 *
 * Creates a dramatic multi-layered photon sphere visualization:
 * - Multiple concentric rings at ~1.5× Schwarzschild radius (photon sphere)
 * - Animated caustics and interference patterns
 * - Chromatic aberration (different wavelengths bend differently)
 * - Pulsing shimmer effects for visual drama
 *
 * Physics basis:
 * - Photon sphere at r = 1.5 Rs is where light can orbit the black hole
 * - Multiple light paths create interference patterns (Einstein ring)
 * - Different wavelengths experience slightly different deflection
 */

export const PhotonRingVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vPosition = position;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const PhotonRingFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

uniform float time;
uniform float schwarzschildRadius;
uniform vec3 ringColorInner;
uniform vec3 ringColorOuter;
uniform float intensity;

// Noise function for caustics
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion for complex patterns
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for(int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  // Distance from center (0 at inner edge, 1 at outer edge)
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(vUv, center);

  // Normalize to ring width (0 at inner, 1 at outer)
  float ringProgress = (dist - 0.3) / 0.2; // Adjust these to match ring geometry

  // Create multiple concentric sub-rings (interference pattern) - REDUCED animation
  float numRings = 5.0;
  float ringPattern = sin(ringProgress * numRings * 3.14159 * 2.0 + time * 1.0) * 0.3 + 0.7; // Slower, gentler

  // Add caustic patterns (light focusing effects) - SLOWED for less flashing
  vec2 causticUV = vUv * 10.0 + vec2(time * 0.15, time * 0.1); // Slower movement
  float caustics = fbm(causticUV);
  caustics = pow(caustics, 2.0); // Sharpen the caustics

  // Chromatic aberration - different colors at different radii
  // Red bends less, blue bends more
  float redRing = smoothstep(0.35, 0.40, dist) * smoothstep(0.55, 0.50, dist);
  float greenRing = smoothstep(0.38, 0.43, dist) * smoothstep(0.52, 0.47, dist);
  float blueRing = smoothstep(0.41, 0.46, dist) * smoothstep(0.49, 0.44, dist);

  // Combine chromatic layers
  vec3 chromaticColor = vec3(
    redRing * ringColorOuter.r,
    greenRing * mix(ringColorInner.g, ringColorOuter.g, 0.5),
    blueRing * ringColorInner.b
  );

  // Main ring intensity (sharper falloff for dramatic edge)
  float ringIntensity = smoothstep(0.30, 0.40, dist) * smoothstep(0.55, 0.45, dist);

  // Pulsing shimmer effect - REDUCED for less flashing
  float pulse = sin(time * 1.5) * 0.15 + 0.85; // Slower, gentler pulse
  float shimmer = sin(dist * 30.0 - time * 2.0) * 0.2 + 0.8; // Slower, subtler shimmer

  // Rotating interference pattern - REDUCED for less flashing
  float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
  float rotation = sin(angle * 8.0 + time * 1.0) * 0.3 + 0.7; // Slower rotation, gentler variation

  // Combine all effects
  float finalIntensity = ringIntensity * (0.7 + ringPattern * 0.3);
  finalIntensity *= (0.8 + caustics * 0.4);
  finalIntensity *= pulse;
  finalIntensity *= (0.9 + shimmer * 0.1);
  finalIntensity *= (0.85 + rotation * 0.15);

  // Mix base color with chromatic aberration
  vec3 baseColor = mix(ringColorInner, ringColorOuter, ringProgress);
  vec3 finalColor = baseColor * finalIntensity + chromaticColor * 2.5;

  // Add extra glow boost at peak intensity zones - REDUCED
  float hotSpots = pow(caustics * ringPattern, 2.5);
  finalColor += ringColorOuter * hotSpots * 2.0; // Reduced from 4.0

  // Add pulsing bright streaks - REDUCED
  float streaks = pow(rotation * shimmer, 3.0);
  finalColor += mix(ringColorInner, ringColorOuter, 0.5) * streaks * 1.5; // Reduced from 2.5

  // Alpha based on ring intensity (with additive blending for glow)
  float alpha = finalIntensity * intensity;

  gl_FragColor = vec4(finalColor, alpha);
}
`

/**
 * Creates a shader material for the photon ring (Einstein ring)
 */
export function createPhotonRingMaterial(schwarzschildRadius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: PhotonRingVertexShader,
    fragmentShader: PhotonRingFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      schwarzschildRadius: { value: schwarzschildRadius },
      ringColorInner: { value: new THREE.Color(0xff8800) }, // Orange - matches photon corona
      ringColorOuter: { value: new THREE.Color(0xff5500) }, // Red-orange
      intensity: { value: 1.5 } // Further reduced - subtle Einstein ring
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
}
