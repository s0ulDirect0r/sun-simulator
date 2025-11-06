import * as THREE from 'three'

/**
 * AccretionSource creates sporadic chunks of matter that spiral into the black hole
 * Simulates turbulent accretion from various orbital positions
 */
export class AccretionSource {
  private scene: THREE.Scene
  public particles: THREE.Points // Public for debug toggles
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private particleCount: number = 1000 // Increased for visibility
  private spawnPosition: THREE.Vector3
  private spawnInterval: number = 0.5 // Much faster spawning
  private spawnTimer: number = 0
  private positions: Float32Array
  private velocities: Float32Array
  private lifetimes: Float32Array
  private blackHolePosition: THREE.Vector3
  private accretionStrength: number
  private eventHorizonRadius: number
  private debugMarker: THREE.Mesh // Debug visualization
  private onParticleConsumed?: (mass: number) => void
  private totalConsumed: number = 0 // Track total particles consumed

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    color: number,
    accretionStrength: number,
    eventHorizonRadius: number
  ) {
    this.scene = scene
    this.spawnPosition = position.clone()
    this.blackHolePosition = new THREE.Vector3(0, 0, 0)
    this.accretionStrength = accretionStrength
    this.eventHorizonRadius = eventHorizonRadius

    // Initialize particle buffers
    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.particleCount * 3)
    this.velocities = new Float32Array(this.particleCount * 3)
    this.lifetimes = new Float32Array(this.particleCount)

    // Set all particles as inactive initially (lifetime = 0)
    this.lifetimes.fill(0)
    this.positions.fill(10000) // Move inactive particles far away

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

    this.material = new THREE.PointsMaterial({
      size: 0.8, // Realistic particle size
      color: color, // Use actual color parameter (hot accreting matter)
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true, // Scale with distance for spatial depth
    })

    this.particles = new THREE.Points(this.geometry, this.material)
    this.particles.frustumCulled = false // Never cull, always render
    this.particles.renderOrder = 2 // Render after accretion disk but before jets
    this.scene.add(this.particles)

    // Create invisible debug marker (for disposal tracking only)
    const debugGeometry = new THREE.SphereGeometry(0.1, 4, 4)
    const debugMaterial = new THREE.MeshBasicMaterial({ visible: false })
    this.debugMarker = new THREE.Mesh(debugGeometry, debugMaterial)
    this.debugMarker.position.copy(this.spawnPosition)
  }

  public update(deltaTime: number): void {
    this.spawnTimer += deltaTime

    // Spawn new chunk when timer expires
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnChunk()
      this.spawnTimer = 0
      // Randomize next interval (0.3-1.5 seconds for frequent dramatic effect)
      this.spawnInterval = 0.3 + Math.random() * 1.2
    }

    // Update all active particles
    for (let i = 0; i < this.particleCount; i++) {
      if (this.lifetimes[i] <= 0) continue // Skip inactive particles

      const i3 = i * 3

      // Calculate vector to black hole
      const dx = this.blackHolePosition.x - this.positions[i3]
      const dy = this.blackHolePosition.y - this.positions[i3 + 1]
      const dz = this.blackHolePosition.z - this.positions[i3 + 2]
      const distanceSquared = dx * dx + dy * dy + dz * dz
      const distance = Math.sqrt(distanceSquared)

      // Deactivate if consumed (reached event horizon)
      if (distance < this.eventHorizonRadius) {
        // Notify black hole of mass consumption
        if (this.onParticleConsumed) {
          this.onParticleConsumed(0.0001) // Each particle = 0.0001 mass units
        }

        this.totalConsumed++
        this.lifetimes[i] = 0
        this.positions[i3] = 10000
        this.positions[i3 + 1] = 10000
        this.positions[i3 + 2] = 10000
        this.velocities[i3] = 0
        this.velocities[i3 + 1] = 0
        this.velocities[i3 + 2] = 0
        continue
      }

      // Apply gravitational attraction (same physics as SupernovaRemnant)
      // Increased radius to 300 units to prevent particle escape
      if (distance < 300 && distance > 0.1) {
        const acceleration = this.accretionStrength / distanceSquared

        // Normalize radial direction
        const radialX = dx / distance
        const radialY = dy / distance
        const radialZ = dz / distance

        // Apply radial force
        const ax = radialX * acceleration
        const ay = radialY * acceleration
        const az = radialZ * acceleration

        this.velocities[i3] += ax
        this.velocities[i3 + 1] += ay
        this.velocities[i3 + 2] += az

        // REMOVED: Tangential velocity for spiral motion (will add back later)
        // For now: ONLY gravitational infall to establish baseline
      }

      // Update position
      this.positions[i3] += this.velocities[i3]
      this.positions[i3 + 1] += this.velocities[i3 + 1]
      this.positions[i3 + 2] += this.velocities[i3 + 2]

      // Age particles (deactivate after 30 seconds if not consumed)
      this.lifetimes[i] -= deltaTime
      if (this.lifetimes[i] <= 0) {
        this.positions[i3] = 10000
        this.positions[i3 + 1] = 10000
        this.positions[i3 + 2] = 10000
      }
    }

    this.geometry.attributes.position.needsUpdate = true
  }

  private spawnChunk(): void {
    const chunkSize = 50 + Math.floor(Math.random() * 50) // 50-100 particles per chunk (much larger!)
    let spawned = 0

    for (let i = 0; i < this.particleCount && spawned < chunkSize; i++) {
      if (this.lifetimes[i] > 0) continue // Skip active particles

      const i3 = i * 3

      // Spawn at source position with random spherical offset
      const offsetRadius = 5.0
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.positions[i3] = this.spawnPosition.x + Math.sin(phi) * Math.cos(theta) * offsetRadius
      this.positions[i3 + 1] = this.spawnPosition.y + Math.sin(phi) * Math.sin(theta) * offsetRadius
      this.positions[i3 + 2] = this.spawnPosition.z + Math.cos(phi) * offsetRadius

      // Calculate initial velocity: ORBIT-FIRST approach for spiral motion
      const dx = -this.spawnPosition.x
      const dy = -this.spawnPosition.y
      const dz = -this.spawnPosition.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // TINY radial velocity (gentle inward drift only)
      const radialSpeed = 0.01 + Math.random() * 0.01
      const vx = (dx / dist) * radialSpeed
      const vy = (dy / dist) * radialSpeed
      const vz = (dz / dist) * radialSpeed

      // Tangential velocity (perpendicular for orbital motion)
      // Cross product: radial × up(0,1,0) = tangent
      const radialX = dx / dist
      const radialY = dy / dist
      const radialZ = dz / dist

      const tangentX = -radialZ
      const tangentY = 0
      const tangentZ = radialX
      const tangentLength = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ)

      // DOMINANT orbital velocity - particles orbit first, spiral later
      // Keplerian velocity: v = sqrt(GM/r)
      const orbitalSpeed = Math.sqrt(this.accretionStrength / dist) * 0.8

      const tx = (tangentX / tangentLength) * orbitalSpeed
      const ty = (tangentY / tangentLength) * orbitalSpeed
      const tz = (tangentZ / tangentLength) * orbitalSpeed

      // Combine: orbital velocity dominates, gentle inward drift
      this.velocities[i3] = vx + tx + (Math.random() - 0.5) * 0.01
      this.velocities[i3 + 1] = vy + ty + (Math.random() - 0.5) * 0.01
      this.velocities[i3 + 2] = vz + tz + (Math.random() - 0.5) * 0.01

      // Set lifetime (particles exist for 120 seconds to complete spiral orbits)
      this.lifetimes[i] = 120.0

      spawned++
    }
  }

  public setConsumptionCallback(callback: (mass: number) => void): void {
    this.onParticleConsumed = callback
  }

  public updateEventHorizonRadius(newRadius: number): void {
    this.eventHorizonRadius = newRadius
  }

  public getActiveParticleCount(): number {
    // Count particles with lifetime > 0
    let count = 0
    for (let i = 0; i < this.particleCount; i++) {
      if (this.lifetimes[i] > 0) {
        count++
      }
    }
    return count
  }

  public dispose(): void {
    this.scene.remove(this.particles)
    this.geometry.dispose()
    this.material.dispose()

    // Remove debug marker
    this.scene.remove(this.debugMarker)
    this.debugMarker.geometry.dispose()
    ;(this.debugMarker.material as THREE.Material).dispose()
  }
}
