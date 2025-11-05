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
  private surfaceCount: number = 500
  private surfacePositions!: Float32Array
  private surfaceVelocities!: Float32Array

  private starRadius: number = 8

  constructor(scene: THREE.Scene) {
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

    // Create corona particles in a spherical shell around star
    for (let i = 0; i < this.coronaCount; i++) {
      const i3 = i * 3

      // Corona radius slightly larger than star
      const radius = this.starRadius * (1.2 + Math.random() * 0.3)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.coronaPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.coronaPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.coronaPositions[i3 + 2] = radius * Math.cos(phi)
    }

    this.coronaGeometry.setAttribute('position', new THREE.BufferAttribute(this.coronaPositions, 3))

    // Corona material - yellowish-white glow
    this.coronaMaterial = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xffffaa,
      transparent: true,
      opacity: 0.6,
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

      // Initial velocities pointing outward (solar flares)
      const speed = 0.02 + Math.random() * 0.05
      this.surfaceVelocities[i3] = this.surfacePositions[i3] / this.starRadius * speed
      this.surfaceVelocities[i3 + 1] = this.surfacePositions[i3 + 1] / this.starRadius * speed
      this.surfaceVelocities[i3 + 2] = this.surfacePositions[i3 + 2] / this.starRadius * speed
    }

    this.surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(this.surfacePositions, 3))

    // Surface activity material - bright orange-yellow
    this.surfaceMaterial = new THREE.PointsMaterial({
      size: 0.4,
      color: 0xff8800,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.surfaceParticles = new THREE.Points(this.surfaceGeometry, this.surfaceMaterial)
    this.scene.add(this.surfaceParticles)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Pulse effect for star (subtle breathing)
    const pulse = Math.sin(this.time * 0.5) * 0.02 + 1
    this.star.scale.setScalar(pulse)

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

      // Reset particles that go too far (continuous solar wind)
      if (distance > this.starRadius * 2.5) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        positions[i3] = this.starRadius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = this.starRadius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = this.starRadius * Math.cos(phi)

        const speed = 0.02 + Math.random() * 0.05
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
