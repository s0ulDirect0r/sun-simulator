import * as THREE from 'three'
import { SupernovaFlash } from './SupernovaFlash'

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

  // Surface texture particles for mottled appearance
  private surfaceTexture!: THREE.Points
  private surfaceTextureGeometry!: THREE.BufferGeometry
  private surfaceTextureMaterial!: THREE.PointsMaterial
  private surfaceTextureCount: number = 2000
  private surfaceTexturePositions!: Float32Array
  private surfaceTextureBasePositions!: Float32Array // Store base positions for convection movement

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
  private currentOpacity: number = 1.0

  // Red giant expansion state
  private isRedGiant: boolean = false
  private redGiantRadius: number = 25.0 // Massive red giant size
  private expansionDuration: number = 8.0 // 8 seconds to expand
  private expansionTime: number = 0
  private expansionStartRadius: number = 4.0
  private irregularPulseOffset: number = 0 // Random variation in pulsing

  // Supernova state
  private isSupernova: boolean = false
  private supernovaTime: number = 0
  private supernovaDuration: number = 6.0 // 6 seconds for explosion
  private shockwave!: THREE.Mesh
  private shockwaveMaterial!: THREE.MeshBasicMaterial
  private supernovaFlash: SupernovaFlash | null = null

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
    }

    this.surfaceTextureGeometry.setAttribute('position', new THREE.BufferAttribute(this.surfaceTexturePositions, 3))

    // Surface texture material - darker spots initially invisible
    this.surfaceTextureMaterial = new THREE.PointsMaterial({
      size: 1.2,
      color: 0x882200, // Dark red-brown for convection cells
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.NormalBlending, // Not additive - want darker spots
      depthWrite: false
    })

    this.surfaceTexture = new THREE.Points(this.surfaceTextureGeometry, this.surfaceTextureMaterial)
    this.scene.add(this.surfaceTexture)
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
      opacity: 0.5, // Subtle glow
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

      // Red giants are cooler but larger, so slightly less emissive intensity
      material.emissiveIntensity = THREE.MathUtils.lerp(3, 2, expansionProgress)

      // Surface opacity variation - make red giant more diffuse/transparent
      material.transparent = true
      material.opacity = THREE.MathUtils.lerp(1.0, 0.85, expansionProgress)
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

    // Scale corona with star expansion for red giants
    if (this.isRedGiant) {
      const coronaScale = this.currentRadius / this.starRadius
      this.corona.scale.setScalar(coronaScale)

      // Make corona more visible for red giants
      this.coronaMaterial.opacity = THREE.MathUtils.lerp(0.5, 0.7, expansionProgress)

      // Animate surface texture particles - make them breathe and move with convection
      this.surfaceTextureMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.4, expansionProgress)

      // Update each surface texture particle position for convection movement
      const texturePositions = this.surfaceTextureGeometry.attributes.position.array as Float32Array
      const scaleFactor = (this.currentRadius / this.starRadius) * pulse // Breathe with the star

      for (let i = 0; i < this.surfaceTextureCount; i++) {
        const i3 = i * 3

        // Get base position
        const baseX = this.surfaceTextureBasePositions[i3]
        const baseY = this.surfaceTextureBasePositions[i3 + 1]
        const baseZ = this.surfaceTextureBasePositions[i3 + 2]

        // Add slow convection drift using multiple sine waves
        const driftX = Math.sin(this.time * 0.1 + i * 0.5) * 0.3
        const driftY = Math.cos(this.time * 0.12 + i * 0.7) * 0.3
        const driftZ = Math.sin(this.time * 0.15 + i * 0.3) * 0.3

        // Apply scale and drift
        texturePositions[i3] = (baseX + driftX) * scaleFactor
        texturePositions[i3 + 1] = (baseY + driftY) * scaleFactor
        texturePositions[i3 + 2] = (baseZ + driftZ) * scaleFactor
      }

      this.surfaceTextureGeometry.attributes.position.needsUpdate = true

      // Also rotate slowly for additional movement
      this.surfaceTexture.rotation.y += 0.0002
      this.surfaceTexture.rotation.x += 0.0001
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

  public startSupernova(): void {
    if (this.isSupernova) return // Already exploding

    this.isSupernova = true
    this.supernovaTime = 0
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

  public dispose(): void {
    this.star.geometry.dispose()
    ;(this.star.material as THREE.Material).dispose()
    this.coronaGeometry.dispose()
    this.coronaMaterial.dispose()
    this.surfaceGeometry.dispose()
    this.surfaceMaterial.dispose()
    this.surfaceTextureGeometry.dispose()
    this.surfaceTextureMaterial.dispose()
  }
}
