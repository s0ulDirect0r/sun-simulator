import * as THREE from 'three'

export class Nebula {
  private particles: THREE.Points
  private particleCount: number = 5000
  private positions: Float32Array
  private velocities: Float32Array
  private colors: Float32Array
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private time: number = 0
  private collapseSpeed: number = 0.02
  private protostar!: THREE.Mesh
  private protostarLight!: THREE.PointLight
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.particleCount = 5000

    // Initialize geometry
    this.geometry = new THREE.BufferGeometry()

    // Create position, velocity, and color arrays
    this.positions = new Float32Array(this.particleCount * 3)
    this.velocities = new Float32Array(this.particleCount * 3)
    this.colors = new Float32Array(this.particleCount * 3)

    // Initialize particles in a spherical cloud
    this.initializeParticles()

    // Set up buffer attributes
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    // Create particle material with vertex colors
    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // Create particle system
    this.particles = new THREE.Points(this.geometry, this.material)
    scene.add(this.particles)

    // Create protostar core
    this.createProtostar()
  }

  private createProtostar(): void {
    // Create small glowing sphere at center
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 2,
      roughness: 0.2,
      metalness: 0.1
    })

    this.protostar = new THREE.Mesh(geometry, material)
    this.scene.add(this.protostar)

    // Add dedicated light for protostar glow
    this.protostarLight = new THREE.PointLight(0xff6600, 2, 50)
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

      // Initialize velocities (slight random motion)
      this.velocities[i3] = (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02

      // Set colors (bluish-purple nebula with some variation)
      const colorVariation = Math.random() * 0.3
      this.colors[i3] = 0.3 + colorVariation     // Red
      this.colors[i3 + 1] = 0.4 + colorVariation // Green
      this.colors[i3 + 2] = 0.8 + colorVariation // Blue (dominant)
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    const positions = this.geometry.attributes.position.array as Float32Array
    const velocities = this.velocities

    // Update each particle
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // Get current position
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]

      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y + z * z)

      // Gravitational collapse - pull particles toward center
      if (distance > 0.1) {
        const force = this.collapseSpeed / (distance * distance)

        velocities[i3] -= (x / distance) * force
        velocities[i3 + 1] -= (y / distance) * force
        velocities[i3 + 2] -= (z / distance) * force
      }

      // Apply damping to simulate drag
      velocities[i3] *= 0.99
      velocities[i3 + 1] *= 0.99
      velocities[i3 + 2] *= 0.99

      // Add slight swirl for accretion disk formation
      const swirl = 0.001
      const tempVx = velocities[i3]
      velocities[i3] -= y * swirl
      velocities[i3 + 1] += tempVx * swirl

      // Update positions based on velocities
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
    }

    // Mark positions as needing update
    this.geometry.attributes.position.needsUpdate = true

    // Rotate particles slowly for visual interest
    this.particles.rotation.y += 0.0002

    // Update protostar as nebula collapses
    const avgRadius = this.getAverageRadius()
    const collapseProgress = Math.max(0, 1 - avgRadius / 40)

    // Grow protostar and increase its glow as nebula collapses
    const targetSize = 0.5 + collapseProgress * 4
    this.protostar.scale.setScalar(targetSize)

    // Increase light intensity as collapse progresses
    this.protostarLight.intensity = 2 + collapseProgress * 8

    // Pulse effect for protostar
    const pulse = Math.sin(this.time * 2) * 0.1 + 1
    this.protostar.scale.multiplyScalar(pulse)
  }

  public getAverageRadius(): number {
    const positions = this.geometry.attributes.position.array as Float32Array
    let totalDistance = 0

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]
      totalDistance += Math.sqrt(x * x + y * y + z * z)
    }

    return totalDistance / this.particleCount
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.protostar.geometry.dispose()
    ;(this.protostar.material as THREE.Material).dispose()
  }
}
