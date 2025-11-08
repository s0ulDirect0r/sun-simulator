// Mock WebGL context for headless testing
import { beforeAll } from 'vitest'

beforeAll(() => {
  // Mock WebGL rendering context (Three.js needs this)
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === 'webgl2' || contextType === 'webgl') {
      return {
        canvas: this,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getExtension: () => null,
        getParameter: () => null,
        createBuffer: () => ({}),
        createTexture: () => ({}),
        createProgram: () => ({}),
        createShader: () => ({}),
        bindBuffer: () => {},
        bufferData: () => {},
        enable: () => {},
        disable: () => {},
        clear: () => {},
        viewport: () => {},
        useProgram: () => {},
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getShaderParameter: () => true,
        deleteShader: () => {},
        deleteProgram: () => {},
      }
    }
    return null
  }
})
