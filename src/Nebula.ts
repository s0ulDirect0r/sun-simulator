import * as THREE from 'three'

export class Nebula {
  private readonly particleCount = 20000

  private particles: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private colors: Float32Array
  private initialColors: Float32Array
  private stuck: Float32Array // 0 = free, 1 = stuck
  private stuckRadius: Float32Array // radius at which particle stuck
  private stuckTheta: Float32Array // angular position (theta)
  private stuckPhi: Float32Array // angular position (phi)
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial

  private time = 0
  private simulationSpeed = 0.035
  private collapseSpeed = 9.5 // Increased for dramatic visible streaming
  private swirlStrength = 0.001
  private diskPullStrength = 0.0016
  private turbulenceStrength = 0.00022
  private baseDrag = 0.992
  private softening = 1.2
  private maxVelocity = 2.5 // Increased to allow faster streaming
  private colorUpdateThreshold = 0.025

  private averageRadius = 0
  private collapseProgress = 0
  private initialAverageRadius = 0
  private targetAverageRadius = 6
  private lastColorMix = -1

  private readonly protostarGeometryRadius = 0.5 // Base radius of the sphere geometry
  private protostarBaseScale = 1.2
  private protostarMaxScale = 12.0 // Max size during accretion (puffy protostar)
  private protostarFinalScale = 9.6 // Final size after fusion ignition (contracts slightly)
  private captureRadiusMultiplier = 1.15 // How much bigger than protostar visual size
  private stuckParticleCount = 0

  // Multi-stage ignition thresholds
  private readonly preIgnitionThreshold = 0.85
  private readonly ignitionThreshold = 0.90
  private readonly stabilizationThreshold = 0.95
  private ignitionBurstScale = 1.0 // Temporary scale boost during ignition
  private ignitionBurstTriggered = false // One-time particle ejection event

  // Critical mass - star stops capturing particles to preserve nebula material
  private readonly criticalMassThreshold = 0.65
  private criticalMassReached = false

  private protostar!: THREE.Mesh
  private protostarLight!: THREE.PointLight
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.particleCount * 3)
    this.velocities = new Float32Array(this.particleCount * 3)
    this.colors = new Float32Array(this.particleCount * 3)
    this.initialColors = new Float32Array(this.particleCount * 3)
    this.stuck = new Float32Array(this.particleCount) // 0 = free
    this.stuckRadius = new Float32Array(this.particleCount)
    this.stuckTheta = new Float32Array(this.particleCount)
    this.stuckPhi = new Float32Array(this.particleCount)

    this.initializeParticles()

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    this.material = new THREE.PointsMaterial({
      size: 0.9, // Increased for better visibility
      vertexColors: true,
      transparent: true,
      opacity: 1.0, // Full opacity for more intense glow
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.particles)

    this.createProtostar()

    this.averageRadius = this.computeAverageRadius()
    this.initialAverageRadius = this.averageRadius
    this.collapseProgress = 0
  }

  private createProtostar(): void {
    const geometry = new THREE.SphereGeometry(0.5, 48, 48)
    const material = new THREE.MeshStandardMaterial({
      color: 0xff7033,
      emissive: 0xff3300,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.05
    })

    this.protostar = new THREE.Mesh(geometry, material)
    this.scene.add(this.protostar)

    this.protostarLight = new THREE.PointLight(0xff7033, 4, 60, 2)
    this.protostarLight.position.set(0, 0, 0)
    this.scene.add(this.protostarLight)
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // Create particles in a spherical distribution (nebula cloud)
      const radius = 30 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      // Spherical to cartesian coordinates
      this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.positions[i3 + 2] = radius * Math.cos(phi)

      this.velocities[i3] = (Math.random() - 0.5) * 0.003
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.003
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.003

      // Multi-color nebula regions like real nebulae (hydrogen, oxygen, sulfur emissions)
      const colorType = Math.random()
      let r: number, g: number, b: number

      if (colorType < 0.35) {
        // Blue region (oxygen emission) - ionized gas
        const variation = Math.random() * 0.3
        r = 0.3 + variation
        g = 0.6 + variation
        b = 1.0
      } else if (colorType < 0.6) {
        // Purple/magenta region (hydrogen-alpha)
        const variation = Math.random() * 0.3
        r = 0.8 + variation * 0.2
        g = 0.3 + variation
        b = 0.9 + variation * 0.1
      } else if (colorType < 0.8) {
        // Pink/red region (hydrogen)
        const variation = Math.random() * 0.3
        r = 1.0
        g = 0.4 + variation
        b = 0.6 + variation
      } else {
        // Orange/yellow region (sulfur, warm dust)
        const variation = Math.random() * 0.3
        r = 1.0
        g = 0.7 + variation * 0.3
        b = 0.3 + variation
      }

      this.colors[i3] = r
      this.colors[i3 + 1] = g
      this.colors[i3 + 2] = b

      this.initialColors[i3] = r
      this.initialColors[i3 + 1] = g
      this.initialColors[i3 + 2] = b
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Update protostar scale BEFORE processing particles so they can track it
    this.updateProtostarGlow(this.collapseProgress)

    const positions = this.geometry.getAttribute('position').array as Float32Array
    const velocities = this.velocities
    const colorsAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const colorsArray = colorsAttr.array as Float32Array

    const frameFactor = Math.min(deltaTime * 60 * this.simulationSpeed, 3)
    const swirl = this.swirlStrength * frameFactor
    const diskPull = this.diskPullStrength * frameFactor
    const turbulence = this.turbulenceStrength * frameFactor

    let totalDistance = 0
    let freeParticleDistance = 0
    let freeParticleCount = 0
    const alignmentStrength = THREE.MathUtils.lerp(0.04, 0.1, this.collapseProgress)

    // Use the actual protostar's current scale (includes pulsing)
    const currentProtostarScale = this.protostar.scale.x
    // Actual world-space radius = scale * geometry base radius
    const protostarRadius = currentProtostarScale * this.protostarGeometryRadius
    const captureRadius = protostarRadius * this.captureRadiusMultiplier

    // Check if star has reached critical mass - stop capturing more particles
    if (this.collapseProgress >= this.criticalMassThreshold && !this.criticalMassReached) {
      this.criticalMassReached = true
      // Star has reached critical mass - will continue to grow via scale but won't capture more particles
    }

    // Mark when fusion ignition occurs (for visual effects, no particle burst)
    if (this.collapseProgress >= this.ignitionThreshold && !this.ignitionBurstTriggered) {
      this.ignitionBurstTriggered = true
      // Fusion has ignited - visual changes handled in updateProtostarGlow()
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]

      const distance = Math.sqrt(x * x + y * y + z * z)

      // Handle stuck particles (value = 1.0) - position them on the protostar surface
      if (this.stuck[i] > 0.9) {
        const theta = this.stuckTheta[i]
        const phi = this.stuckPhi[i]
        // Stuck particles ride on the surface as the protostar grows
        const radius = protostarRadius * this.stuckRadius[i]

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = radius * Math.cos(phi)

        // Stuck particles glow with protostar color
        const glowColor = new THREE.Color(0xffa144)
        colorsArray[i3] = glowColor.r
        colorsArray[i3 + 1] = glowColor.g
        colorsArray[i3 + 2] = glowColor.b

        totalDistance += radius
        continue // Skip physics for stuck particles
      }

      // Check if free particle should stick (only if critical mass not yet reached)
      if (distance < captureRadius && this.stuck[i] < 0.5 && !this.criticalMassReached) {
        this.stuck[i] = 1
        // Store as normalized radius factor - right at the surface with slight variation
        this.stuckRadius[i] = 0.98 + Math.random() * 0.04

        // Convert current position to spherical coordinates
        if (distance > 0.001) {
          this.stuckTheta[i] = Math.atan2(y, x)
          this.stuckPhi[i] = Math.acos(THREE.MathUtils.clamp(z / distance, -1, 1))
        } else {
          // Random position if too close to center
          this.stuckTheta[i] = Math.random() * Math.PI * 2
          this.stuckPhi[i] = Math.acos(2 * Math.random() - 1)
        }

        this.stuckParticleCount++
        continue
      }

      // Regular physics for free particles
      freeParticleDistance += distance
      freeParticleCount++

      if (distance > 0.001) {
        const invDistance = 1 / distance
        const nx = x * invDistance
        const ny = y * invDistance
        const nz = z * invDistance

        // Apply physics multiplier during pre-ignition phase
        let physicsMultiplier = 1.0
        if (this.collapseProgress >= this.preIgnitionThreshold && this.collapseProgress < this.ignitionThreshold) {
          // Pre-ignition: increase gravitational pull (1.5x faster)
          physicsMultiplier = 1.5
        }

        const pull = (this.collapseSpeed * frameFactor * physicsMultiplier) / Math.pow(distance + this.softening, 2)

        velocities[i3] -= nx * pull
        velocities[i3 + 1] -= ny * pull
        velocities[i3 + 2] -= nz * pull

        const radialVelocity =
          velocities[i3] * nx + velocities[i3 + 1] * ny + velocities[i3 + 2] * nz

        const tangentialX = velocities[i3] - radialVelocity * nx
        const tangentialY = velocities[i3 + 1] - radialVelocity * ny
        const tangentialZ = velocities[i3 + 2] - radialVelocity * nz
        velocities[i3] -= tangentialX * alignmentStrength
        velocities[i3 + 1] -= tangentialY * alignmentStrength
        velocities[i3 + 2] -= tangentialZ * alignmentStrength

        if (radialVelocity > -0.02) {
          const inwardBias = THREE.MathUtils.lerp(0.4, 1.1, this.collapseProgress)
          const correction = (radialVelocity + 0.02) * inwardBias
          velocities[i3] -= nx * correction
          velocities[i3 + 1] -= ny * correction
          velocities[i3 + 2] -= nz * correction
        }
      }

      velocities[i3] *= this.baseDrag
      velocities[i3 + 1] *= this.baseDrag
      velocities[i3 + 2] *= this.baseDrag

      // Encourage accretion disk (orbit around Y axis, fall toward equatorial plane)
      velocities[i3] += -z * swirl
      velocities[i3 + 2] += x * swirl
      velocities[i3 + 1] -= y * diskPull * (0.3 + this.collapseProgress)

      // Gentle turbulence for swirling wisps
      velocities[i3] +=
        (Math.sin(this.time * 0.35 + i * 0.21) + Math.cos(this.time * 0.6 + i * 0.13)) *
        turbulence *
        0.5
      velocities[i3 + 1] += Math.sin(this.time * 0.27 + i * 0.37) * turbulence * 0.3
      velocities[i3 + 2] +=
        (Math.cos(this.time * 0.41 + i * 0.17) + Math.sin(this.time * 0.22 + i * 0.29)) *
        turbulence *
        0.5

      velocities[i3] = THREE.MathUtils.clamp(velocities[i3], -this.maxVelocity, this.maxVelocity)
      velocities[i3 + 1] = THREE.MathUtils.clamp(
        velocities[i3 + 1],
        -this.maxVelocity,
        this.maxVelocity
      )
      velocities[i3 + 2] = THREE.MathUtils.clamp(
        velocities[i3 + 2],
        -this.maxVelocity,
        this.maxVelocity
      )

      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]

      const newDistance = Math.sqrt(
        positions[i3] * positions[i3] +
          positions[i3 + 1] * positions[i3 + 1] +
          positions[i3 + 2] * positions[i3 + 2]
      )

      // Color gradient for particles approaching the protostar
      const approachThreshold = captureRadius * 1.5
      if (newDistance < approachThreshold) {
        const blend = THREE.MathUtils.clamp((approachThreshold - newDistance) / approachThreshold, 0, 1)
        const glowColor = new THREE.Color(0xffa144)

        colorsArray[i3] = THREE.MathUtils.lerp(colorsArray[i3], glowColor.r, blend * 0.45)
        colorsArray[i3 + 1] = THREE.MathUtils.lerp(colorsArray[i3 + 1], glowColor.g, blend * 0.45)
        colorsArray[i3 + 2] = THREE.MathUtils.lerp(colorsArray[i3 + 2], glowColor.b, blend * 0.45)
      }

      totalDistance += newDistance
    }

    this.geometry.attributes.position.needsUpdate = true
    colorsAttr.needsUpdate = true
    this.particles.rotation.y += 0.0002 * frameFactor

    // Calculate collapse progress based on free particles
    if (freeParticleCount > 0) {
      this.averageRadius = freeParticleDistance / freeParticleCount
    } else {
      // All particles stuck - collapse complete
      this.averageRadius = this.targetAverageRadius
    }

    const collapseSpan = Math.max(this.initialAverageRadius - this.targetAverageRadius, 1)
    this.collapseProgress = THREE.MathUtils.clamp(
      (this.initialAverageRadius - this.averageRadius) / collapseSpan,
      0,
      1
    )

    // Boost collapse progress based on stuck particle count for faster visual growth
    const stuckRatio = this.stuckParticleCount / this.particleCount
    this.collapseProgress = THREE.MathUtils.clamp(
      this.collapseProgress + stuckRatio * 0.3,
      0,
      1
    )

    this.material.size = THREE.MathUtils.lerp(0.9, 0.4, this.collapseProgress)
    this.material.opacity = THREE.MathUtils.lerp(1.0, 0.6, this.collapseProgress)

    this.updateColorGradient(this.collapseProgress)
    // Protostar is now updated at the START of the frame (before particle loop)
  }

  public getAverageRadius(): number {
    return this.averageRadius
  }

  public getCollapseProgress(): number {
    return this.collapseProgress
  }

  public getProtostarRadius(): number {
    // Return actual world-space radius of protostar
    return this.protostar.scale.x * this.protostarGeometryRadius
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.protostar.geometry.dispose()
    ;(this.protostar.material as THREE.Material).dispose()
  }

  private updateProtostarGlow(progress: number): void {
    // Calculate target scale based on stage
    // Pre-ignition: grows to max (6.0), Post-ignition: contracts to final (4.8)
    let targetScale: number
    if (progress < this.ignitionThreshold) {
      // Pre-ignition: grow from base to max
      targetScale = THREE.MathUtils.lerp(this.protostarBaseScale, this.protostarMaxScale, progress / this.ignitionThreshold)
    } else {
      // Post-ignition: contract from max to final over 90-95% range
      const contractionProgress = (progress - this.ignitionThreshold) / (this.stabilizationThreshold - this.ignitionThreshold)
      targetScale = THREE.MathUtils.lerp(this.protostarMaxScale, this.protostarFinalScale, Math.min(contractionProgress, 1.0))
    }

    // Determine ignition stage and adjust visual parameters
    let pulseFrequency = 2
    let pulseAmplitude = 0.1
    let emissiveBoost = 1.0
    let lightIntensityBoost = 1.0
    let scaleBoost = 1.0

    if (progress >= this.stabilizationThreshold) {
      // Stage 4: Main Sequence Stability (95-100%)
      const stageProgress = (progress - this.stabilizationThreshold) / (1 - this.stabilizationThreshold)
      pulseFrequency = THREE.MathUtils.lerp(1, 0.5, stageProgress) // Slow gentle breathing
      pulseAmplitude = THREE.MathUtils.lerp(0.05, 0.02, stageProgress) // Nearly stable
      emissiveBoost = 2.0 // Maintain bright fusion-powered glow
      lightIntensityBoost = THREE.MathUtils.lerp(2.2, 2.0, stageProgress) // Maintain high brightness

      scaleBoost = 1.0
    } else if (progress >= this.ignitionThreshold) {
      // Stage 3: Fusion Ignition & Contraction (90-95%)
      const stageProgress = (progress - this.ignitionThreshold) / (this.stabilizationThreshold - this.ignitionThreshold)
      pulseFrequency = THREE.MathUtils.lerp(4, 1, stageProgress) // Slowing down as it stabilizes
      pulseAmplitude = THREE.MathUtils.lerp(0.15, 0.05, stageProgress) // Reducing amplitude
      emissiveBoost = THREE.MathUtils.lerp(2.5, 2.0, stageProgress) // Dramatic brightness spike at start, then settle

      // Peak light intensity at ignition moment, then settle
      const peakPoint = 0.2 // Peak early (90-91%)
      if (stageProgress < peakPoint) {
        lightIntensityBoost = THREE.MathUtils.lerp(1.3, 3.5, stageProgress / peakPoint) // Dramatic flash
      } else {
        lightIntensityBoost = THREE.MathUtils.lerp(3.5, 2.2, (stageProgress - peakPoint) / (1 - peakPoint))
      }

      // No scale boost - contraction is handled in targetScale calculation above
      scaleBoost = 1.0
    } else if (progress >= this.preIgnitionThreshold) {
      // Stage 2: Pre-ignition Intensifies (85-90%)
      const stageProgress = (progress - this.preIgnitionThreshold) / (this.ignitionThreshold - this.preIgnitionThreshold)
      pulseFrequency = THREE.MathUtils.lerp(2, 4, stageProgress) // Accelerating pulse
      pulseAmplitude = THREE.MathUtils.lerp(0.1, 0.15, stageProgress) // Growing amplitude
      emissiveBoost = THREE.MathUtils.lerp(1.0, 1.2, stageProgress) // Building intensity
      lightIntensityBoost = THREE.MathUtils.lerp(1.0, 1.3, stageProgress)
    }
    // Stage 1: Normal (0-85%) uses default values

    // Apply scale with pulse and ignition burst
    const pulse = Math.sin(this.time * pulseFrequency) * pulseAmplitude + 1
    this.protostar.scale.setScalar(targetScale * scaleBoost * pulse)

    // Apply light intensity with boost
    const baseIntensity = THREE.MathUtils.lerp(3, 12, progress)
    this.protostarLight.intensity = baseIntensity * lightIntensityBoost

    // Expand light distance during ignition for wider bloom
    const baseDistance = THREE.MathUtils.lerp(60, 90, progress)
    const distanceBoost = lightIntensityBoost > 2.0 ? 1.3 : 1.0 // Wider at peak
    this.protostarLight.distance = baseDistance * distanceBoost

    // Apply emissive intensity with boost
    const protostarMaterial = this.protostar.material as THREE.MeshStandardMaterial
    const baseEmissive = THREE.MathUtils.lerp(2.2, 6.0, progress)
    protostarMaterial.emissiveIntensity = baseEmissive * emissiveBoost

    // Color transitions: orange protostar → yellow-white main sequence star
    let warmHue: number
    let saturation: number
    let lightness: number

    if (progress >= this.ignitionThreshold) {
      // Post-ignition (90-100%): Yellow-white main sequence star
      const timeSinceIgnition = progress - this.ignitionThreshold
      const ignitionProgress = timeSinceIgnition / (1.0 - this.ignitionThreshold)

      // Rapid shift to yellow-white at ignition, then stabilize
      warmHue = THREE.MathUtils.lerp(0.06, 0.14, Math.min(ignitionProgress * 2, 1.0)) // Bright yellow
      saturation = THREE.MathUtils.lerp(1.0, 0.75, Math.min(ignitionProgress * 1.5, 1.0)) // Slightly desaturated (white-hot)
      lightness = THREE.MathUtils.lerp(0.65, 0.82, Math.min(ignitionProgress, 1.0)) // Very bright
    } else if (progress >= this.preIgnitionThreshold) {
      // Pre-ignition (85-90%): Heating up, starting to shift
      const stageProgress = (progress - this.preIgnitionThreshold) / (this.ignitionThreshold - this.preIgnitionThreshold)
      warmHue = THREE.MathUtils.lerp(0.04, 0.06, stageProgress)
      saturation = 1.0
      lightness = THREE.MathUtils.lerp(0.6, 0.65, stageProgress)
    } else {
      // Early phases (0-85%): Orange protostar
      warmHue = THREE.MathUtils.lerp(0.04, 0.04, progress)
      saturation = 1.0
      lightness = 0.55 + progress * 0.05 + (emissiveBoost - 1.0) * 0.1
    }

    const warmColor = new THREE.Color().setHSL(warmHue, saturation, lightness)
    protostarMaterial.color.copy(warmColor)
    this.protostarLight.color.copy(warmColor)
  }

  private updateColorGradient(progress: number): void {
    if (Math.abs(progress - this.lastColorMix) < this.colorUpdateThreshold) {
      return
    }

    this.lastColorMix = progress

    const warmColor = new THREE.Color(0xff7b42)
    const colorsAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const colorsArray = colorsAttr.array as Float32Array

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      colorsArray[i3] = THREE.MathUtils.lerp(this.initialColors[i3], warmColor.r, progress)
      colorsArray[i3 + 1] = THREE.MathUtils.lerp(
        this.initialColors[i3 + 1],
        warmColor.g,
        progress
      )
      colorsArray[i3 + 2] = THREE.MathUtils.lerp(
        this.initialColors[i3 + 2],
        warmColor.b,
        progress
      )
    }

    colorsAttr.needsUpdate = true
  }

  private computeAverageRadius(): number {
    const positions = this.geometry.getAttribute('position').array as Float32Array
    let total = 0

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]
      total += Math.sqrt(x * x + y * y + z * z)
    }

    return total / this.particleCount
  }
}
