import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

class SunSimulator {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private canvas: HTMLCanvasElement

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

    // Add test sphere
    this.addTestSphere()

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))

    // Update phase info
    this.updatePhaseInfo('Foundation Ready')

    // Start animation loop
    this.animate()
  }

  private setupLights(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    this.scene.add(ambientLight)

    // Point light to simulate sun's glow
    const pointLight = new THREE.PointLight(0xffffff, 2, 100)
    pointLight.position.set(0, 0, 0)
    this.scene.add(pointLight)
  }

  private addTestSphere(): void {
    // Create a test sphere to verify the scene is working
    const geometry = new THREE.SphereGeometry(5, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff6600,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.1
    })
    const sphere = new THREE.Mesh(geometry, material)
    this.scene.add(sphere)
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

    // Update controls
    this.controls.update()

    // Render scene
    this.renderer.render(this.scene, this.camera)
  }
}

// Initialize the simulator when DOM is ready
new SunSimulator()
