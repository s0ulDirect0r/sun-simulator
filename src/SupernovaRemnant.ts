import * as THREE from 'three'

export class SupernovaRemnant {
  private scene: THREE.Scene
  public shells: THREE.Points[] = [] // Public for debug toggles
  private shellGeometries: THREE.BufferGeometry[] = []
  private shellMaterials: THREE.PointsMaterial[] = []

  private particleCount: number = 8000
  private time: number = 0
  private expansionSpeed: number = 0.15

  // Multiple shell layers for depth
  private shellCount: number = 3

  // Accretion mode properties
  private isBeingAccreted: boolean = false
  private blackHolePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private accretionStrength: number = 0
  private eventHorizonRadius: number = 5.0

  // Particle consumption tracking
  private consumedParticles: Set<number> = new Set()
  private onParticleConsumed?: (mass: number) => void

  constructor(scene: THREE.Scene, initialRadius: number = 25) {
    this.scene = scene

    // Create multiple expanding shells with different colors
    for (let shellIndex = 0; shellIndex < this.shellCount; shellIndex++) {
      this.createShell(shellIndex, initialRadius)
    }
  }

  private createShell(shellIndex: number, initialRadius: number): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.particleCount * 3)
    const velocities = new Float32Array(this.particleCount * 3)
    const colors = new Float32Array(this.particleCount * 3)
    const sizes = new Float32Array(this.particleCount)

    // Different shell colors for visual variety
    const shellColors = [
      { r: 1.0, g: 0.3, b: 0.2 }, // Red (hydrogen)
      { r: 0.2, g: 0.8, b: 1.0 }, // Blue (oxygen)
      { r: 1.0, g: 0.7, b: 0.2 }, // Yellow (sulfur)
    ]
    const baseColor = shellColors[shellIndex % shellColors.length]

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // Random direction on sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const dirX = Math.sin(phi) * Math.cos(theta)
      const dirY = Math.sin(phi) * Math.sin(theta)
      const dirZ = Math.cos(phi)

      // Start at initial radius with some variation
      const startRadius = initialRadius * (0.9 + Math.random() * 0.3)
      positions[i3] = dirX * startRadius
      positions[i3 + 1] = dirY * startRadius
      positions[i3 + 2] = dirZ * startRadius

      // Velocity - expanding outward with variation
      const speed = this.expansionSpeed * (0.7 + Math.random() * 0.6) * (1 + shellIndex * 0.3)
      velocities[i3] = dirX * speed
      velocities[i3 + 1] = dirY * speed
      velocities[i3 + 2] = dirZ * speed

      // Color with variation
      const colorVariation = 0.7 + Math.random() * 0.3
      colors[i3] = baseColor.r * colorVariation
      colors[i3 + 1] = baseColor.g * colorVariation
      colors[i3 + 2] = baseColor.b * colorVariation

      // Size variation
      sizes[i] = 0.3 + Math.random() * 0.5
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Store velocities for animation
    ;(geometry as any).velocities = velocities

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    const shell = new THREE.Points(geometry, material)

    this.shells.push(shell)
    this.shellGeometries.push(geometry)
    this.shellMaterials.push(material)
    this.scene.add(shell)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Update each shell
    this.shells.forEach((shell, shellIndex) => {
      const geometry = this.shellGeometries[shellIndex]
      const material = this.shellMaterials[shellIndex]
      const positions = geometry.attributes.position.array as Float32Array
      const velocities = (geometry as any).velocities as Float32Array

      // Update positions
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3

        // Move particles outward
        positions[i3] += velocities[i3]
        positions[i3 + 1] += velocities[i3 + 1]
        positions[i3 + 2] += velocities[i3 + 2]

        // Decelerate slightly (energy loss)
        velocities[i3] *= 0.998
        velocities[i3 + 1] *= 0.998
        velocities[i3 + 2] *= 0.998

        // Add turbulence
        positions[i3] += (Math.random() - 0.5) * 0.05
        positions[i3 + 1] += (Math.random() - 0.5) * 0.05
        positions[i3 + 2] += (Math.random() - 0.5) * 0.05

        // Apply gravitational attraction if accretion mode is enabled
        if (this.isBeingAccreted) {
          // Calculate vector to black hole
          const dx = this.blackHolePosition.x - positions[i3]
          const dy = this.blackHolePosition.y - positions[i3 + 1]
          const dz = this.blackHolePosition.z - positions[i3 + 2]
          const distanceSquared = dx * dx + dy * dy + dz * dz
          const distance = Math.sqrt(distanceSquared)

          // Check if particle reached event horizon (consumed by black hole)
          const particleIndex = shellIndex * this.particleCount + i
          if (distance < this.eventHorizonRadius && !this.consumedParticles.has(particleIndex)) {
            this.consumedParticles.add(particleIndex)

            // Notify black hole of mass consumption
            if (this.onParticleConsumed) {
              this.onParticleConsumed(0.0001) // Each particle = 0.0001 mass units
            }

            // Make particle invisible (move far away)
            positions[i3] = 10000
            positions[i3 + 1] = 10000
            positions[i3 + 2] = 10000

            // Zero out velocity
            velocities[i3] = 0
            velocities[i3 + 1] = 0
            velocities[i3 + 2] = 0
          }

          // Only apply gravity within accretion radius and if not consumed
          if (distance < 100 && distance > 0.1 && !this.consumedParticles.has(particleIndex)) {
            // Gravitational acceleration (simplified inverse-square law)
            const acceleration = this.accretionStrength / distanceSquared

            // Normalize radial direction
            const radialX = dx / distance
            const radialY = dy / distance
            const radialZ = dz / distance

            // Apply radial force (toward black hole)
            const ax = radialX * acceleration
            const ay = radialY * acceleration
            const az = radialZ * acceleration

            velocities[i3] += ax
            velocities[i3 + 1] += ay
            velocities[i3 + 2] += az

            // Add tangential velocity for spiral motion (angular momentum)
            // Cross product: tangent = radial × up(0,1,0)
            const tangentX = radialY * 0 - radialZ * 1  // = -radialZ
            const tangentY = radialZ * 0 - radialX * 0  // = 0
            const tangentZ = radialX * 1 - radialY * 0  // = radialX

            // Normalize tangent vector
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ)

            if (tangentLength > 0.001) {
              const txNorm = tangentX / tangentLength
              const tyNorm = tangentY / tangentLength
              const tzNorm = tangentZ / tangentLength

              // Orbital velocity (Keplerian: v ∝ sqrt(1/r))
              // Scale by 0.5 for balance between spiral and infall
              const orbitalSpeed = Math.sqrt(this.accretionStrength / distance) * 0.5

              velocities[i3] += txNorm * orbitalSpeed
              velocities[i3 + 1] += tyNorm * orbitalSpeed
              velocities[i3 + 2] += tzNorm * orbitalSpeed
            }
          }
        }
      }

      geometry.attributes.position.needsUpdate = true

      // Fade out over time
      const fadeStart = 8.0 // Start fading after 8 seconds
      if (this.time > fadeStart) {
        const fadeProgress = (this.time - fadeStart) / 12.0 // Fade over 12 seconds
        material.opacity = Math.max(0.7 * (1 - fadeProgress), 0)
      }

      // Slow rotation for visual effect
      shell.rotation.y += deltaTime * 0.05
      shell.rotation.x += deltaTime * 0.02
    })
  }

  public enableAccretion(blackHolePosition: THREE.Vector3, strength: number, horizonRadius: number): void {
    this.isBeingAccreted = true
    this.blackHolePosition.copy(blackHolePosition)
    this.accretionStrength = strength
    this.eventHorizonRadius = horizonRadius
    console.log(`Accretion enabled: strength=${strength}, horizon radius=${horizonRadius}`)
  }

  public setConsumptionCallback(callback: (mass: number) => void): void {
    this.onParticleConsumed = callback
  }

  public updateEventHorizonRadius(newRadius: number): void {
    this.eventHorizonRadius = newRadius
  }

  public getActiveParticleCount(): number {
    // Count non-consumed particles across all shells
    return this.particleCount * this.shellCount - this.consumedParticles.size
  }

  public dispose(): void {
    this.shells.forEach((shell) => {
      this.scene.remove(shell)
    })

    this.shellGeometries.forEach((geometry) => {
      geometry.dispose()
    })

    this.shellMaterials.forEach((material) => {
      material.dispose()
    })
  }
}
