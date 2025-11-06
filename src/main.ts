import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Nebula } from './Nebula'
import { Star } from './Star'
import { IgnitionBurst } from './IgnitionBurst'
import { PlanetSystem } from './PlanetSystem'
import { BlackHole } from './BlackHole'
import { SupernovaRemnant } from './SupernovaRemnant'
import { FilmGrainPass } from './FilmGrainPass'
import { VignettePass } from './VignettePass'
import { Starfield } from './Starfield'

enum SimulationPhase {
  NEBULA_COLLAPSE = 'NEBULA_COLLAPSE',
  MAIN_SEQUENCE = 'MAIN_SEQUENCE',
  RED_GIANT = 'RED_GIANT',
  SUPERNOVA = 'SUPERNOVA',
  BLACK_HOLE = 'BLACK_HOLE'
}

class SunSimulator {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private controls: OrbitControls
  private canvas: HTMLCanvasElement
  private nebula: Nebula | null = null
  private star: Star | null = null
  private ignitionBurst: IgnitionBurst | null = null
  private planetSystem: PlanetSystem | null = null
  private blackHole: BlackHole | null = null
  private supernovaRemnant: SupernovaRemnant | null = null
  private starfield: Starfield | null = null
  private clock: THREE.Clock
  private currentPhase: SimulationPhase = SimulationPhase.NEBULA_COLLAPSE
  private transitionProgress: number = 0
  private transitionDuration: number = 3.0
  private phaseElement: HTMLElement | null = null
  private debugRadiusElement: HTMLElement | null = null
  private lastPhaseText = ''
  private lastDebugText = ''
  private mainSequenceTimer: number = 0
  private mainSequenceDuration: number = 30.0 // 30 seconds in main sequence before red giant
  private redGiantTimer: number = 0
  private redGiantDuration: number = 15.0 // 15 seconds in red giant before supernova
  private supernovaTimer: number = 0
  private supernovaDuration: number = 8.0 // 8 seconds for supernova before black hole
  private cameraBasePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 50)
  private isPaused: boolean = false
  private timeScale: number = 1.0

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

    // Set up post-processing with bloom
    this.composer = new EffectComposer(this.renderer)

    // Add render pass (renders the scene)
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)

    // Add bloom pass (makes bright things GLOW)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // Base bloom strength (will be dynamic during supernova)
      0.4, // Bloom radius
      0.85 // Bloom threshold (only bright things bloom)
    )
    this.composer.addPass(this.bloomPass)

    // Add cinematic effects
    const filmGrainPass = new FilmGrainPass()
    this.composer.addPass(filmGrainPass)

    const vignettePass = new VignettePass(0.4)
    vignettePass.renderToScreen = true
    this.composer.addPass(vignettePass)

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

    // Create starfield background
    this.starfield = new Starfield(this.scene)

    // Create nebula
    this.nebula = new Nebula(this.scene)

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))

    // Update phase info
    this.updatePhaseInfo(
      'Phase 1: Nebula Collapse',
      'A vast cloud of gas and dust collapses under gravity. Matter spirals inward, heating up as a protostar begins to form.'
    )

    // Set up interactive controls
    this.setupControls()

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

    // Update composer size
    this.composer.setSize(window.innerWidth, window.innerHeight)
  }

  private updatePhaseInfo(phase: string, description?: string): void {
    if (phase === this.lastPhaseText) {
      return
    }

    this.lastPhaseText = phase

    if (this.phaseElement) {
      this.phaseElement.textContent = phase
    }

    // Update phase description
    const descElement = document.getElementById('phase-description')
    if (descElement && description) {
      descElement.textContent = description
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

  private setupControls(): void {
    // Play/Pause button
    const playPauseBtn = document.getElementById('btn-play-pause')
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused
        playPauseBtn.textContent = this.isPaused ? '▶️ Play' : '⏸️ Pause'
      })
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset')
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.location.reload()
      })
    }

    // Speed control
    const speedControl = document.getElementById('speed-control') as HTMLInputElement
    const speedDisplay = document.getElementById('speed-display')
    if (speedControl && speedDisplay) {
      speedControl.addEventListener('input', () => {
        this.timeScale = parseFloat(speedControl.value)
        speedDisplay.textContent = `${this.timeScale.toFixed(1)}x`
      })
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('btn-fullscreen')
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      })
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          this.isPaused = !this.isPaused
          if (playPauseBtn) {
            playPauseBtn.textContent = this.isPaused ? '▶️ Play' : '⏸️ Pause'
          }
          break
        case 'r':
          window.location.reload()
          break
        case 'f':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
          break
      }
    })
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    // Get delta time and apply time scale
    let deltaTime = this.clock.getDelta()

    // Apply pause and time scale
    if (this.isPaused) {
      deltaTime = 0
    } else {
      deltaTime *= this.timeScale
    }

    // Update controls
    this.controls.update()

    // Apply camera shake during supernova
    if (this.star) {
      const shakeIntensity = this.star.getCameraShakeIntensity()
      if (shakeIntensity > 0) {
        // Apply shake offset
        const shakeAmount = 0.5 * shakeIntensity // Max shake of 0.5 units
        this.camera.position.x = this.cameraBasePosition.x + (Math.random() - 0.5) * shakeAmount
        this.camera.position.y = this.cameraBasePosition.y + (Math.random() - 0.5) * shakeAmount
        this.camera.position.z = this.cameraBasePosition.z + (Math.random() - 0.5) * shakeAmount * 0.3
      } else {
        // Reset to base position when no shake
        this.camera.position.copy(this.cameraBasePosition)
      }
    }

    // Update current phase
    this.updatePhaseLogic(deltaTime)
    if (this.ignitionBurst) {
      this.ignitionBurst.update(deltaTime)
      if (!this.ignitionBurst.active) {
        this.ignitionBurst = null
      }
    }

    // Dynamic bloom intensity based on supernova flash
    if (this.star) {
      const shakeIntensity = this.star.getCameraShakeIntensity()
      // Bloom gets INSANE during supernova (0.8 base → 3.5 peak)
      this.bloomPass.strength = THREE.MathUtils.lerp(0.8, 3.5, shakeIntensity)
    }

    // Render scene with post-processing
    this.composer.render()
  }

  private updatePhaseLogic(deltaTime: number): void {
    // Update starfield
    if (this.starfield) {
      this.starfield.update(deltaTime)
    }

    // Update planet system if it exists
    if (this.planetSystem) {
      const currentStarRadius = this.star ? this.star['currentRadius'] || 4.0 : 4.0
      this.planetSystem.update(deltaTime, currentStarRadius)
    }

    // Update supernova remnant if it exists
    if (this.supernovaRemnant) {
      this.supernovaRemnant.update(deltaTime)
    }

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

          // Track main sequence duration and trigger red giant expansion
          this.mainSequenceTimer += deltaTime
          if (this.mainSequenceTimer >= this.mainSequenceDuration && !this.star.isInRedGiantPhase()) {
            this.startRedGiantExpansion()
          }
        }
        break

      case SimulationPhase.RED_GIANT:
        if (this.star) {
          this.star.update(deltaTime)

          // Track red giant duration and trigger supernova
          this.redGiantTimer += deltaTime
          if (this.redGiantTimer >= this.redGiantDuration && !this.star.isInSupernovaPhase()) {
            this.startSupernova()
          }
        }
        break

      case SimulationPhase.SUPERNOVA:
        if (this.star) {
          this.star.update(deltaTime)

          // Track supernova duration and trigger black hole
          this.supernovaTimer += deltaTime
          if (this.supernovaTimer >= this.supernovaDuration) {
            this.startBlackHole()
          }
        }
        break

      case SimulationPhase.BLACK_HOLE:
        if (this.blackHole) {
          this.blackHole.update(deltaTime)
        }
        break
    }
  }

  private startRedGiantExpansion(): void {
    console.log('Starting red giant expansion...')

    if (this.star) {
      this.star.startRedGiantExpansion()
    }

    // Update phase
    this.currentPhase = SimulationPhase.RED_GIANT
    this.lastDebugText = ''
    if (this.debugRadiusElement) {
      this.debugRadiusElement.textContent = ''
    }
    this.updatePhaseInfo(
      'Phase 3: Red Giant Expansion',
      'Hydrogen depleted. The star swells to enormous size as it fuses helium in its core. Planets are engulfed.'
    )
  }

  private startSupernova(): void {
    console.log('Starting supernova explosion...')

    if (this.star) {
      this.star.startSupernova()

      // Create supernova remnant
      const currentStarRadius = this.star['currentRadius'] || 25.0
      this.supernovaRemnant = new SupernovaRemnant(this.scene, currentStarRadius)
    }

    // Hide planets during supernova
    if (this.planetSystem) {
      this.planetSystem.hide()
    }

    // Update phase
    this.currentPhase = SimulationPhase.SUPERNOVA
    this.supernovaTimer = 0
    this.lastDebugText = ''
    if (this.debugRadiusElement) {
      this.debugRadiusElement.textContent = ''
    }
    this.updatePhaseInfo(
      'Phase 4: SUPERNOVA!',
      'Catastrophic core collapse! The star explodes with the energy of billions of suns, scattering heavy elements across the cosmos.'
    )
  }

  private startBlackHole(): void {
    console.log('Collapsing into black hole...')

    // Create black hole with camera reference for shader effects
    this.blackHole = new BlackHole(this.scene, this.camera)

    // Remove star
    if (this.star) {
      this.star.dispose()
      this.star = null
    }

    // Remove supernova remnant
    if (this.supernovaRemnant) {
      this.supernovaRemnant.dispose()
      this.supernovaRemnant = null
    }

    // Remove planets
    if (this.planetSystem) {
      this.planetSystem.dispose()
      this.planetSystem = null
    }

    // Update phase
    this.currentPhase = SimulationPhase.BLACK_HOLE
    this.lastDebugText = ''
    if (this.debugRadiusElement) {
      this.debugRadiusElement.textContent = ''
    }
    this.updatePhaseInfo(
      'Phase 5: Black Hole',
      'The core collapses into a singularity. Matter spirals into the accretion disk, warping spacetime itself. Nothing escapes.'
    )
  }

  private startTransitionToMainSequence(): void {
    console.log('Starting transition to main sequence star...')

    // Get protostar's current size for smooth transition
    const protostarRadius = this.nebula ? this.nebula.getProtostarRadius() : 4.8

    // Create star at protostar's current size
    this.star = new Star(this.scene, protostarRadius)
    this.ignitionBurst = new IgnitionBurst(this.scene)

    // Create planet system
    this.planetSystem = new PlanetSystem(this.scene)
    this.planetSystem.show()

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
    this.updatePhaseInfo(
      'Phase 2: Main Sequence Star',
      'Fusion ignited! The star enters its stable life phase, burning hydrogen into helium for billions of years. Planets form in orbit.'
    )
  }
}

// Initialize the simulator when DOM is ready
new SunSimulator()
