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

  // Surface texture particles for mottled appearance
  private surfaceTexture!: THREE.Points
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

  // Surface activity
  private surfaceParticles!: THREE.Points
  private surfaceGeometry!: THREE.BufferGeometry
  private surfaceMaterial!: THREE.PointsMaterial
  private surfaceCount: number = 900 // Balanced stellar wind
  private surfacePositions!: Float32Array
  private surfaceVelocities!: Float32Array

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
    }

    this.surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(this.surfacePositions, 3))

    // Surface activity material - orange-yellow stellar wind
    this.surfaceMaterial = new THREE.PointsMaterial({
      size: 0.4, // Smaller particles
      color: 0xff9922, // Keep original orange-yellow
      transparent: true,
      opacity: 1.0, // Full brightness
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.surfaceParticles = new THREE.Points(this.surfaceGeometry, this.surfaceMaterial)
    this.scene.add(this.surfaceParticles)
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
      if (supernovaProgress < 0.1) {
        this.surfaceMaterial.color.set(0xffffff) // Pure white during flash
        this.surfaceMaterial.opacity = 1.0
        this.surfaceMaterial.size = 0.8 // Bigger particles during flash
      } else {
        this.surfaceMaterial.color.set(0xaaccff) // Blue after flash
        this.surfaceMaterial.opacity = THREE.MathUtils.lerp(1.0, 0.3, (supernovaProgress - 0.1) / 0.9)
        this.surfaceMaterial.size = 0.4 // Back to normal
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

    // Red giants have slower, more chaotic stellar wind
    const velocityScale = this.isRedGiant ? 0.7 : 1.0 // Slower for red giants

    for (let i = 0; i < this.surfaceCount; i++) {
      const i3 = i * 3

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

      // Reset particles that go too far (continuous stellar wind) - let them travel MUCH further
      // DON'T reset during supernova - let them fly away forever
      if (!this.isSupernova && distance > this.currentRadius * 15) { // Scale with current star size
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        // Spawn at current star surface
        const spawnRadius = this.currentRadius
        positions[i3] = spawnRadius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = spawnRadius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = spawnRadius * Math.cos(phi)

        // Red giants have slower but more abundant mass loss
        const baseSpeed = this.isRedGiant ? 0.02 : 0.03
        const speedVariation = this.isRedGiant ? 0.05 : 0.08
        const speed = baseSpeed + Math.random() * speedVariation

        velocities[i3] = (positions[i3] / spawnRadius) * speed
        velocities[i3 + 1] = (positions[i3 + 1] / spawnRadius) * speed
        velocities[i3 + 2] = (positions[i3 + 2] / spawnRadius) * speed
      }
    }

    // Update stellar wind particle color for red giants (unless supernova - handled above)
    if (this.isRedGiant && !this.isSupernova) {
      const orangeColor = new THREE.Color(0xff9922)
      const redColor = new THREE.Color(0xff4422)
      const blendedColor = new THREE.Color().lerpColors(orangeColor, redColor, expansionProgress * 0.7)
      this.surfaceMaterial.color.copy(blendedColor)
    }

    this.surfaceGeometry.attributes.position.needsUpdate = true
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
    this.surfaceTextureGeometry.dispose()
    this.surfaceTextureMaterial.dispose()
    this.redGiantInnerLayer.geometry.dispose()
    ;(this.redGiantInnerLayer.material as THREE.Material).dispose()
    this.redGiantMidLayer.geometry.dispose()
    ;(this.redGiantMidLayer.material as THREE.Material).dispose()
    this.redGiantOuterLayer.geometry.dispose()
    ;(this.redGiantOuterLayer.material as THREE.Material).dispose()

    // Dispose supernova flash if it exists
    if (this.supernovaFlash) {
      this.supernovaFlash.dispose()
      this.supernovaFlash = null
    }
  }
}
