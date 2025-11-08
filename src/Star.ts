import * as THREE from 'three'
import { SupernovaFlash } from './SupernovaFlash'
import { Noise3D } from './utils/Noise'

export class Star {
  private star!: THREE.Mesh
  private starLight!: THREE.PointLight
  private scene: THREE.Scene
  private time: number = 0

  // Corona particles for outer atmosphere
  private corona!: THREE.Points
  private coronaGeometry!: THREE.BufferGeometry
  private coronaMaterial!: THREE.PointsMaterial
  private coronaCount: number = 1000
  private coronaPositions!: Float32Array
  private coronaFadeInDuration: number = 2.0 // Fade in over 2 seconds
  private coronaFadeInTime: number = 0
  private coronaFadeOutDuration: number = 3.0 // Fade out over 3 seconds during red giant start
  private coronaFadeOutTime: number = 0

  // Surface texture particles for mottled appearance (public for debug toggles)
  public surfaceTexture!: THREE.Points
  private surfaceTextureGeometry!: THREE.BufferGeometry
  private surfaceTextureMaterial!: THREE.PointsMaterial
  private surfaceTextureCount: number = 2000
  private surfaceTexturePositions!: Float32Array
  private surfaceTextureBasePositions!: Float32Array // Store base positions for convection movement
  private surfaceTextureCells!: Float32Array // Cell ID for each particle (for convection grouping)
  private surfaceTextureColors!: Float32Array // Per-particle colors for cell visualization

  // Convection cell parameters
  private readonly cellNoiseFrequency: number = 0.3 // Low frequency = large cells (~4 unit diameter)
  private readonly numConvectionCells: number = 18 // Betelgeuse-scale: ~15-20 massive cells

  // Surface activity (public for debug toggles)
  public surfaceParticles!: THREE.Points
  private surfaceGeometry!: THREE.BufferGeometry
  private surfaceMaterial!: THREE.ShaderMaterial // Custom shader for per-particle sizes
  private surfaceCount: number = 1200 // Subtle stellar wind for main sequence
  private surfacePositions!: Float32Array
  private surfaceVelocities!: Float32Array
  private surfaceSizes!: Float32Array // Per-particle size for growth effect (rendered size)
  private surfaceBaseSizes!: Float32Array // Original spawn sizes (never modified, used for growth calculation)
  private surfaceColors!: Float32Array // Per-particle colors (RGB, fades with distance)

  // Layer 2: Energy streak particles (fast, bright bursts)
  public streakParticles!: THREE.Points
  private streakGeometry!: THREE.BufferGeometry
  private streakMaterial!: THREE.ShaderMaterial
  private streakCount: number = 600 // Fast energy bursts
  private streakPositions!: Float32Array
  private streakVelocities!: Float32Array
  private streakSizes!: Float32Array
  private streakColors!: Float32Array

  // Layer 3: Hero light beams (dramatic rays)
  public heroBeams!: THREE.Group
  private beamCount: number = 12 // Occasional dramatic rays
  private beamMeshes: THREE.Mesh[] = []
  private beamOpacities: number[] = []
  private beamPulsePhases: number[] = []

  private starRadius: number = 4.0 // Main sequence star - compact and stable
  private initialRadius: number // Start size (from protostar)
  private currentRadius: number // Current size during contraction
  private contractionDuration: number = 3.0 // 3 seconds to contract
  private contractionTime: number = 0

  // No fade in needed - start at full opacity for seamless transition
  // private currentOpacity: number = 1.0 // Unused for now

  // Red giant expansion state
  private isRedGiant: boolean = false
  private redGiantRadius: number = 25.0 // Massive red giant size
  private expansionDuration: number = 24.0 // 24 seconds to expand (3x longer for demo)
  private expansionTime: number = 0
  private expansionStartRadius: number = 4.0
  private irregularPulseOffset: number = 0 // Random variation in pulsing
  private currentPulse: number = 1.0 // Current breathing pulse value (1.0 = baseline)

  // Red giant volumetric layers for depth effect (public for debug toggles)
  public redGiantInnerLayer!: THREE.Mesh
  public redGiantMidLayer!: THREE.Mesh
  public redGiantOuterLayer!: THREE.Mesh

  // Supernova state
  private isSupernova: boolean = false
  private supernovaTime: number = 0
  private supernovaDuration: number = 6.0 // 6 seconds for explosion
  private shockwave!: THREE.Mesh
  private shockwaveMaterial!: THREE.MeshBasicMaterial
  private supernovaFlash: SupernovaFlash | null = null

  // Core collapse state (physically accurate: happens at supernova start)
  private isCollapsing: boolean = false
  private collapseTime: number = 0
  private collapseDuration: number = 1.5 // 1.5 seconds for core collapse
  private collapseStartScale: number = 1.0

  constructor(scene: THREE.Scene, initialRadius: number = 4.8) {
    this.initialRadius = initialRadius
    this.currentRadius = initialRadius // Start at whatever size the protostar was
    this.scene = scene

    // Create main star sphere
    this.createStar()

    // Create corona (outer atmosphere)
    this.createCorona()

    // Create surface activity particles (flares, ejections)
    this.createSurfaceActivity()

    // Create streak particles (Layer 2 - energy bursts)
    this.createStreakParticles()

    // Create hero beams (Layer 3 - dramatic rays)
    this.createHeroBeams()

    // Create surface texture particles (for mottled red giant appearance)
    this.createSurfaceTexture()

    // Create red giant volumetric layers (invisible initially)
    this.createRedGiantLayers()

    // Create shockwave (invisible initially)
    this.createShockwave()
  }

  private createShockwave(): void {
    // Create expanding ring geometry for shockwave
    const geometry = new THREE.RingGeometry(1, 1.5, 64)
    this.shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })

    this.shockwave = new THREE.Mesh(geometry, this.shockwaveMaterial)
    this.shockwave.rotation.x = Math.PI / 2 // Orient horizontally
    this.scene.add(this.shockwave)
  }

  private createSurfaceTexture(): void {
    // Initialize geometry for surface texture
    this.surfaceTextureGeometry = new THREE.BufferGeometry()
    this.surfaceTexturePositions = new Float32Array(this.surfaceTextureCount * 3)
    this.surfaceTextureBasePositions = new Float32Array(this.surfaceTextureCount * 3)
    this.surfaceTextureCells = new Float32Array(this.surfaceTextureCount)
    this.surfaceTextureColors = new Float32Array(this.surfaceTextureCount * 3)

    // Create particles on star surface for mottled texture
    for (let i = 0; i < this.surfaceTextureCount; i++) {
      const i3 = i * 3

      // Place on star surface with slight depth variation
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radiusVariation = 0.95 + Math.random() * 0.1 // 0.95-1.05 of star radius

      const x = this.starRadius * radiusVariation * Math.sin(phi) * Math.cos(theta)
      const y = this.starRadius * radiusVariation * Math.sin(phi) * Math.sin(theta)
      const z = this.starRadius * radiusVariation * Math.cos(phi)

      this.surfaceTexturePositions[i3] = x
      this.surfaceTexturePositions[i3 + 1] = y
      this.surfaceTexturePositions[i3 + 2] = z

      // Store base positions for convection movement
      this.surfaceTextureBasePositions[i3] = x
      this.surfaceTextureBasePositions[i3 + 1] = y
      this.surfaceTextureBasePositions[i3 + 2] = z

      // Assign particle to convection cell using 3D noise
      // Use spherical coordinates for coherent cell assignment
      const noiseValue = Noise3D.noise(
        theta * this.cellNoiseFrequency,
        phi * this.cellNoiseFrequency,
        0 // No time component yet - static cell assignment
      )
      this.surfaceTextureCells[i] = Noise3D.noiseToCell(noiseValue, this.numConvectionCells)

      // Assign temperature-based colors (will be updated in animation loop)
      // Initialize to mid-tone red-orange
      const color = new THREE.Color(0xff5533)
      this.surfaceTextureColors[i3] = color.r
      this.surfaceTextureColors[i3 + 1] = color.g
      this.surfaceTextureColors[i3 + 2] = color.b
    }

    this.surfaceTextureGeometry.setAttribute('position', new THREE.BufferAttribute(this.surfaceTexturePositions, 3))
    this.surfaceTextureGeometry.setAttribute('color', new THREE.BufferAttribute(this.surfaceTextureColors, 3))

    // Surface texture material - temperature-based convection cells
    this.surfaceTextureMaterial = new THREE.PointsMaterial({
      size: 5.0, // Large enough to see cells clearly
      vertexColors: true, // Use temperature-based per-particle colors
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.NormalBlending, // Normal blending so dark spots show
      depthWrite: false
    })

    this.surfaceTexture = new THREE.Points(this.surfaceTextureGeometry, this.surfaceTextureMaterial)
    this.scene.add(this.surfaceTexture)
  }

  private createRedGiantLayers(): void {
    // Create multiple semi-transparent spheres for volumetric depth effect
    // These are only visible during red giant phase

    // Inner layer (brightest, hottest core)
    const innerGeometry = new THREE.SphereGeometry(1, 32, 32)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8844, // Bright orange-yellow core
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide // Render from inside for depth
    })
    this.redGiantInnerLayer = new THREE.Mesh(innerGeometry, innerMaterial)
    this.scene.add(this.redGiantInnerLayer)

    // Mid layer (medium brightness)
    const midGeometry = new THREE.SphereGeometry(1, 32, 32)
    const midMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5533, // Red-orange middle atmosphere
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
    this.redGiantMidLayer = new THREE.Mesh(midGeometry, midMaterial)
    this.scene.add(this.redGiantMidLayer)

    // Outer layer (dimmest, most diffuse)
    const outerGeometry = new THREE.SphereGeometry(1, 32, 32)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0xcc2211, // Deep red outer atmosphere
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
    this.redGiantOuterLayer = new THREE.Mesh(outerGeometry, outerMaterial)
    this.scene.add(this.redGiantOuterLayer)
  }

  private createStar(): void {
    // Main star sphere with bright yellow-white color
    const geometry = new THREE.SphereGeometry(this.starRadius, 64, 64)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff88,
      emissive: 0xffff44,
      emissiveIntensity: 3,
      roughness: 0.8,
      metalness: 0.1
    })

    this.star = new THREE.Mesh(geometry, material)
    this.star.scale.setScalar(this.currentRadius / this.starRadius) // Start at protostar size
    this.scene.add(this.star)

    // Main star light - bright and far-reaching
    this.starLight = new THREE.PointLight(0xffffcc, 15, 150)
    this.starLight.position.set(0, 0, 0)
    this.scene.add(this.starLight)
  }

  private createCorona(): void {
    // Initialize geometry for corona
    this.coronaGeometry = new THREE.BufferGeometry()
    this.coronaPositions = new Float32Array(this.coronaCount * 3)

    // Create corona particles in a tight shell around star
    for (let i = 0; i < this.coronaCount; i++) {
      const i3 = i * 3

      // Corona very tight to star surface - use INITIAL radius so it's visible from start
      const radius = this.initialRadius * (1.02 + Math.random() * 0.06) // Very tight: 1.02-1.08x star size
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.coronaPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.coronaPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.coronaPositions[i3 + 2] = radius * Math.cos(phi)
    }

    this.coronaGeometry.setAttribute('position', new THREE.BufferAttribute(this.coronaPositions, 3))

    // Corona material - subtle yellowish-white glow
    this.coronaMaterial = new THREE.PointsMaterial({
      size: 0.4, // Smaller particles
      color: 0xffffaa, // Soft yellow-white
      transparent: true,
      opacity: 0.0, // Start invisible, fade in during main sequence
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.corona = new THREE.Points(this.coronaGeometry, this.coronaMaterial)
    this.scene.add(this.corona)
  }

  private createSurfaceActivity(): void {
    // Initialize geometry for surface activity
    this.surfaceGeometry = new THREE.BufferGeometry()
    this.surfacePositions = new Float32Array(this.surfaceCount * 3)
    this.surfaceVelocities = new Float32Array(this.surfaceCount * 3)
    this.surfaceSizes = new Float32Array(this.surfaceCount)
    this.surfaceBaseSizes = new Float32Array(this.surfaceCount) // Original sizes, never modified
    this.surfaceColors = new Float32Array(this.surfaceCount * 3) // RGB per particle

    // Create particles on star surface
    for (let i = 0; i < this.surfaceCount; i++) {
      const i3 = i * 3

      // Place on star surface
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.surfacePositions[i3] = this.starRadius * Math.sin(phi) * Math.cos(theta)
      this.surfacePositions[i3 + 1] = this.starRadius * Math.sin(phi) * Math.sin(theta)
      this.surfacePositions[i3 + 2] = this.starRadius * Math.cos(phi)

      // Initial velocities pointing outward (stellar wind / solar flares)
      const speed = 0.03 + Math.random() * 0.08 // Balanced speed
      this.surfaceVelocities[i3] = this.surfacePositions[i3] / this.starRadius * speed
      this.surfaceVelocities[i3 + 1] = this.surfacePositions[i3 + 1] / this.starRadius * speed
      this.surfaceVelocities[i3 + 2] = this.surfacePositions[i3 + 2] / this.starRadius * speed

      // Initialize base size (will grow with distance during red giant)
      const baseSize = 0.5 + Math.random() * 0.5 // 0.5-1.0 base size (subtle but visible)
      this.surfaceSizes[i] = baseSize
      this.surfaceBaseSizes[i] = baseSize // Store original size for growth calculations

      // Initialize color - bright yellow-white for main sequence photons
      this.surfaceColors[i3] = 1.0     // R
      this.surfaceColors[i3 + 1] = 0.98 // G (nearly white)
      this.surfaceColors[i3 + 2] = 0.85 // B (slight warm tint)
    }

    this.surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(this.surfacePositions, 3))
    this.surfaceGeometry.setAttribute('size', new THREE.BufferAttribute(this.surfaceSizes, 1))
    this.surfaceGeometry.setAttribute('color', new THREE.BufferAttribute(this.surfaceColors, 3))

    // Custom shader material for per-particle sizes and colors
    this.surfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying float vSize;
        varying vec3 vColor;

        void main() {
          vSize = size;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z); // Size attenuation
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;

        void main() {
          // Create velocity-based streak (compressed X = elongated appearance)
          vec2 coord = gl_PointCoord - vec2(0.5);
          float streak = length(vec2(coord.x * 0.3, coord.y)); // Compress X to create streak
          if (streak > 0.5) discard;

          // Bright core with soft edges for photon-like appearance
          float alpha = 1.0 - smoothstep(0.1, 0.5, streak);
          alpha = pow(alpha, 0.5); // Sharper falloff = brighter core

          // Boost color intensity for bloom/glow effect
          vec3 brightColor = vColor * 1.3; // Subtle overbright for post-processing bloom
          gl_FragColor = vec4(brightColor, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.surfaceParticles = new THREE.Points(this.surfaceGeometry, this.surfaceMaterial)
    this.scene.add(this.surfaceParticles)
  }

  private createStreakParticles(): void {
    // Layer 2: Fast, bright energy bursts
    this.streakGeometry = new THREE.BufferGeometry()
    this.streakPositions = new Float32Array(this.streakCount * 3)
    this.streakVelocities = new Float32Array(this.streakCount * 3)
    this.streakSizes = new Float32Array(this.streakCount)
    this.streakColors = new Float32Array(this.streakCount * 3)

    // Create faster-moving particles with whiter colors
    for (let i = 0; i < this.streakCount; i++) {
      const i3 = i * 3

      // Random position on star surface
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.streakPositions[i3] = this.starRadius * Math.sin(phi) * Math.cos(theta)
      this.streakPositions[i3 + 1] = this.starRadius * Math.sin(phi) * Math.sin(theta)
      this.streakPositions[i3 + 2] = this.starRadius * Math.cos(phi)

      // Faster velocities than base particles (2-3x speed)
      const speed = 0.08 + Math.random() * 0.12 // 0.08-0.20 (vs base 0.03-0.11)
      this.streakVelocities[i3] = this.streakPositions[i3] / this.starRadius * speed
      this.streakVelocities[i3 + 1] = this.streakPositions[i3 + 1] / this.starRadius * speed
      this.streakVelocities[i3 + 2] = this.streakPositions[i3 + 2] / this.starRadius * speed

      // Smaller size for streaks (0.3-0.6)
      this.streakSizes[i] = 0.3 + Math.random() * 0.3

      // Brighter white color
      this.streakColors[i3] = 1.0     // R
      this.streakColors[i3 + 1] = 1.0 // G (pure white)
      this.streakColors[i3 + 2] = 0.95 // B (very slight warm)
    }

    this.streakGeometry.setAttribute('position', new THREE.BufferAttribute(this.streakPositions, 3))
    this.streakGeometry.setAttribute('size', new THREE.BufferAttribute(this.streakSizes, 1))
    this.streakGeometry.setAttribute('color', new THREE.BufferAttribute(this.streakColors, 3))

    // Use elongated streak shader (more aggressive than base particles)
    this.streakMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying float vSize;
        varying vec3 vColor;

        void main() {
          vSize = size;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;

        void main() {
          // Aggressive streak (more elongated than base particles)
          vec2 coord = gl_PointCoord - vec2(0.5);
          float streak = length(vec2(coord.x * 0.15, coord.y)); // Heavy X compression
          if (streak > 0.5) discard;

          // Sharp bright core
          float alpha = 1.0 - smoothstep(0.05, 0.5, streak);
          alpha = pow(alpha, 0.3); // Very sharp falloff

          // Brighter boost for streaks
          vec3 brightColor = vColor * 1.6;
          gl_FragColor = vec4(brightColor, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.streakParticles = new THREE.Points(this.streakGeometry, this.streakMaterial)
    this.scene.add(this.streakParticles)
  }

  private createHeroBeams(): void {
    // Layer 3: Dramatic light rays
    this.heroBeams = new THREE.Group()

    for (let i = 0; i < this.beamCount; i++) {
      // Random direction from star center
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const dirX = Math.sin(phi) * Math.cos(theta)
      const dirY = Math.sin(phi) * Math.sin(theta)
      const dirZ = Math.cos(phi)

      // Create elongated beam geometry (thin cylinder/cone)
      const beamLength = 15 + Math.random() * 10 // 15-25 units long
      const beamWidth = 0.15 + Math.random() * 0.1 // 0.15-0.25 wide

      const geometry = new THREE.CylinderGeometry(beamWidth, beamWidth * 0.3, beamLength, 8, 1, true)

      // Custom shader material for beam glow
      const material = new THREE.ShaderMaterial({
        uniforms: {
          opacity: { value: 0.0 }, // Start invisible, will animate
          time: { value: 0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;

          void main() {
            // Fade from center to edges
            float radialFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
            radialFade = pow(radialFade, 2.0);

            // Fade along length (bright at base, fade to tip)
            float lengthFade = 1.0 - vUv.y;
            lengthFade = pow(lengthFade, 1.5);

            float alpha = radialFade * lengthFade * opacity;

            // Yellow-white color
            vec3 color = vec3(1.0, 0.98, 0.85);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })

      const beam = new THREE.Mesh(geometry, material)

      // Position at star surface
      beam.position.set(
        dirX * this.starRadius,
        dirY * this.starRadius,
        dirZ * this.starRadius
      )

      // Orient beam outward
      beam.lookAt(
        dirX * (this.starRadius + beamLength),
        dirY * (this.starRadius + beamLength),
        dirZ * (this.starRadius + beamLength)
      )
      beam.rotateX(Math.PI / 2) // Cylinder default is Y-up

      this.heroBeams.add(beam)
      this.beamMeshes.push(beam)
      this.beamOpacities.push(0.0)
      this.beamPulsePhases.push(Math.random() * Math.PI * 2) // Random phase offset
    }

    this.scene.add(this.heroBeams)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Handle core collapse (happens during supernova, t=0-2s)
    if (this.isCollapsing && this.collapseTime < this.collapseDuration) {
      this.collapseTime += deltaTime
      const collapseProgress = Math.min(this.collapseTime / this.collapseDuration, 1.0)

      // Shrink star scale from start → 0 (implosion)
      const targetScale = THREE.MathUtils.lerp(this.collapseStartScale, 0, collapseProgress)
      this.star.scale.setScalar(targetScale)

      if (collapseProgress >= 1.0) {
        console.log('[COLLAPSE] Core collapsed to singularity')
      }
    }

    // Handle supernova explosion
    if (this.isSupernova) {
      this.supernovaTime += deltaTime
      const supernovaProgress = Math.min(this.supernovaTime / this.supernovaDuration, 1.0)

      // Update flash effect
      if (this.supernovaFlash) {
        this.supernovaFlash.update(deltaTime)
        if (!this.supernovaFlash.active) {
          this.supernovaFlash = null
        }
      }

      // Bright flash at beginning, then fade
      const material = this.star.material as THREE.MeshStandardMaterial
      if (supernovaProgress < 0.1) {
        // Initial MASSIVE flash (0-10%) - should be blinding and fill the entire scene
        const flashProgress = supernovaProgress / 0.1
        material.emissiveIntensity = THREE.MathUtils.lerp(2, 50, flashProgress)
        // Crank light to insane levels - supernova briefly outshines entire galaxy
        this.starLight.intensity = THREE.MathUtils.lerp(10, 1000, flashProgress)
        this.starLight.distance = 500 // Increase range so it lights everything
        material.color.set(0xffffff) // Pure white during flash
      } else {
        // Fade out (10-100%)
        const fadeProgress = (supernovaProgress - 0.1) / 0.9
        material.opacity = THREE.MathUtils.lerp(0.85, 0.0, fadeProgress)
        material.emissiveIntensity = THREE.MathUtils.lerp(50, 0, fadeProgress)
        this.starLight.intensity = THREE.MathUtils.lerp(1000, 0, fadeProgress)
        this.starLight.distance = THREE.MathUtils.lerp(500, 150, fadeProgress)

        // Fade out all other objects
        this.coronaMaterial.opacity = THREE.MathUtils.lerp(0.7, 0.0, fadeProgress)
        this.surfaceTextureMaterial.opacity = THREE.MathUtils.lerp(0.4, 0.0, fadeProgress)
      }

      // Expanding shockwave
      const shockwaveScale = THREE.MathUtils.lerp(this.currentRadius, this.currentRadius * 20, supernovaProgress)
      this.shockwave.scale.setScalar(shockwaveScale)

      // Shockwave opacity - peak at 20%, then fade
      if (supernovaProgress < 0.2) {
        this.shockwaveMaterial.opacity = THREE.MathUtils.lerp(0, 0.8, supernovaProgress / 0.2)
      } else {
        this.shockwaveMaterial.opacity = THREE.MathUtils.lerp(0.8, 0, (supernovaProgress - 0.2) / 0.8)
      }

      // Make explosion particles bright white during flash, then blue
      const shaderMaterial = this.surfaceMaterial as THREE.ShaderMaterial
      const colors = this.surfaceGeometry.attributes.color.array as Float32Array

      if (supernovaProgress < 0.1) {
        // Pure white during flash
        for (let i = 0; i < this.surfaceCount; i++) {
          const i3 = i * 3
          colors[i3] = 1.0
          colors[i3 + 1] = 1.0
          colors[i3 + 2] = 1.0
        }
        this.surfaceGeometry.attributes.color.needsUpdate = true
        shaderMaterial.uniforms.opacity.value = 1.0
      } else {
        // Blue after flash
        for (let i = 0; i < this.surfaceCount; i++) {
          const i3 = i * 3
          colors[i3] = 0.67    // R (blue-ish)
          colors[i3 + 1] = 0.8 // G
          colors[i3 + 2] = 1.0 // B
        }
        this.surfaceGeometry.attributes.color.needsUpdate = true
        shaderMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(1.0, 0.3, (supernovaProgress - 0.1) / 0.9)
      }
    }

    // Calculate expansion progress (needed for particle colors later)
    const expansionProgress = this.isRedGiant
      ? Math.min(this.expansionTime / this.expansionDuration, 1.0)
      : 0

    // Skip normal star behavior during supernova
    if (!this.isSupernova) {
      // Smooth contraction from protostar size to main sequence size
      if (this.contractionTime < this.contractionDuration) {
      this.contractionTime += deltaTime
      const contractionProgress = Math.min(this.contractionTime / this.contractionDuration, 1.0)
      // Use easeOutCubic for smooth deceleration
      const eased = 1 - Math.pow(1 - contractionProgress, 3)
      // Contract from initial size (whatever protostar was) to final main sequence size
      this.currentRadius = THREE.MathUtils.lerp(this.initialRadius, this.starRadius, eased)
    } else if (this.isRedGiant && this.expansionTime < this.expansionDuration) {
      // Red giant expansion - dramatic size increase
      this.expansionTime += deltaTime
      const expansionProgress = Math.min(this.expansionTime / this.expansionDuration, 1.0)
      // Use easeInOutQuad for smooth acceleration and deceleration
      const eased = expansionProgress < 0.5
        ? 2 * expansionProgress * expansionProgress
        : 1 - Math.pow(-2 * expansionProgress + 2, 2) / 2
      this.currentRadius = THREE.MathUtils.lerp(this.expansionStartRadius, this.redGiantRadius, eased)
    } else if (!this.isRedGiant) {
      this.currentRadius = this.starRadius
    }

    // Pulse effect - larger and slower for red giants with irregular variation
    const pulseFrequency = this.isRedGiant ? 0.3 : 0.5
    const pulseAmplitude = this.isRedGiant ? 0.04 : 0.02

    let pulse: number
    if (this.isRedGiant) {
      // Irregular pulsing for red giant - add chaos
      this.irregularPulseOffset += (Math.random() - 0.5) * 0.02
      this.irregularPulseOffset *= 0.98 // Decay for stability
      const irregularPulse = Math.sin(this.time * pulseFrequency + this.irregularPulseOffset) * pulseAmplitude
      const secondaryPulse = Math.sin(this.time * 0.15) * 0.02 // Slower secondary breathing
      pulse = 1 + irregularPulse + secondaryPulse
    } else {
      pulse = Math.sin(this.time * pulseFrequency) * pulseAmplitude + 1
    }

    this.currentPulse = pulse // Store for stellar wind modulation

    const targetScale = (this.currentRadius / this.starRadius) * pulse
    this.star.scale.setScalar(targetScale)

    // Update star color - shift from yellow-white to red-orange
    const material = this.star.material as THREE.MeshStandardMaterial
    if (this.isRedGiant) {
      // Yellow-white (main sequence) to red-orange (red giant)
      const mainSequenceColor = new THREE.Color(0xffff88)
      const redGiantColor = new THREE.Color(0xff5533)
      material.color.lerpColors(mainSequenceColor, redGiantColor, expansionProgress)

      // Adjust emissive color too
      const mainSequenceEmissive = new THREE.Color(0xffff44)
      const redGiantEmissive = new THREE.Color(0xff4422)
      material.emissive.lerpColors(mainSequenceEmissive, redGiantEmissive, expansionProgress)

      // Red giants are cooler but larger, so less emissive intensity
      // Use linear progression to match color transition
      material.emissiveIntensity = THREE.MathUtils.lerp(3, 2, expansionProgress)

      // Surface opacity variation - make red giant more diffuse/transparent
      // Also delay the transparency to maintain solid appearance longer
      material.transparent = true
      const opacityProgress = Math.max(0, (expansionProgress - 0.3) / 0.7) // Start at 30% expansion
      material.opacity = THREE.MathUtils.lerp(1.0, 0.7, opacityProgress) // More transparent to show inner layers
    }

    // Pulsing light intensity - dimmer for red giants (cooler surface)
    const baseLightIntensity = this.isRedGiant ? 10 : 15
    const lightPulse = Math.sin(this.time * 0.7) * 2 + baseLightIntensity
    this.starLight.intensity = lightPulse

    // Update light color to match star
    if (this.isRedGiant) {
      const lightColor = material.color.clone()
      this.starLight.color.copy(lightColor)
    }

    // Rotate corona slowly
    this.corona.rotation.y += 0.0005
    this.corona.rotation.x += 0.0002

    // Fade in corona during early main sequence (unless red giant or supernova)
    if (!this.isRedGiant && !this.isSupernova) {
      if (this.coronaFadeInTime < this.coronaFadeInDuration) {
        this.coronaFadeInTime += deltaTime
        const fadeProgress = Math.min(this.coronaFadeInTime / this.coronaFadeInDuration, 1.0)
        // Fade from 0 to 0.5 (subtle glow)
        this.coronaMaterial.opacity = fadeProgress * 0.5
      }
    }

    // Fade out corona during red giant phase (red giants have diffuse atmospheres, not distinct coronas)
    if (this.isRedGiant && !this.isSupernova) {
      if (this.coronaFadeOutTime < this.coronaFadeOutDuration) {
        this.coronaFadeOutTime += deltaTime
        const fadeProgress = Math.min(this.coronaFadeOutTime / this.coronaFadeOutDuration, 1.0)
        // Fade from 0.5 (main sequence) to 0.0 (invisible)
        this.coronaMaterial.opacity = (1.0 - fadeProgress) * 0.5
      } else {
        this.coronaMaterial.opacity = 0.0
      }

      // Update volumetric layers for depth effect - only if they're visible
      const innerMaterial = this.redGiantInnerLayer.material as THREE.MeshBasicMaterial
      const midMaterial = this.redGiantMidLayer.material as THREE.MeshBasicMaterial
      const outerMaterial = this.redGiantOuterLayer.material as THREE.MeshBasicMaterial

      if (this.redGiantInnerLayer.visible) {
        // Scale layers to actual world size, spread them out for visible depth
        // Inner layer - hot core at 70% of current radius
        const innerScale = this.currentRadius * 0.7 * pulse
        this.redGiantInnerLayer.scale.setScalar(innerScale)
        innerMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.4, expansionProgress)

        // Mid layer - at 95% of current radius (just below surface)
        const midScale = this.currentRadius * 0.95 * pulse
        this.redGiantMidLayer.scale.setScalar(midScale)
        midMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.3, expansionProgress)

        // Outer layer - at 120% of current radius (extended diffuse atmosphere)
        const outerScale = this.currentRadius * 1.2 * pulse
        this.redGiantOuterLayer.scale.setScalar(outerScale)
        outerMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.25, expansionProgress)
      } else {
        // When toggled off, ensure layers are invisible
        innerMaterial.opacity = 0
        midMaterial.opacity = 0
        outerMaterial.opacity = 0
      }

      // Animate surface texture particles - make them breathe and move with convection
      this.surfaceTextureMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.4, expansionProgress)

      // Update each surface texture particle position for NOISE-DRIVEN CELL convection
      const texturePositions = this.surfaceTextureGeometry.attributes.position.array as Float32Array
      const scaleFactor = (this.currentRadius / this.starRadius) * pulse // Breathe with the star

      // Time evolution for churning cells - faster for visible movement
      const slowTime = this.time * 0.25 // Increased from 0.08 for visible churning

      for (let i = 0; i < this.surfaceTextureCount; i++) {
        const i3 = i * 3

        // Get base position
        const baseX = this.surfaceTextureBasePositions[i3]
        const baseY = this.surfaceTextureBasePositions[i3 + 1]
        const baseZ = this.surfaceTextureBasePositions[i3 + 2]

        // Convert to spherical coordinates for noise sampling
        const baseRadius = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ)
        const theta = Math.atan2(baseY, baseX)
        const phi = Math.acos(baseZ / baseRadius)

        // Sample 3D noise for this cell (coherent across cell members)
        // Add small per-particle offset to time so cells evolve at different rates
        const particleTimeOffset = this.surfaceTextureCells[i] * 0.1
        const noiseX = theta * this.cellNoiseFrequency
        const noiseY = phi * this.cellNoiseFrequency
        const noiseZ = slowTime + particleTimeOffset
        const cellNoise = Noise3D.noise(noiseX, noiseY, noiseZ)

        // Convert noise to radial pulsation (cells breathe in/out together)
        // Scale displacement relative to current star size for visibility
        // Map [0,1] noise to displacement as percentage of base radius
        const displacementPercent = (cellNoise - 0.5) * 0.3 // ±15% of radius
        const radialDisplacement = baseRadius * displacementPercent

        // Apply radial displacement along normal direction
        const normal = {
          x: baseX / baseRadius,
          y: baseY / baseRadius,
          z: baseZ / baseRadius
        }

        const displacedX = baseX + normal.x * radialDisplacement
        const displacedY = baseY + normal.y * radialDisplacement
        const displacedZ = baseZ + normal.z * radialDisplacement

        // Apply scale factor
        texturePositions[i3] = displacedX * scaleFactor
        texturePositions[i3 + 1] = displacedY * scaleFactor
        texturePositions[i3 + 2] = displacedZ * scaleFactor

        // Update particle color based on temperature (noise = convection upwelling)
        // High noise (>0.5) = hot upwelling plasma (bright red-orange)
        // Low noise (<0.5) = cool downflow (dark red-brown)
        const hotColor = new THREE.Color(0xff4422) // Bright red-orange (hot for red giant)
        const coolColor = new THREE.Color(0x441100) // Very dark red-brown (cool)
        const cellColor = new THREE.Color().lerpColors(coolColor, hotColor, cellNoise)

        this.surfaceTextureColors[i3] = cellColor.r
        this.surfaceTextureColors[i3 + 1] = cellColor.g
        this.surfaceTextureColors[i3 + 2] = cellColor.b
      }

      this.surfaceTextureGeometry.attributes.position.needsUpdate = true
      this.surfaceTextureGeometry.attributes.color.needsUpdate = true
    } else {
      // Hide surface texture for main sequence
      this.surfaceTextureMaterial.opacity = 0.0
    }
    } // End skip normal star behavior during supernova

    // Update surface activity particles (stellar wind)
    const positions = this.surfaceGeometry.attributes.position.array as Float32Array
    const velocities = this.surfaceVelocities

    // Red giants need faster wind to reach far distances during limited phase duration
    const velocityScale = this.isRedGiant ? 0.8 : 1.0 // Faster than before to show growth

    for (let i = 0; i < this.surfaceCount; i++) {
      const i3 = i * 3

      // Add tangential drift for red giants (creates wispy streamers)
      if (this.isRedGiant && !this.isSupernova) {
        // Calculate radial direction
        const px = positions[i3]
        const py = positions[i3 + 1]
        const pz = positions[i3 + 2]
        const dist = Math.sqrt(px * px + py * py + pz * pz)

        if (dist > 0.1) {
          const radialX = px / dist
          const radialZ = pz / dist

          // Tangential direction (perpendicular to radial, in XZ plane)
          const tangentX = -radialZ
          const tangentZ = radialX
          const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ)

          if (tangentLength > 0.001) {
            // Apply gentle tangential drift (creates curved paths)
            // Modulate drift with breathing pulse
            const driftStrength = 0.0002 * this.currentPulse
            velocities[i3] += (tangentX / tangentLength) * driftStrength
            velocities[i3 + 2] += (tangentZ / tangentLength) * driftStrength
          }
        }
      }

      // Update positions with velocity scaling
      positions[i3] += velocities[i3] * velocityScale
      positions[i3 + 1] += velocities[i3 + 1] * velocityScale
      positions[i3 + 2] += velocities[i3 + 2] * velocityScale

      // Calculate distance from center
      const distance = Math.sqrt(
        positions[i3] ** 2 +
        positions[i3 + 1] ** 2 +
        positions[i3 + 2] ** 2
      )

      // Add flickering effect for main sequence stellar wind (photon-like pulsing)
      if (!this.isRedGiant && !this.isSupernova) {
        const sizes = this.surfaceGeometry.attributes.size.array as Float32Array
        const baseSize = this.surfaceBaseSizes[i]

        // Time-based flicker with per-particle variation (subtle)
        const flickerPhase = Math.sin(this.time * 3.0 + i * 0.1) * 0.5 + 0.5 // 0-1 range
        sizes[i] = baseSize * (0.9 + flickerPhase * 0.2) // 90%-110% size variation (subtle)
      }

      // Update particle size and color based on distance (red giants only)
      if (this.isRedGiant && !this.isSupernova) {
        const sizes = this.surfaceGeometry.attributes.size.array as Float32Array
        const colors = this.surfaceGeometry.attributes.color.array as Float32Array

        // Use the particle's ORIGINAL spawn size (never modified)
        const baseSize = this.surfaceBaseSizes[i]
        const distanceRatio = (distance / this.currentRadius) / 28.0 // 0-1 over max distance

        // Fade in size growth with expansion (0 at start -> 19.0 at full expansion = 20x size)
        const currentExpansionProgress = Math.min(this.expansionTime / this.expansionDuration, 1.0)
        const sizeGrowth = 19.0 * currentExpansionProgress

        sizes[i] = baseSize * (1.0 + distanceRatio * sizeGrowth)

        // Fade color with distance (bright near star, very dark far away)
        const brightness = 1.0 - distanceRatio * 0.9 // Fade to 10% at max distance (more dramatic)
        colors[i3] = 1.0 * brightness      // R
        colors[i3 + 1] = 0.6 * brightness  // G (orange)
        colors[i3 + 2] = 0.2 * brightness  // B
      }

      // Reset particles that go too far (continuous stellar wind) - let them travel MUCH further for fuzzy boundary
      // DON'T reset during supernova - let them fly away forever
      const maxDistance = this.isRedGiant ? 28 : 15 // Red giants: wisps travel much further
      if (!this.isSupernova && distance > this.currentRadius * maxDistance) { // Scale with current star size
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        // Spawn at current star surface
        const spawnRadius = this.currentRadius
        positions[i3] = spawnRadius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = spawnRadius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = spawnRadius * Math.cos(phi)

        // Red giants have much slower, gentle stellar wind (visible wisps near surface)
        const baseSpeed = this.isRedGiant ? 0.01 : 0.03
        const speedVariation = this.isRedGiant ? 0.02 : 0.08
        const speed = baseSpeed + Math.random() * speedVariation

        velocities[i3] = (positions[i3] / spawnRadius) * speed
        velocities[i3 + 1] = (positions[i3 + 1] / spawnRadius) * speed
        velocities[i3 + 2] = (positions[i3 + 2] / spawnRadius) * speed
      }
    }

    this.surfaceGeometry.attributes.position.needsUpdate = true
    // Update size for both main sequence (flickering) and red giants (growth)
    if (!this.isSupernova) {
      this.surfaceGeometry.attributes.size.needsUpdate = true
    }
    // Update color for red giants only (color fading with distance)
    if (this.isRedGiant && !this.isSupernova) {
      this.surfaceGeometry.attributes.color.needsUpdate = true
    }

    // Update Layer 2: Streak particles (main sequence only)
    if (!this.isRedGiant && !this.isSupernova) {
      const streakPositions = this.streakGeometry.attributes.position.array as Float32Array
      const streakVelocities = this.streakVelocities

      for (let i = 0; i < this.streakCount; i++) {
        const i3 = i * 3

        // Update positions (faster movement)
        streakPositions[i3] += streakVelocities[i3]
        streakPositions[i3 + 1] += streakVelocities[i3 + 1]
        streakPositions[i3 + 2] += streakVelocities[i3 + 2]

        // Calculate distance from center
        const distance = Math.sqrt(
          streakPositions[i3] ** 2 +
          streakPositions[i3 + 1] ** 2 +
          streakPositions[i3 + 2] ** 2
        )

        // Reset particles that go too far (shorter travel than base particles)
        if (distance > this.currentRadius * 10) { // Streaks don't travel as far
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)

          const spawnRadius = this.currentRadius
          streakPositions[i3] = spawnRadius * Math.sin(phi) * Math.cos(theta)
          streakPositions[i3 + 1] = spawnRadius * Math.sin(phi) * Math.sin(theta)
          streakPositions[i3 + 2] = spawnRadius * Math.cos(phi)

          const speed = 0.08 + Math.random() * 0.12
          streakVelocities[i3] = (streakPositions[i3] / spawnRadius) * speed
          streakVelocities[i3 + 1] = (streakPositions[i3 + 1] / spawnRadius) * speed
          streakVelocities[i3 + 2] = (streakPositions[i3 + 2] / spawnRadius) * speed
        }
      }

      this.streakGeometry.attributes.position.needsUpdate = true
    }

    // Update Layer 3: Hero beams (main sequence only)
    if (!this.isRedGiant && !this.isSupernova) {
      for (let i = 0; i < this.beamCount; i++) {
        // Update pulse phase
        this.beamPulsePhases[i] += deltaTime * 0.5 // Slow pulsing

        // Occasional pulses (sine wave with random phase)
        const pulseBrightness = Math.sin(this.beamPulsePhases[i]) * 0.5 + 0.5 // 0-1

        // Only show beams occasionally (when pulse > 0.7)
        let targetOpacity = 0.0
        if (pulseBrightness > 0.7) {
          targetOpacity = (pulseBrightness - 0.7) / 0.3 * 0.4 // 0-0.4 max opacity (subtle)
        }

        // Smooth opacity transitions
        this.beamOpacities[i] += (targetOpacity - this.beamOpacities[i]) * deltaTime * 3.0

        // Update material uniform
        const material = this.beamMeshes[i].material as THREE.ShaderMaterial
        material.uniforms.opacity.value = this.beamOpacities[i]
      }
    }

    // Fade out streak particles and hero beams during red giant/supernova
    if (this.isRedGiant || this.isSupernova) {
      // Fade out streaks
      const streakMat = this.streakMaterial
      streakMat.uniforms.opacity.value = Math.max(0, streakMat.uniforms.opacity.value - deltaTime * 2.0)

      // Fade out beams
      for (let i = 0; i < this.beamCount; i++) {
        this.beamOpacities[i] = Math.max(0, this.beamOpacities[i] - deltaTime * 2.0)
        const material = this.beamMeshes[i].material as THREE.ShaderMaterial
        material.uniforms.opacity.value = this.beamOpacities[i]
      }
    } else {
      // Ensure streak opacity is full during main sequence
      this.streakMaterial.uniforms.opacity.value = 1.0
    }
  }

  public startRedGiantExpansion(): void {
    if (this.isRedGiant) return // Already expanding

    this.isRedGiant = true
    this.expansionTime = 0
    this.expansionStartRadius = this.currentRadius

    console.log('Red giant expansion initiated!')
  }

  public isInRedGiantPhase(): boolean {
    return this.isRedGiant
  }

  public getExpansionProgress(): number {
    if (!this.isRedGiant) return 0
    return Math.min(this.expansionTime / this.expansionDuration, 1.0)
  }

  public startCollapse(): void {
    if (this.isCollapsing) return // Already collapsing

    this.isCollapsing = true
    this.collapseTime = 0
    this.collapseStartScale = this.star.scale.x // Capture current scale
    console.log(`[COLLAPSE] Core collapse initiated! Starting scale: ${this.collapseStartScale.toFixed(2)}`)
  }

  public startSupernova(): void {
    if (this.isSupernova) return // Already exploding

    this.isSupernova = true
    this.supernovaTime = 0

    // Trigger core collapse simultaneously (physically accurate)
    this.startCollapse()

    // Hide red giant volumetric layers (set opacity AND visibility to prevent rendering interference)
    const innerMaterial = this.redGiantInnerLayer.material as THREE.MeshBasicMaterial
    const midMaterial = this.redGiantMidLayer.material as THREE.MeshBasicMaterial
    const outerMaterial = this.redGiantOuterLayer.material as THREE.MeshBasicMaterial
    innerMaterial.opacity = 0
    midMaterial.opacity = 0
    outerMaterial.opacity = 0
    this.redGiantInnerLayer.visible = false
    this.redGiantMidLayer.visible = false
    this.redGiantOuterLayer.visible = false
    console.log('SUPERNOVA!')

    // Create dramatic scene-filling flash
    this.supernovaFlash = new SupernovaFlash(this.scene)

    // Enable transparency on star material so opacity changes work
    const material = this.star.material as THREE.MeshStandardMaterial
    material.transparent = true

    // Blast all stellar wind particles outward at high speed
    for (let i = 0; i < this.surfaceCount; i++) {
      const i3 = i * 3
      const x = this.surfacePositions[i3]
      const y = this.surfacePositions[i3 + 1]
      const z = this.surfacePositions[i3 + 2]

      const distance = Math.sqrt(x * x + y * y + z * z) || 1
      const explosionSpeed = 0.5 + Math.random() * 0.3 // Very fast

      // Blast outward from center
      this.surfaceVelocities[i3] = (x / distance) * explosionSpeed
      this.surfaceVelocities[i3 + 1] = (y / distance) * explosionSpeed
      this.surfaceVelocities[i3 + 2] = (z / distance) * explosionSpeed
    }
  }

  public isInSupernovaPhase(): boolean {
    return this.isSupernova
  }

  public getCameraShakeIntensity(): number {
    return this.supernovaFlash ? this.supernovaFlash.getShakeIntensity() : 0
  }

  public dispose(): void {
    // Remove all meshes from scene
    this.scene.remove(this.star)
    this.scene.remove(this.starLight)
    this.scene.remove(this.shockwave)
    this.scene.remove(this.surfaceTexture)
    this.scene.remove(this.corona)
    this.scene.remove(this.surfaceParticles)
    this.scene.remove(this.streakParticles)
    this.scene.remove(this.heroBeams)
    this.scene.remove(this.redGiantInnerLayer)
    this.scene.remove(this.redGiantMidLayer)
    this.scene.remove(this.redGiantOuterLayer)

    // Dispose geometries and materials
    this.star.geometry.dispose()
    ;(this.star.material as THREE.Material).dispose()
    this.shockwave.geometry.dispose()
    this.shockwaveMaterial.dispose()
    this.coronaGeometry.dispose()
    this.coronaMaterial.dispose()
    this.surfaceGeometry.dispose()
    this.surfaceMaterial.dispose()
    this.streakGeometry.dispose()
    this.streakMaterial.dispose()
    this.surfaceTextureGeometry.dispose()
    this.surfaceTextureMaterial.dispose()
    this.redGiantInnerLayer.geometry.dispose()
    ;(this.redGiantInnerLayer.material as THREE.Material).dispose()
    this.redGiantMidLayer.geometry.dispose()
    ;(this.redGiantMidLayer.material as THREE.Material).dispose()
    this.redGiantOuterLayer.geometry.dispose()
    ;(this.redGiantOuterLayer.material as THREE.Material).dispose()

    // Dispose hero beams
    for (const beam of this.beamMeshes) {
      beam.geometry.dispose()
      ;(beam.material as THREE.Material).dispose()
    }

    // Dispose supernova flash if it exists
    if (this.supernovaFlash) {
      this.supernovaFlash.dispose()
      this.supernovaFlash = null
    }
  }

  /**
   * Debug snapshot for testing - captures current state of stellar wind particles
   * Used by automated tests to verify visual enhancements
   */
  public getDebugSnapshot() {
    const sizes = Array.from(this.surfaceGeometry.attributes.size.array as Float32Array)
    const colors = Array.from(this.surfaceGeometry.attributes.color.array as Float32Array)
    const positions = Array.from(this.surfaceGeometry.attributes.position.array as Float32Array)

    // Calculate color averages
    const colorValues = { r: [] as number[], g: [] as number[], b: [] as number[] }
    for (let i = 0; i < this.surfaceCount; i++) {
      colorValues.r.push(colors[i * 3])
      colorValues.g.push(colors[i * 3 + 1])
      colorValues.b.push(colors[i * 3 + 2])
    }

    const avgR = colorValues.r.reduce((a, b) => a + b, 0) / this.surfaceCount
    const avgG = colorValues.g.reduce((a, b) => a + b, 0) / this.surfaceCount
    const avgB = colorValues.b.reduce((a, b) => a + b, 0) / this.surfaceCount

    return {
      particleCount: this.surfaceCount,
      colors: {
        sample: colors.slice(0, 9), // First 3 particles RGB
        average: { r: avgR, g: avgG, b: avgB },
        first: { r: colors[0], g: colors[1], b: colors[2] }
      },
      sizes: {
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        average: sizes.reduce((a, b) => a + b, 0) / sizes.length,
        sample: sizes.slice(0, 10) // First 10 particles
      },
      positions: {
        sample: positions.slice(0, 9) // First 3 particles XYZ
      },
      shader: {
        hasStreakCode: this.surfaceMaterial.fragmentShader.includes('coord.x * 0.3'),
        hasBrightnessBoost: this.surfaceMaterial.fragmentShader.includes('vColor * 1.5'),
        fragmentShaderSnippet: this.surfaceMaterial.fragmentShader.slice(0, 200)
      },
      state: {
        isRedGiant: this.isRedGiant,
        isSupernova: this.isSupernova,
        currentRadius: this.currentRadius,
        time: this.time
      }
    }
  }
}
