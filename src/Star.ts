import * as THREE from 'three'

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

    // Smooth contraction from protostar size to main sequence size
    if (this.contractionTime < this.contractionDuration) {
      this.contractionTime += deltaTime
      const contractionProgress = Math.min(this.contractionTime / this.contractionDuration, 1.0)
      // Use easeOutCubic for smooth deceleration
      const eased = 1 - Math.pow(1 - contractionProgress, 3)
      // Contract from initial size (whatever protostar was) to final main sequence size
      this.currentRadius = THREE.MathUtils.lerp(this.initialRadius, this.starRadius, eased)
    } else {
      this.currentRadius = this.starRadius
    }

    // Pulse effect for star (subtle breathing) - only after fade in
    const pulse = Math.sin(this.time * 0.5) * 0.02 + 1
    const targetScale = (this.currentRadius / this.starRadius) * pulse
    this.star.scale.setScalar(targetScale)

    // Pulsing light intensity
    const lightPulse = Math.sin(this.time * 0.7) * 2 + 15
    this.starLight.intensity = lightPulse

    // Rotate corona slowly
    this.corona.rotation.y += 0.0005
    this.corona.rotation.x += 0.0002

    // Update surface activity particles (solar flares)
    const positions = this.surfaceGeometry.attributes.position.array as Float32Array
    const velocities = this.surfaceVelocities

    for (let i = 0; i < this.surfaceCount; i++) {
      const i3 = i * 3

      // Update positions
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]

      // Calculate distance from center
      const distance = Math.sqrt(
        positions[i3] ** 2 +
        positions[i3 + 1] ** 2 +
        positions[i3 + 2] ** 2
      )

      // Reset particles that go too far (continuous stellar wind) - let them travel MUCH further
      if (distance > this.starRadius * 15) { // Particles travel 15x star radius before resetting
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        positions[i3] = this.starRadius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = this.starRadius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = this.starRadius * Math.cos(phi)

        const speed = 0.03 + Math.random() * 0.08 // Match initial speed
        velocities[i3] = positions[i3] / this.starRadius * speed
        velocities[i3 + 1] = positions[i3 + 1] / this.starRadius * speed
        velocities[i3 + 2] = positions[i3 + 2] / this.starRadius * speed
      }
    }

    this.surfaceGeometry.attributes.position.needsUpdate = true
  }

  public dispose(): void {
    this.star.geometry.dispose()
    ;(this.star.material as THREE.Material).dispose()
    this.coronaGeometry.dispose()
    this.coronaMaterial.dispose()
    this.surfaceGeometry.dispose()
    this.surfaceMaterial.dispose()
  }
}
