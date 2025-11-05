import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Nebula } from './Nebula'
import { Star } from './Star'
import { IgnitionBurst } from './IgnitionBurst'

enum SimulationPhase {
  NEBULA_COLLAPSE = 'NEBULA_COLLAPSE',
  MAIN_SEQUENCE = 'MAIN_SEQUENCE',
  RED_GIANT = 'RED_GIANT',
  SUPERNOVA = 'SUPERNOVA'
}

class SunSimulator {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private canvas: HTMLCanvasElement
  private nebula: Nebula | null = null
  private star: Star | null = null
  private ignitionBurst: IgnitionBurst | null = null
  private clock: THREE.Clock
  private currentPhase: SimulationPhase = SimulationPhase.NEBULA_COLLAPSE
  private transitionProgress: number = 0
  private transitionDuration: number = 3.0
  private phaseElement: HTMLElement | null = null
  private debugRadiusElement: HTMLElement | null = null
  private lastPhaseText = ''
  private lastDebugText = ''

  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    if (!this.canvas) {
      throw new Error('Canvas element not found')
    }

    // Initialize scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.phaseElement = document.getElementById('current-phase')
    this.debugRadiusElement = document.getElementById('debug-radius')

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
    if (phase === this.lastPhaseText) {
      return
    }

    this.lastPhaseText = phase

    if (this.phaseElement) {
      this.phaseElement.textContent = phase
    }
  }

  private updateNebulaTelemetry(avgRadius: number, collapseProgress: number): void {
    const debugText = `avg radius: ${avgRadius.toFixed(1)} | collapse: ${(collapseProgress * 100).toFixed(0)}%`

    if (this.debugRadiusElement && debugText !== this.lastDebugText) {
      this.debugRadiusElement.textContent = debugText
      this.lastDebugText = debugText
    }

    let phaseText: string
    if (collapseProgress < 0.25) {
      phaseText = 'Phase 1: Nebula Collapse — Gravity Stirring the Cloud'
    } else if (collapseProgress < 0.6) {
      phaseText = 'Phase 1: Nebula Collapse — Accretion Disk Forming'
    } else if (collapseProgress < 0.9) {
      phaseText = 'Phase 1: Nebula Collapse — Protostar Ignition'
    } else {
      phaseText = 'Phase 1: Nebula Collapse — Core Stabilizing'
    }

    this.updatePhaseInfo(phaseText)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    // Get delta time
    const deltaTime = this.clock.getDelta()

    // Update controls
    this.controls.update()

    // Update current phase
    this.updatePhaseLogic(deltaTime)
    if (this.ignitionBurst) {
      this.ignitionBurst.update(deltaTime)
      if (!this.ignitionBurst.active) {
        this.ignitionBurst = null
      }
    }

    // Render scene
    this.renderer.render(this.scene, this.camera)
  }

  private updatePhaseLogic(deltaTime: number): void {
    switch (this.currentPhase) {
      case SimulationPhase.NEBULA_COLLAPSE:
        if (this.nebula) {
          this.nebula.update(deltaTime)

          const avgRadius = this.nebula.getAverageRadius()
          const collapseProgress = this.nebula.getCollapseProgress()

          this.updateNebulaTelemetry(avgRadius, collapseProgress)

          if (collapseProgress >= 0.92) {
            this.startTransitionToMainSequence()
          }
        }
        break

      case SimulationPhase.MAIN_SEQUENCE:
        if (this.star) {
          this.star.update(deltaTime)
        }
        break

      case SimulationPhase.RED_GIANT:
        // TODO: Phase 3 implementation
        break

      case SimulationPhase.SUPERNOVA:
        // TODO: Phase 4 implementation
        break
    }
  }

  private startTransitionToMainSequence(): void {
    console.log('Starting transition to main sequence star...')

    // Get protostar's current size for smooth transition
    const protostarRadius = this.nebula ? this.nebula.getProtostarRadius() : 4.8

    // Create star at protostar's current size
    this.star = new Star(this.scene, protostarRadius)
    this.ignitionBurst = new IgnitionBurst(this.scene)

    // Fade out and dispose of nebula over time
    if (this.nebula) {
      // Store initial protostar material values
      const protostarMaterial = this.nebula['protostar'].material as THREE.MeshStandardMaterial
      const initialEmissiveIntensity = protostarMaterial.emissiveIntensity
      const protostarLight = this.nebula['protostarLight'] as THREE.PointLight
      const initialLightIntensity = protostarLight.intensity

      // Make protostar material transparent for opacity fade
      protostarMaterial.transparent = true

      // Start fade animation
      this.transitionProgress = 0
      const fadeInterval = setInterval(() => {
        this.transitionProgress += 0.016

        if (this.nebula && this.transitionProgress < this.transitionDuration) {
          // Fade progress (0 = full opacity, 1 = invisible)
          const fadeProgress = this.transitionProgress / this.transitionDuration
          const opacity = 1 - fadeProgress

          // Fade nebula particles
          this.nebula['material'].opacity = opacity * 0.8
          this.nebula['particles'].visible = opacity > 0.1

          // Fade protostar mesh opacity
          protostarMaterial.opacity = opacity

          // Fade protostar emissive intensity
          protostarMaterial.emissiveIntensity = initialEmissiveIntensity * opacity

          // Fade protostar light intensity
          protostarLight.intensity = initialLightIntensity * opacity
        } else {
          // Transition complete - now safe to remove
          if (this.nebula) {
            this.scene.remove(this.nebula['particles'])
            this.scene.remove(this.nebula['protostar'])
            this.scene.remove(this.nebula['protostarLight'])
            console.log('removing protostar!')
            this.nebula.dispose()
            console.log('nebula disposed')
            this.nebula = null
          }
          clearInterval(fadeInterval)
        }
      }, 16)
    }

    // Update phase
    this.currentPhase = SimulationPhase.MAIN_SEQUENCE
    this.lastDebugText = ''
    if (this.debugRadiusElement) {
      this.debugRadiusElement.textContent = ''
    }
    this.updatePhaseInfo('Phase 2: Main Sequence Star')
  }
}

// Initialize the simulator when DOM is ready
new SunSimulator()
