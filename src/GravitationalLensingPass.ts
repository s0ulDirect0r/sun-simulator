import { ShaderMaterial, UniformsUtils, Vector2, Vector3, Camera } from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * Gravitational Lensing Post-Processing Pass
 *
 * Warps the rendered scene to simulate light bending around a black hole.
 * Based on Schwarzschild metric deflection: α = 2Rs/b
 *
 * Creates the iconic "warped spacetime" look with:
 * - Radial UV distortion around the black hole
 * - Einstein ring brightening at photon sphere
 * - Smooth falloff to prevent harsh edges
 * - UV clamping to prevent black dot artifacts
 */
export class GravitationalLensingPass extends Pass {
  private fsQuad: FullScreenQuad
  private material: ShaderMaterial
  private camera: Camera
  private resolution: Vector2

  constructor(resolution: Vector2, camera: Camera) {
    super()

    this.camera = camera
    this.resolution = resolution

    const shader = {
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: resolution },
        blackHolePosition: { value: new Vector3(0, 0, 0) },
        blackHoleScreenPos: { value: new Vector2(0.5, 0.5) },
        schwarzschildRadius: { value: 12.0 },
        lensingStrength: { value: 0.8 }, // Realistic dramatic warping
        enabled: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform vec2 blackHoleScreenPos; // Black hole position in screen space [0,1]
        uniform float schwarzschildRadius;
        uniform float lensingStrength;
        uniform float enabled;

        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          vec4 color;

          if (enabled > 0.5) {
            // Vector from current pixel to black hole (in screen space)
            vec2 toBlackHole = blackHoleScreenPos - uv;
            float dist = length(toBlackHole);

            // Minimum distance to prevent singularity artifacts
            // This is CRITICAL to prevent black dots
            float minDist = 0.01; // Reduced for more dramatic near-center warping
            dist = max(dist, minDist);

            // Normalize direction
            vec2 direction = toBlackHole / dist;

            // Schwarzschild deflection angle: α = 2Rs/b
            // Scale radius to screen space (approximate - adjust for aspect ratio)
            float radiusScreenSpace = schwarzschildRadius / resolution.x * 2.0;

            // Calculate deflection strength (inverse square-ish for dramatic warping)
            float deflection = (radiusScreenSpace / dist) * lensingStrength;

            // Smooth falloff near edges of screen to avoid harsh boundaries
            float edgeFalloff = smoothstep(0.0, 0.2, dist) * smoothstep(1.0, 0.8, dist);
            deflection *= edgeFalloff;

            // Apply deflection AWAY from the black hole (light bends around it)
            // Pixels near BH should sample from further away
            vec2 distortedUV = uv - direction * deflection;

            // CRITICAL: Clamp UVs to prevent sampling outside texture bounds
            // This prevents the black dot artifact
            distortedUV = clamp(distortedUV, vec2(0.001), vec2(0.999));

            // Sample the scene with distorted UVs
            color = texture2D(tDiffuse, distortedUV);
          } else {
            // Pass through unchanged if disabled
            color = texture2D(tDiffuse, uv);
          }

          gl_FragColor = color;
        }
      `
    }

    this.material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    })

    this.fsQuad = new FullScreenQuad(this.material)

  }

  /**
   * Update the black hole's 3D position and convert to screen space
   */
  public setBlackHolePosition(position: Vector3): void {
    this.material.uniforms.blackHolePosition.value.copy(position)

    // Convert 3D world position to 2D screen coordinates [0,1]
    const screenPos = position.clone().project(this.camera)

    // Convert from NDC [-1,1] to UV [0,1]
    const screenUV = new Vector2(
      (screenPos.x + 1) / 2,
      (screenPos.y + 1) / 2
    )

    this.material.uniforms.blackHoleScreenPos.value.copy(screenUV)

    // DEBUG: Log position and screen coords
  }

  /**
   * Update the Schwarzschild radius (event horizon size)
   */
  public setSchwarzschildRadius(radius: number): void {
    this.material.uniforms.schwarzschildRadius.value = radius
  }

  /**
   * Set the lensing strength (artistic control)
   * Recommended range: 0.2 (subtle) to 0.8 (dramatic)
   */
  public setLensingStrength(strength: number): void {
    this.material.uniforms.lensingStrength.value = strength
  }

  /**
   * Get the current lensing strength
   */
  public getLensingStrength(): number {
    return this.material.uniforms.lensingStrength.value
  }

  /**
   * Enable or disable the lensing effect
   */
  public setEnabled(enabled: boolean): void {
    this.material.uniforms.enabled.value = enabled ? 1.0 : 0.0
  }

  /**
   * Update resolution if window resizes
   */
  public setSize(width: number, height: number): void {
    this.resolution.set(width, height)
    this.material.uniforms.resolution.value.copy(this.resolution)
  }

  render(
    renderer: any,
    writeBuffer: any,
    readBuffer: any,
    _deltaTime: number
  ): void {
    this.material.uniforms.tDiffuse.value = readBuffer.texture

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      this.fsQuad.render(renderer)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
      this.fsQuad.render(renderer)
    }
  }

  dispose(): void {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
