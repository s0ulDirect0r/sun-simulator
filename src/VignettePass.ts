import { ShaderMaterial, UniformsUtils } from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

export class VignettePass extends Pass {
  private fsQuad: FullScreenQuad
  private material: ShaderMaterial

  constructor(intensity: number = 0.5) {
    super()

    const shader = {
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: intensity },
        darkness: { value: 1.5 }
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
        uniform float intensity;
        uniform float darkness;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // Calculate distance from center
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);

          // Apply vignette
          float vignette = smoothstep(0.8, darkness * 0.3, dist * (darkness + 0.3));
          color.rgb = mix(color.rgb * 0.3, color.rgb, vignette);
          color.rgb *= 1.0 - (dist * intensity);

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

  render(
    renderer: any,
    writeBuffer: any,
    readBuffer: any
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
