import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Nebula } from './Nebula'

class SunSimulator {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private canvas: HTMLCanvasElement
  private nebula: Nebula
  private clock: THREE.Clock

  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    if (!this.canvas) {
      throw new Error('Canvas element not found')
    }

    // Initialize scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 50)

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Initialize orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 10
    this.controls.maxDistance = 200

    // Set up lights
    this.setupLights()

    // Initialize clock for delta time
    this.clock = new THREE.Clock()

    // Create nebula
    this.nebula = new Nebula(this.scene)

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))

    // Update phase info
    this.updatePhaseInfo('Phase 1: Nebula Collapse')

    // Start animation loop
    this.animate()
  }

  private setupLights(): void {
    // Ambient light for nebula illumination (dimmer for dramatic effect)
    const ambientLight = new THREE.AmbientLight(0x202040, 0.5)
    this.scene.add(ambientLight)

    // Subtle point light at center for forming protostar glow
    const pointLight = new THREE.PointLight(0xff6600, 0.5, 100)
    pointLight.position.set(0, 0, 0)
    this.scene.add(pointLight)
  }

  private onWindowResize(): void {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private updatePhaseInfo(phase: string): void {
    const phaseElement = document.getElementById('current-phase')
    if (phaseElement) {
      phaseElement.textContent = phase
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    // Get delta time
    const deltaTime = this.clock.getDelta()

    // Update controls
    this.controls.update()

    // Update nebula physics
    this.nebula.update(deltaTime)

    // Render scene
    this.renderer.render(this.scene, this.camera)
  }
}

// Initialize the simulator when DOM is ready
new SunSimulator()
