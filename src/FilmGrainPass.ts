import { ShaderMaterial, UniformsUtils } from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

export class FilmGrainPass extends Pass {
  private fsQuad: FullScreenQuad
  private material: ShaderMaterial

  constructor() {
    super()

    const shader = {
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0.0 },
        intensity: { value: 0.15 }
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
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;

        float random(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // Animated film grain
          float noise = random(vUv + time);
          noise = (noise - 0.5) * intensity;

          color.rgb += noise;

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
    readBuffer: any,
    deltaTime: number
  ): void {
    this.material.uniforms.tDiffuse.value = readBuffer.texture
    this.material.uniforms.time.value += deltaTime

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
