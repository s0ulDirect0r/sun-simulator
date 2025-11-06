import * as THREE from 'three'

/**
 * Accretion Disk Shader
 *
 * Physically-based accretion disk for black hole visualization with:
 * - Temperature gradient (T ∝ r^(-3/4)) - blue-white inner to red outer
 * - Keplerian orbital velocity (v ∝ r^(-1/2))
 * - Doppler boosting (approaching side brighter)
 * - Relativistic beaming (inner edge super bright)
 * - Volumetric appearance with turbulence
 *
 * Physics basis:
 * - ISCO (Innermost Stable Circular Orbit) at 3× Schwarzschild radius
 * - Blackbody radiation determines colors
 * - Differential rotation creates shearing and turbulence
 */

export const AccretionDiskVertexShader = `
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRadius;
varying float vOrbitalVelocity;

uniform float time;
uniform float schwarzschildRadius;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);

  // Calculate radius from black hole center (in XZ plane)
  vRadius = length(position.xz);

  // Keplerian velocity: v ∝ r^(-1/2)
  // Faster near center, slower at edges
  vOrbitalVelocity = 1.0 / sqrt(vRadius);

  // Apply rotation based on Keplerian orbital mechanics
  float angle = time * vOrbitalVelocity * 0.5;
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedPos = rotation * position.xz;

  vec3 animatedPosition = vec3(rotatedPos.x, position.y, rotatedPos.y);

  vec4 worldPosition = modelMatrix * vec4(animatedPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}
`

export const AccretionDiskFragmentShader = `
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRadius;
varying float vOrbitalVelocity;

uniform float time;
uniform float schwarzschildRadius;
uniform float innerRadius; // ISCO at 3× Schwarzschild radius
uniform float outerRadius;
// cameraPosition is provided automatically by Three.js
uniform float globalOpacity; // For formation animation

// Simple noise function for turbulence
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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

// Convert temperature (Kelvin) to RGB color (blackbody radiation)
vec3 temperatureToColor(float temperature) {
  // Normalized temperature (0.0 = cold, 1.0 = hot)
  float t = temperature;

  vec3 color;
  if (t > 0.85) {
    // > 30,000K: Blue-white
    color = mix(vec3(0.8, 0.9, 1.0), vec3(0.6, 0.8, 1.0), (t - 0.85) / 0.15);
  } else if (t > 0.65) {
    // 20,000K: White-blue to white
    color = mix(vec3(1.0, 1.0, 1.0), vec3(0.8, 0.9, 1.0), (t - 0.65) / 0.2);
  } else if (t > 0.45) {
    // 10,000K: Yellow-white
    color = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 1.0, 1.0), (t - 0.45) / 0.2);
  } else if (t > 0.25) {
    // 6,000K: Orange
    color = mix(vec3(1.0, 0.7, 0.4), vec3(1.0, 0.95, 0.8), (t - 0.25) / 0.2);
  } else {
    // < 4,000K: Red-orange
    color = mix(vec3(1.0, 0.4, 0.2), vec3(1.0, 0.7, 0.4), t / 0.25);
  }

  return color;
}

void main() {
  // Discard fragments outside disk bounds
  if (vRadius < innerRadius || vRadius > outerRadius) {
    discard;
  }

  // Normalized radius (0 at inner edge, 1 at outer edge)
  float normalizedRadius = (vRadius - innerRadius) / (outerRadius - innerRadius);

  // Temperature profile: T ∝ r^(-3/4)
  // Hotter near center, cooler at edges
  float temperatureExponent = 0.75;
  float temperature = pow(1.0 - normalizedRadius, temperatureExponent);

  // Get blackbody color from temperature
  vec3 baseColor = temperatureToColor(temperature);

  // Add turbulence
  vec2 turbulenceCoord = vPosition.xz * 3.0 + vec2(time * 0.3, time * 0.2);
  float turbulence1 = noise(turbulenceCoord);
  float turbulence2 = noise(turbulenceCoord * 2.3 + vec2(time * 0.4, -time * 0.3));
  float turbulence = (turbulence1 + turbulence2 * 0.5) / 1.5;

  // Modulate brightness with turbulence
  float brightnessMod = 0.8 + turbulence * 0.4;

  // Doppler boosting: approaching side appears brighter
  vec3 toCamera = normalize(cameraPosition - vWorldPosition);
  vec3 velocity = normalize(vec3(-vPosition.z, 0.0, vPosition.x)); // Tangential velocity

  float dopplerFactor = dot(velocity, toCamera);
  // Approaching (positive): brighter, Receding (negative): dimmer
  float dopplerBoost = 1.0 + dopplerFactor * 0.4;

  // Relativistic beaming: inner disk shows extreme brightness
  // Brightness ∝ (1 + v·view_dir)^3 for relativistic particles
  float relativisticBeaming = pow(max(0.5, 1.0 + dopplerFactor * vOrbitalVelocity), 2.5);

  // Combine all effects
  vec3 finalColor = baseColor * brightnessMod * dopplerBoost * relativisticBeaming;

  // Alpha gradient: thicker/brighter at ISCO, thinner at edges
  float alphaByRadius = 1.0 - pow(normalizedRadius, 1.5);

  // View-dependent alpha (thicker when viewed edge-on)
  float viewAngle = abs(dot(vNormal, toCamera));
  float viewAlpha = 1.0 - pow(viewAngle, 0.3);

  // Turbulence affects opacity
  float turbulentAlpha = 0.7 + turbulence * 0.3;

  // Combine alpha factors
  float finalAlpha = alphaByRadius * viewAlpha * turbulentAlpha * 0.9 * globalOpacity;

  // Boost brightness for additive blending
  finalColor *= 1.5;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`

/**
 * Creates a shader material for the accretion disk
 */
export function createAccretionDiskMaterial(
  schwarzschildRadius: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: AccretionDiskVertexShader,
    fragmentShader: AccretionDiskFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      schwarzschildRadius: { value: schwarzschildRadius },
      innerRadius: { value: schwarzschildRadius * 2.0 }, // Inner edge
      outerRadius: { value: schwarzschildRadius * 12.0 }, // Outer edge
      // cameraPosition is provided automatically by Three.js
      globalOpacity: { value: 0.0 } // Start invisible for formation animation
    },
    transparent: true,
    side: THREE.DoubleSide, // Render both sides for volumetric appearance
    depthWrite: false,
    blending: THREE.AdditiveBlending // Additive for glow effect
  })
}
