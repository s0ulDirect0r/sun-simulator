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
import { AccretionSource } from './AccretionSource'
import { FilmGrainPass } from './FilmGrainPass'
import { VignettePass } from './VignettePass'
import { GravitationalLensingPass } from './GravitationalLensingPass'
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
  private lensingPass!: GravitationalLensingPass
  private filmGrainPass!: FilmGrainPass
  private vignettePass!: VignettePass
  private ambientLight!: THREE.AmbientLight
  private pointLight!: THREE.PointLight
  private controls: OrbitControls
  private canvas: HTMLCanvasElement
  private nebula: Nebula | null = null
  private star: Star | null = null
  private ignitionBurst: IgnitionBurst | null = null
  private planetSystem: PlanetSystem | null = null
  private blackHole: BlackHole | null = null
  private supernovaRemnant: SupernovaRemnant | null = null
  private accretionSources: AccretionSource[] = []
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
  private redGiantDuration: number = 45.0 // 45 seconds total: 24s expansion + 21s stable red giant before supernova
  private supernovaTimer: number = 0
  private supernovaDuration: number = 8.0 // 8 seconds for supernova before black hole
  private cameraBasePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 50)
  private isPaused: boolean = true // Start paused until user clicks "Begin Simulation"
  private timeScale: number = 1.0
  private simulationStarted: boolean = false // Track if simulation has started
  private isCameraLocked: boolean = true // Start locked during nebula

  // Debug state for toggling visual elements
  private debugState = {
    accretionDisk: true,
    jets: true,
    eventHorizon: true,
    lensingRing: true,
    pointLight: true,
    ambientLight: true,
    accretionSources: true,
    supernovaRemnant: true,
    redGiantLayers: true,
    stellarWind: true, // Toggle stellar wind particles (surface activity)
    surfaceTexture: true, // Toggle surface texture particles
    bloom: true,
    filmGrain: true,
    vignette: true,
    showDebugOverlay: false,
    // Bloom controls
    bloomStrength: 0.8,
    bloomThreshold: 0.85,
    bloomRadius: 0.4,
    eventHorizonGlow: 2.0,
    overrideBloom: false, // Flag to override dynamic bloom during supernova
  }

  // Debug overlay elements
  private debugOverlay: HTMLElement | null = null
  private debugFps: HTMLElement | null = null
  private debugPhase: HTMLElement | null = null
  private debugMass: HTMLElement | null = null
  private debugBhRadius: HTMLElement | null = null
  private debugSourceParticles: HTMLElement | null = null
  private debugRemnantParticles: HTMLElement | null = null
  private debugTotalParticles: HTMLElement | null = null
  private lastFrameTime: number = 0
  private fps: number = 0

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

    // Initialize debug overlay elements
    this.debugOverlay = document.getElementById('debug-overlay')
    this.debugFps = document.getElementById('debug-fps')
    this.debugPhase = document.getElementById('debug-phase')
    this.debugMass = document.getElementById('debug-mass')
    this.debugBhRadius = document.getElementById('debug-bh-radius')
    this.debugSourceParticles = document.getElementById('debug-source-particles')
    this.debugRemnantParticles = document.getElementById('debug-remnant-particles')
    this.debugTotalParticles = document.getElementById('debug-total-particles')

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

    // Add gravitational lensing pass (warps spacetime around black hole)
    // MUST come before bloom so the warped scene gets bloomed beautifully
    this.lensingPass = new GravitationalLensingPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.camera
    )
    this.lensingPass.setEnabled(false) // Start disabled, enable during black hole phase
    this.composer.addPass(this.lensingPass)
    console.log('🌀 Gravitational lensing pass added to render pipeline')

    // Add bloom pass (makes bright things GLOW)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // Base bloom strength (will be dynamic during supernova)
      0.4, // Bloom radius
      0.85 // Bloom threshold (only bright things bloom)
    )
    this.composer.addPass(this.bloomPass)

    // Add cinematic effects
    this.filmGrainPass = new FilmGrainPass()
    this.composer.addPass(this.filmGrainPass)

    this.vignettePass = new VignettePass(0.4)
    this.vignettePass.renderToScreen = true
    this.composer.addPass(this.vignettePass)

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
    this.ambientLight = new THREE.AmbientLight(0x202040, 0.5)
    this.scene.add(this.ambientLight)

    // Subtle point light at center for forming protostar glow
    this.pointLight = new THREE.PointLight(0xff6600, 0.5, 100)
    this.pointLight.position.set(0, 0, 0)
    this.scene.add(this.pointLight)
  }

  private onWindowResize(): void {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    // Update composer size
    this.composer.setSize(window.innerWidth, window.innerHeight)

    // Update lensing pass resolution
    this.lensingPass.setSize(window.innerWidth, window.innerHeight)
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

  private updateDebugStats(): void {
    if (!this.debugState.showDebugOverlay) return

    // Calculate FPS
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const deltaMs = now - this.lastFrameTime
      this.fps = Math.round(1000 / deltaMs)
    }
    this.lastFrameTime = now

    // Update FPS
    if (this.debugFps) {
      this.debugFps.textContent = this.fps.toString()
    }

    // Update phase
    if (this.debugPhase) {
      this.debugPhase.textContent = this.currentPhase
    }

    // Update black hole stats
    if (this.blackHole) {
      if (this.debugMass) {
        this.debugMass.textContent = `${this.blackHole.getCurrentMass().toFixed(2)} M☉`
      }
      if (this.debugBhRadius) {
        this.debugBhRadius.textContent = `${this.blackHole.getEventHorizonRadius().toFixed(2)} units`
      }
    } else {
      if (this.debugMass) this.debugMass.textContent = 'N/A'
      if (this.debugBhRadius) this.debugBhRadius.textContent = 'N/A'
    }

    // Update particle counts
    let sourceParticles = 0
    this.accretionSources.forEach(source => {
      sourceParticles += source.getActiveParticleCount()
    })

    let remnantParticles = 0
    if (this.supernovaRemnant) {
      remnantParticles = this.supernovaRemnant.getActiveParticleCount()
    }

    const totalParticles = sourceParticles + remnantParticles

    if (this.debugSourceParticles) {
      this.debugSourceParticles.textContent = sourceParticles.toString()
    }
    if (this.debugRemnantParticles) {
      this.debugRemnantParticles.textContent = remnantParticles.toString()
    }
    if (this.debugTotalParticles) {
      this.debugTotalParticles.textContent = totalParticles.toString()
    }
  }

  private applyDebugState(): void {
    // Lights
    this.ambientLight.intensity = this.debugState.ambientLight ? 0.5 : 0
    this.pointLight.intensity = this.debugState.pointLight ? 0.5 : 0

    // Black hole elements
    if (this.blackHole) {
      this.blackHole.accretionDisk.visible = this.debugState.accretionDisk
      this.blackHole.jetTop.visible = this.debugState.jets
      this.blackHole.jetBottom.visible = this.debugState.jets
      this.blackHole.eventHorizon.visible = this.debugState.eventHorizon
      this.blackHole.lensingRing.visible = this.debugState.lensingRing
    }

    // Accretion sources
    this.accretionSources.forEach(source => {
      source.particles.visible = this.debugState.accretionSources
    })

    // Supernova remnant
    if (this.supernovaRemnant) {
      this.supernovaRemnant.shells.forEach(shell => {
        shell.visible = this.debugState.supernovaRemnant
      })
    }

    // Red giant volumetric layers
    if (this.star) {
      this.star.redGiantInnerLayer.visible = this.debugState.redGiantLayers
      this.star.redGiantMidLayer.visible = this.debugState.redGiantLayers
      this.star.redGiantOuterLayer.visible = this.debugState.redGiantLayers

      // Stellar wind and surface texture particles
      this.star.surfaceParticles.visible = this.debugState.stellarWind
      this.star.surfaceTexture.visible = this.debugState.surfaceTexture
    }

    // Post-processing
    this.bloomPass.enabled = this.debugState.bloom
    this.filmGrainPass.enabled = this.debugState.filmGrain
    this.vignettePass.enabled = this.debugState.vignette
  }

  private setupControls(): void {
    // Start button
    const startBtn = document.getElementById('btn-start')
    const startScreen = document.getElementById('start-screen')
    if (startBtn && startScreen) {
      startBtn.addEventListener('click', () => {
        // Hide start screen with fade-out animation
        startScreen.classList.add('hidden')

        // Start the simulation after fade-out animation completes
        setTimeout(() => {
          this.simulationStarted = true
          this.isPaused = false
          // Reset clock to avoid accumulated delta time
          this.clock.getDelta()
          if (playPauseBtn) {
            playPauseBtn.textContent = '⏸️ Pause'
          }
          // Remove from DOM after animation
          startScreen.remove()
        }, 500) // Match fade-out animation duration
      })
    }

    // Play/Pause button
    const playPauseBtn = document.getElementById('btn-play-pause')
    if (playPauseBtn) {
      // Set initial text to "Play" since we start paused
      playPauseBtn.textContent = '▶️ Play'

      playPauseBtn.addEventListener('click', () => {
        // Only allow pause/play after simulation has started
        if (!this.simulationStarted) return

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
        // Debug toggles
        case '1':
          this.debugState.accretionDisk = !this.debugState.accretionDisk
          this.applyDebugState()
          console.log(`[DEBUG] Accretion Disk: ${this.debugState.accretionDisk ? 'ON' : 'OFF'}`)
          break
        case '2':
          this.debugState.jets = !this.debugState.jets
          this.applyDebugState()
          console.log(`[DEBUG] Jets: ${this.debugState.jets ? 'ON' : 'OFF'}`)
          break
        case '3':
          this.debugState.eventHorizon = !this.debugState.eventHorizon
          this.applyDebugState()
          console.log(`[DEBUG] Event Horizon: ${this.debugState.eventHorizon ? 'ON' : 'OFF'}`)
          break
        case '4':
          this.debugState.lensingRing = !this.debugState.lensingRing
          this.applyDebugState()
          console.log(`[DEBUG] Lensing Ring: ${this.debugState.lensingRing ? 'ON' : 'OFF'}`)
          break
        case '5':
          this.debugState.accretionSources = !this.debugState.accretionSources
          this.applyDebugState()
          console.log(`[DEBUG] Accretion Sources: ${this.debugState.accretionSources ? 'ON' : 'OFF'}`)
          break
        case '6':
          this.debugState.supernovaRemnant = !this.debugState.supernovaRemnant
          this.applyDebugState()
          console.log(`[DEBUG] Supernova Remnant: ${this.debugState.supernovaRemnant ? 'ON' : 'OFF'}`)
          break
        case '7':
          this.debugState.redGiantLayers = !this.debugState.redGiantLayers
          this.applyDebugState()
          console.log(`[DEBUG] Red Giant Layers: ${this.debugState.redGiantLayers ? 'ON' : 'OFF'}`)
          console.log(`[DEBUG] Star exists: ${!!this.star}, Is red giant: ${this.star?.isInRedGiantPhase()}`)
          break
        case '8':
          this.debugState.stellarWind = !this.debugState.stellarWind
          this.applyDebugState()
          console.log(`[DEBUG] Stellar Wind: ${this.debugState.stellarWind ? 'ON' : 'OFF'}`)
          break
        case '9':
          this.debugState.surfaceTexture = !this.debugState.surfaceTexture
          this.applyDebugState()
          console.log(`[DEBUG] Surface Texture: ${this.debugState.surfaceTexture ? 'ON' : 'OFF'}`)
          break
        case 'l':
          this.debugState.ambientLight = !this.debugState.ambientLight
          this.debugState.pointLight = this.debugState.ambientLight // Toggle both together
          this.applyDebugState()
          console.log(`[DEBUG] Lights: ${this.debugState.ambientLight ? 'ON' : 'OFF'}`)
          break
        case 'b':
          this.debugState.bloom = !this.debugState.bloom
          this.applyDebugState()
          console.log(`[DEBUG] Bloom: ${this.debugState.bloom ? 'ON' : 'OFF'}`)
          break
        case 'g':
          this.debugState.filmGrain = !this.debugState.filmGrain
          this.applyDebugState()
          console.log(`[DEBUG] Film Grain: ${this.debugState.filmGrain ? 'ON' : 'OFF'}`)
          break
        case 'v':
          this.debugState.vignette = !this.debugState.vignette
          this.applyDebugState()
          console.log(`[DEBUG] Vignette: ${this.debugState.vignette ? 'ON' : 'OFF'}`)
          break
        case 'd':
          this.debugState.showDebugOverlay = !this.debugState.showDebugOverlay
          if (this.debugOverlay) {
            this.debugOverlay.style.display = this.debugState.showDebugOverlay ? 'block' : 'none'
          }
          console.log(`[DEBUG] Debug Overlay: ${this.debugState.showDebugOverlay ? 'ON' : 'OFF'}`)
          break
        case 'a':
          // Toggle all visual elements at once
          const newState = !this.debugState.accretionDisk // Use first element as reference
          this.debugState.accretionDisk = newState
          this.debugState.jets = newState
          this.debugState.eventHorizon = newState
          this.debugState.lensingRing = newState
          this.debugState.ambientLight = newState
          this.debugState.pointLight = newState
          this.debugState.accretionSources = newState
          this.debugState.supernovaRemnant = newState
          this.debugState.redGiantLayers = newState
          this.debugState.bloom = newState
          this.debugState.filmGrain = newState
          this.debugState.vignette = newState
          this.applyDebugState()
          console.log(`[DEBUG] Toggle All: ${newState ? 'ON' : 'OFF'}`)
          break
      }
    })

    // Bloom control sliders
    const bloomStrengthSlider = document.getElementById('debug-bloom-strength') as HTMLInputElement
    const bloomStrengthVal = document.getElementById('debug-bloom-strength-val')
    if (bloomStrengthSlider && bloomStrengthVal) {
      bloomStrengthSlider.addEventListener('input', () => {
        this.debugState.bloomStrength = parseFloat(bloomStrengthSlider.value)
        this.debugState.overrideBloom = true
        bloomStrengthVal.textContent = this.debugState.bloomStrength.toFixed(2)
        this.bloomPass.strength = this.debugState.bloomStrength
      })
    }

    const bloomThresholdSlider = document.getElementById('debug-bloom-threshold') as HTMLInputElement
    const bloomThresholdVal = document.getElementById('debug-bloom-threshold-val')
    if (bloomThresholdSlider && bloomThresholdVal) {
      bloomThresholdSlider.addEventListener('input', () => {
        this.debugState.bloomThreshold = parseFloat(bloomThresholdSlider.value)
        bloomThresholdVal.textContent = this.debugState.bloomThreshold.toFixed(2)
        this.bloomPass.threshold = this.debugState.bloomThreshold
      })
    }

    const bloomRadiusSlider = document.getElementById('debug-bloom-radius') as HTMLInputElement
    const bloomRadiusVal = document.getElementById('debug-bloom-radius-val')
    if (bloomRadiusSlider && bloomRadiusVal) {
      bloomRadiusSlider.addEventListener('input', () => {
        this.debugState.bloomRadius = parseFloat(bloomRadiusSlider.value)
        bloomRadiusVal.textContent = this.debugState.bloomRadius.toFixed(2)
        this.bloomPass.radius = this.debugState.bloomRadius
      })
    }

    const ehGlowSlider = document.getElementById('debug-eh-glow') as HTMLInputElement
    const ehGlowVal = document.getElementById('debug-eh-glow-val')
    if (ehGlowSlider && ehGlowVal) {
      ehGlowSlider.addEventListener('input', () => {
        this.debugState.eventHorizonGlow = parseFloat(ehGlowSlider.value)
        ehGlowVal.textContent = this.debugState.eventHorizonGlow.toFixed(2)
        // Apply to black hole if it exists
        if (this.blackHole) {
          (this.blackHole.eventHorizon.material as THREE.ShaderMaterial).uniforms.glowIntensity.value = this.debugState.eventHorizonGlow
        }
      })
    }

    // Reset bloom controls button
    const bloomResetBtn = document.getElementById('debug-bloom-reset')
    if (bloomResetBtn) {
      bloomResetBtn.addEventListener('click', () => {
        // Reset to defaults
        this.debugState.bloomStrength = 0.8
        this.debugState.bloomThreshold = 0.85
        this.debugState.bloomRadius = 0.4
        this.debugState.eventHorizonGlow = 2.0
        this.debugState.overrideBloom = false

        // Update sliders and displays
        if (bloomStrengthSlider && bloomStrengthVal) {
          bloomStrengthSlider.value = '0.8'
          bloomStrengthVal.textContent = '0.80'
        }
        if (bloomThresholdSlider && bloomThresholdVal) {
          bloomThresholdSlider.value = '0.85'
          bloomThresholdVal.textContent = '0.85'
        }
        if (bloomRadiusSlider && bloomRadiusVal) {
          bloomRadiusSlider.value = '0.4'
          bloomRadiusVal.textContent = '0.40'
        }
        if (ehGlowSlider && ehGlowVal) {
          ehGlowSlider.value = '2.0'
          ehGlowVal.textContent = '2.00'
        }

        // Apply to bloom pass
        this.bloomPass.strength = 0.8
        this.bloomPass.threshold = 0.85
        this.bloomPass.radius = 0.4

        // Apply to black hole if it exists
        if (this.blackHole) {
          (this.blackHole.eventHorizon.material as THREE.ShaderMaterial).uniforms.glowIntensity.value = 2.0
        }

        console.log('[DEBUG] Bloom controls reset to defaults')
      })
    }
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

    // Update camera base position for transitions
    // When camera is free, track the actual camera position for smooth lock transitions
    if (!this.isCameraLocked) {
      this.cameraBasePosition.copy(this.camera.position)
    }

    // Apply camera shake during supernova (only when locked)
    if (this.star && this.isCameraLocked) {
      const shakeIntensity = this.star.getCameraShakeIntensity()
      if (shakeIntensity > 0) {
        // Apply shake offset
        const shakeAmount = 0.5 * shakeIntensity // Max shake of 0.5 units
        this.camera.position.x = this.cameraBasePosition.x + (Math.random() - 0.5) * shakeAmount
        this.camera.position.y = this.cameraBasePosition.y + (Math.random() - 0.5) * shakeAmount
        this.camera.position.z = this.cameraBasePosition.z + (Math.random() - 0.5) * shakeAmount * 0.3
      } else {
        // Reset to base position when no shake (only when locked)
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

    // Dynamic bloom intensity based on star phase (unless manually overridden)
    if (this.star && !this.debugState.overrideBloom) {
      const shakeIntensity = this.star.getCameraShakeIntensity()

      if (shakeIntensity > 0) {
        // Supernova: bloom gets INSANE (0.8 base → 3.5 peak)
        this.bloomPass.strength = THREE.MathUtils.lerp(0.8, 3.5, shakeIntensity)
      } else if (this.star.isInRedGiantPhase()) {
        // Red giant: reduce bloom as star cools and reddens
        const expansionProgress = this.star.getExpansionProgress()
        // Start at 0.8 (main sequence bloom), reduce to 0.5 (cooler red giant)
        this.bloomPass.strength = THREE.MathUtils.lerp(0.8, 0.5, expansionProgress)
      } else {
        // Main sequence: normal bloom
        this.bloomPass.strength = 0.8
      }
    }

    // Update debug stats if overlay is visible
    this.updateDebugStats()

    // Render scene with post-processing
    this.composer.render()
  }

  private updatePhaseLogic(deltaTime: number): void {
    // Don't update phase logic until simulation has started
    if (!this.simulationStarted) {
      return
    }

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

          // Track supernova duration
          this.supernovaTimer += deltaTime

          // Update black hole (present from t=0) - STAGED FORMATION
          if (this.blackHole) {
            this.blackHole.update(deltaTime)

            // Update lensing pass with black hole position and radius
            this.lensingPass.setBlackHolePosition(this.blackHole.getPosition())
            this.lensingPass.setSchwarzschildRadius(this.blackHole.getEventHorizonRadius())

            // Enable lensing as black hole forms (fade in with formation)
            this.lensingPass.setEnabled(true)

            const t = this.supernovaTimer

            // Calculate each element's opacity based on its formation timeline
            // Stage 1: Black hole scales during core collapse (t=0-1.5s)
            let bhScale = 0
            if (t <= 1.5) {
              bhScale = t / 1.5 // Gradual growth over 1.5s
            } else {
              bhScale = 1.0
            }
            this.blackHole.setScale(bhScale)

            // Stage 2: Event horizon snaps visible when core reaches singularity (t=1.2s)
            let horizonOpacity = 0
            if (t >= 1.2) {
              horizonOpacity = 1.0 // INSTANT appearance
            }
            this.blackHole.setEventHorizonOpacity(horizonOpacity)

            // Stage 3: Accretion disk forms gradually (t=2-4.5s)
            let diskOpacity = 0
            if (t >= 2.0 && t <= 4.5) {
              diskOpacity = (t - 2.0) / 2.5 // 0→1 over 2.5s
            } else if (t > 4.5) {
              diskOpacity = 1.0
            }
            this.blackHole.setAccretionDiskOpacity(diskOpacity)

            // Stage 4: Jets emerge last (t=3.5-7.5s) - slower, more gradual
            let jetOpacity = 0
            if (t >= 3.5 && t <= 7.5) {
              jetOpacity = (t - 3.5) / 4.0 // 0→1 over 4 seconds (slower)
            } else if (t > 7.5) {
              jetOpacity = 1.0
            }
            this.blackHole.setJetOpacity(jetOpacity)
          }

          // Transition to black hole phase when supernova ends
          if (this.supernovaTimer >= this.supernovaDuration) {
            this.completeBlackHoleTransition()
          }
        }
        break

      case SimulationPhase.BLACK_HOLE:
        if (this.blackHole) {
          this.blackHole.update(deltaTime)
          // Black hole should already be at full opacity from supernova overlap fade-in
          this.blackHole.setOpacity(1.0)

          // Update lensing pass with black hole position and radius
          this.lensingPass.setBlackHolePosition(this.blackHole.getPosition())
          this.lensingPass.setSchwarzschildRadius(this.blackHole.getEventHorizonRadius())
        }
        // Continue updating supernova remnant for accretion effect
        if (this.supernovaRemnant) {
          this.supernovaRemnant.update(deltaTime)
        }
        // Update accretion sources (sporadic chunk spawners)
        this.accretionSources.forEach((source) => source.update(deltaTime))
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

    // Create black hole immediately (physically accurate: forms during core collapse)
    this.blackHole = new BlackHole(this.scene)
    this.blackHole.setScale(0) // Start at singularity point
    // Initialize all elements invisible - they'll appear in stages
    this.blackHole.setEventHorizonOpacity(0)
    this.blackHole.setAccretionDiskOpacity(0)
    this.blackHole.setJetOpacity(0)
    console.log('[BLACK HOLE] Formation begins at singularity')

    // Hide planets during supernova
    if (this.planetSystem) {
      this.planetSystem.hide()
    }

    // Update phase
    this.currentPhase = SimulationPhase.SUPERNOVA
    this.supernovaTimer = 0
    this.isCameraLocked = true // LOCK CAMERA - dramatic supernova needs fixed viewpoint
    // Reset camera to optimal viewing position for supernova (zoomed out for full view)
    this.camera.position.set(0, 0, 80)
    this.cameraBasePosition.set(0, 0, 80)
    // Reset camera target to look at center
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    this.lastDebugText = ''
    if (this.debugRadiusElement) {
      this.debugRadiusElement.textContent = ''
    }
    this.updatePhaseInfo(
      'Phase 4: SUPERNOVA!',
      'Catastrophic core collapse! The star explodes with the energy of billions of suns, scattering heavy elements across the cosmos.'
    )
  }

  private completeBlackHoleTransition(): void {
    console.log('[BLACK HOLE] Transition complete - entering black hole phase')

    // Black hole already exists and is fully formed (created at t=0, grown during t=0-2s)
    // Now set up accretion and transition to BLACK_HOLE phase

    // Apply debug glow intensity if set
    if (this.blackHole) {
      (this.blackHole.eventHorizon.material as THREE.ShaderMaterial).uniforms.glowIntensity.value = this.debugState.eventHorizonGlow
    }

    // Enable gravitational lensing pass - warp spacetime!
    this.lensingPass.setEnabled(true)
    console.log('🌀 Gravitational lensing ENABLED - spacetime warping active')

    // Hide point light - no light escapes the singularity!
    this.pointLight.visible = false
    console.log('💡 Point light hidden - singularity is dark')

    // Remove star (core has collapsed)
    if (this.star) {
      this.star.dispose()
      this.star = null
    }

    // Keep supernova remnant alive for accretion - particles will be pulled into black hole
    // Enable accretion mode with gravitational attraction
    if (this.supernovaRemnant && this.blackHole) {
      this.supernovaRemnant.enableAccretion(
        new THREE.Vector3(0, 0, 0),  // Black hole at origin
        0.15,                         // Accretion strength (3x stronger)
        this.blackHole.getEventHorizonRadius()  // Match actual event horizon size
      )

      // Set up particle consumption callback
      this.supernovaRemnant.setConsumptionCallback((mass) => {
        if (this.blackHole) {
          this.blackHole.addMass(mass)

          // Update remnant with new event horizon radius
          const newRadius = this.blackHole.getEventHorizonRadius()
          if (this.supernovaRemnant) {
            this.supernovaRemnant.updateEventHorizonRadius(newRadius)
          }
        }
      })
    }

    // Create accretion sources at various orbital positions (2x distance for longer spiral)
    const sourcePositions = [
      new THREE.Vector3(50, 30, 20),   // ~62 units from black hole
      new THREE.Vector3(-44, -20, 36), // ~62 units from black hole
      new THREE.Vector3(36, -40, -30), // ~62 units from black hole
    ]

    sourcePositions.forEach((pos) => {
      const source = new AccretionSource(
        this.scene,
        pos,
        0xff5500,  // Hot orange (accreting stellar matter)
        0.15,      // Stronger gravitational pull (3x)
        this.blackHole!.getEventHorizonRadius()  // Match actual event horizon size
      )

      // Wire up consumption callback to grow black hole
      if (this.blackHole) {
        source.setConsumptionCallback((mass) => {
          if (this.blackHole) {
            this.blackHole.addMass(mass)

            // Update all sources with new event horizon radius
            const newRadius = this.blackHole.getEventHorizonRadius()
            this.accretionSources.forEach(s => s.updateEventHorizonRadius(newRadius))
          }
        })
      }

      this.accretionSources.push(source)
    })

    // Remove planets
    if (this.planetSystem) {
      this.planetSystem.dispose()
      this.planetSystem = null
    }

    // Update phase
    this.currentPhase = SimulationPhase.BLACK_HOLE
    this.isCameraLocked = true // Keep camera locked for black hole phase
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
    this.isCameraLocked = false // FREE CAMERA - user can explore the star
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
