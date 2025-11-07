import * as THREE from 'three'

/**
 * Jet Trail Shader
 *
 * Creates glowing relativistic jet beams with:
 * - Bright blue-white synchrotron radiation core
 * - Distance-based fade (bright at base, dim at tip)
 * - Edge fade for smooth blending
 * - Flowing animation effect
 *
 * Physics basis:
 * - Synchrotron radiation from relativistic electrons
 * - Magnetic collimation creates narrow beams
 * - Brightness decreases with distance from base
 */

export const JetTrailVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform float time;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const JetTrailFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform float time;
uniform float jetLength;
uniform vec3 coreColor;
uniform float glowIntensity;
uniform float opacity;
uniform float flowSpeed; // Speed of flowing motion

// Simple noise for turbulence (lighter than full simplex)
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  float n = p.x + p.y * 57.0 + 113.0 * p.z;
  return mix(
    mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
        mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
    mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
        mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

void main() {
  // Distance along jet (0.0 at base, 1.0 at tip)
  // vUv.y goes from 0 to 1 along cylinder length
  float distAlongJet = vUv.y;

  // Distance from center axis (0.0 at center, 1.0 at edge)
  // vUv.x wraps around cylinder circumference
  float distFromAxis = abs(vUv.x - 0.5) * 2.0;

  // Core brightness: bright at base, dim at tip
  float distanceFade = 1.0 - smoothstep(0.3, 1.0, distAlongJet);

  // Edge fade: bright at center, soft at edges
  float edgeFade = 1.0 - smoothstep(0.5, 1.0, distFromAxis);
  edgeFade = pow(edgeFade, 2.0); // Sharper falloff

  // FLOWING EFFECT: Continuous plasma with organic turbulence
  // Multi-scale noise for natural plasma variation (no artificial bands)
  vec3 flowingNoisePos = vec3(
    vWorldPosition.x,
    vWorldPosition.y - time * flowSpeed, // Flows outward
    vWorldPosition.z
  ) * 0.15;
  float flowingNoise = noise(flowingNoisePos);

  // Add finer detail with higher frequency noise
  vec3 detailNoisePos = flowingNoisePos * 2.5;
  float detailNoise = noise(detailNoisePos);

  // Combine multiple noise scales for organic, continuous variation
  float turbulence = flowingNoise * 0.6 + detailNoise * 0.2 + 0.5;

  // Pulsing glow at the base
  float basePulse = (1.0 - distAlongJet) * (sin(time * 2.0) * 0.2 + 0.8);

  // Combine all factors
  float brightness = distanceFade * edgeFade * turbulence * basePulse * glowIntensity;

  // Final color
  vec3 finalColor = coreColor * brightness;

  // Alpha based on brightness
  float alpha = brightness * opacity;

  gl_FragColor = vec4(finalColor, alpha);
}
`

/**
 * Creates a shader material for jet trails
 */
export function createJetTrailMaterial(jetLength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: JetTrailVertexShader,
    fragmentShader: JetTrailFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      jetLength: { value: jetLength },
      coreColor: { value: new THREE.Color(0x88ccff) }, // Softer blue-white
      glowIntensity: { value: 2.0 }, // Base glow - scales up with mass
      opacity: { value: 0.8 }, // Visible but balanced
      flowSpeed: { value: 6.0 }, // Keep the nice flowing motion
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
