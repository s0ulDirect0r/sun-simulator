import * as THREE from 'three'

/**
 * Photon Corona Shader
 *
 * Creates a glowing atmospheric shell around the event horizon void.
 * Separate from the black void sphere for better control.
 * Simulates the photon sphere glow as a transparent corona layer.
 */

export const PhotonCoronaVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const PhotonCoronaFragmentShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float time;
uniform vec3 glowColor;
uniform float glowIntensity;
// cameraPosition is provided automatically by Three.js

void main() {
  // Calculate view direction for Fresnel
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel effect - glow at edges where we're looking at grazing angles
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);

  // Pulsating glow - more dramatic
  float pulse = sin(time * 1.5) * 0.3 + 0.7;

  // Combine Fresnel with pulse and intensity
  float glowStrength = fresnel * glowIntensity * pulse;

  // Dramatic animated perturbations (spacetime turbulence)
  float turbulence = sin(vWorldPosition.x * 10.0 + time) *
                     cos(vWorldPosition.y * 10.0 + time * 0.7) *
                     sin(vWorldPosition.z * 10.0 + time * 1.3);
  glowStrength += turbulence * 0.3;

  // Final glow color
  vec3 finalColor = glowColor * glowStrength;

  // Alpha based on glow strength for smooth blending
  float alpha = glowStrength * 0.6;

  gl_FragColor = vec4(finalColor, alpha);
}
`

/**
 * Creates a shader material for the photon corona (glow shell)
 */
export function createPhotonCoronaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: PhotonCoronaVertexShader,
    fragmentShader: PhotonCoronaFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      glowColor: { value: new THREE.Color(0xff8800) }, // Orange photon glow
      glowIntensity: { value: 6.0 } // DOUBLED - INTENSE glow strength
    },
    transparent: true,
    side: THREE.BackSide, // Render inside faces for corona effect
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
}
