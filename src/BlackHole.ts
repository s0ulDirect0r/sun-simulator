import * as THREE from 'three'

export class BlackHole {
  private scene: THREE.Scene
  private eventHorizon!: THREE.Mesh
  private accretionDisk!: THREE.Points
  private accretionDiskGeometry!: THREE.BufferGeometry
  private accretionDiskMaterial!: THREE.PointsMaterial
  private diskParticleCount: number = 5000
  private diskPositions!: Float32Array
  private diskVelocities!: Float32Array
  private diskColors!: Float32Array

  // Jets of matter escaping along poles
  private jets!: THREE.Points
  private jetsGeometry!: THREE.BufferGeometry
  private jetsMaterial!: THREE.PointsMaterial
  private jetParticleCount: number = 1000
  private jetPositions!: Float32Array
  private jetVelocities!: Float32Array

  // Gravitational lensing ring
  private lensingRing!: THREE.Mesh

  private time: number = 0
  private blackHoleRadius: number = 3.0 // Schwarzschild radius
  private accretionDiskInnerRadius: number = 4.0
  private accretionDiskOuterRadius: number = 20.0

  private formationProgress: number = 0
  private formationDuration: number = 4.0
  private isForming: boolean = true

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.createEventHorizon()
    this.createAccretionDisk()
    this.createJets()
    this.createLensingRing()
  }

  private createEventHorizon(): void {
    // Event horizon - perfectly black sphere
    const geometry = new THREE.SphereGeometry(this.blackHoleRadius, 64, 64)
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0, // Start invisible
    })

    this.eventHorizon = new THREE.Mesh(geometry, material)
    this.scene.add(this.eventHorizon)
  }

  private createLensingRing(): void {
    // Gravitational lensing creates a bright ring around the event horizon
    const geometry = new THREE.RingGeometry(
      this.blackHoleRadius * 1.5,
      this.blackHoleRadius * 2.0,
      64
    )
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0, // Start invisible
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })

    this.lensingRing = new THREE.Mesh(geometry, material)

    // Orient rings at multiple angles for 3D lensing effect
    this.lensingRing.rotation.x = Math.PI / 2
    this.scene.add(this.lensingRing)
  }

  private createAccretionDisk(): void {
    // Initialize geometry for accretion disk
    this.accretionDiskGeometry = new THREE.BufferGeometry()
    this.diskPositions = new Float32Array(this.diskParticleCount * 3)
    this.diskVelocities = new Float32Array(this.diskParticleCount * 3)
    this.diskColors = new Float32Array(this.diskParticleCount * 3)

    // Create swirling accretion disk particles
    for (let i = 0; i < this.diskParticleCount; i++) {
      const i3 = i * 3

      // Particles in a disk formation
      const radius = this.accretionDiskInnerRadius +
        Math.pow(Math.random(), 0.5) * (this.accretionDiskOuterRadius - this.accretionDiskInnerRadius)
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 0.5 * (1 - radius / this.accretionDiskOuterRadius) // Thinner at outer edge

      this.diskPositions[i3] = Math.cos(angle) * radius
      this.diskPositions[i3 + 1] = height
      this.diskPositions[i3 + 2] = Math.sin(angle) * radius

      // Orbital velocity (faster closer to black hole)
      const speed = 0.05 / Math.sqrt(radius) // Keplerian velocity
      this.diskVelocities[i3] = -Math.sin(angle) * speed
      this.diskVelocities[i3 + 1] = 0
      this.diskVelocities[i3 + 2] = Math.cos(angle) * speed

      // Color based on temperature (hotter closer to black hole)
      const temperature = 1 - (radius - this.accretionDiskInnerRadius) /
        (this.accretionDiskOuterRadius - this.accretionDiskInnerRadius)

      // Hot inner disk (blue-white) to cooler outer disk (red-orange)
      if (temperature > 0.7) {
        // Blue-white (very hot)
        this.diskColors[i3] = 0.8 + temperature * 0.2
        this.diskColors[i3 + 1] = 0.9 + temperature * 0.1
        this.diskColors[i3 + 2] = 1.0
      } else if (temperature > 0.4) {
        // White-yellow (hot)
        this.diskColors[i3] = 1.0
        this.diskColors[i3 + 1] = 0.9
        this.diskColors[i3 + 2] = 0.7 + temperature * 0.3
      } else {
        // Orange-red (cooler)
        this.diskColors[i3] = 1.0
        this.diskColors[i3 + 1] = 0.4 + temperature * 0.5
        this.diskColors[i3 + 2] = 0.2
      }
    }

    this.accretionDiskGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.diskPositions, 3)
    )
    this.accretionDiskGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.diskColors, 3)
    )

    // Accretion disk material with vertex colors
    this.accretionDiskMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.accretionDisk = new THREE.Points(
      this.accretionDiskGeometry,
      this.accretionDiskMaterial
    )
    this.scene.add(this.accretionDisk)
  }

  private createJets(): void {
    // Jets of matter shooting out along poles
    this.jetsGeometry = new THREE.BufferGeometry()
    this.jetPositions = new Float32Array(this.jetParticleCount * 3)
    this.jetVelocities = new Float32Array(this.jetParticleCount * 3)

    for (let i = 0; i < this.jetParticleCount; i++) {
      const i3 = i * 3

      // Start at poles (top and bottom)
      const isTopJet = Math.random() > 0.5
      const poleY = isTopJet ? this.blackHoleRadius : -this.blackHoleRadius
      const offsetX = (Math.random() - 0.5) * 0.5
      const offsetZ = (Math.random() - 0.5) * 0.5

      this.jetPositions[i3] = offsetX
      this.jetPositions[i3 + 1] = poleY
      this.jetPositions[i3 + 2] = offsetZ

      // Velocity shooting outward from poles
      const jetSpeed = 0.3 + Math.random() * 0.2
      this.jetVelocities[i3] = offsetX * 0.1 // Slight spread
      this.jetVelocities[i3 + 1] = (isTopJet ? 1 : -1) * jetSpeed
      this.jetVelocities[i3 + 2] = offsetZ * 0.1 // Slight spread
    }

    this.jetsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.jetPositions, 3)
    )

    // Jets material - bright blue-white
    this.jetsMaterial = new THREE.PointsMaterial({
      size: 0.4,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.0, // Start invisible
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.jets = new THREE.Points(this.jetsGeometry, this.jetsMaterial)
    this.scene.add(this.jets)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Handle formation animation
    if (this.isForming) {
      this.formationProgress += deltaTime / this.formationDuration

      if (this.formationProgress >= 1.0) {
        this.formationProgress = 1.0
        this.isForming = false
      }

      // Fade in all elements
      const material = this.eventHorizon.material as THREE.MeshBasicMaterial
      material.opacity = this.formationProgress * 1.0

      const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
      lensingMaterial.opacity = this.formationProgress * 0.6

      this.accretionDiskMaterial.opacity = this.formationProgress * 0.8
      this.jetsMaterial.opacity = this.formationProgress * 0.7
    }

    // Rotate accretion disk
    this.accretionDisk.rotation.y += deltaTime * 0.2

    // Update accretion disk particles
    const diskPositions = this.accretionDiskGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < this.diskParticleCount; i++) {
      const i3 = i * 3

      const x = diskPositions[i3]
      const y = diskPositions[i3 + 1]
      const z = diskPositions[i3 + 2]

      // Current radius from black hole
      const radius = Math.sqrt(x * x + z * z)

      // Orbital motion
      const angle = Math.atan2(z, x)
      const orbitalSpeed = 0.8 / Math.sqrt(radius) // Keplerian
      const newAngle = angle + orbitalSpeed * deltaTime

      // Gradually spiral inward
      const spiralInwardSpeed = 0.05 * deltaTime
      const newRadius = Math.max(radius - spiralInwardSpeed, this.accretionDiskInnerRadius)

      // Update position
      diskPositions[i3] = Math.cos(newAngle) * newRadius
      diskPositions[i3 + 2] = Math.sin(newAngle) * newRadius

      // Add turbulence
      diskPositions[i3 + 1] += (Math.random() - 0.5) * 0.02

      // If particle gets too close, respawn at outer edge
      if (newRadius <= this.accretionDiskInnerRadius + 0.5) {
        const spawnRadius = this.accretionDiskOuterRadius - Math.random() * 2
        const spawnAngle = Math.random() * Math.PI * 2
        diskPositions[i3] = Math.cos(spawnAngle) * spawnRadius
        diskPositions[i3 + 1] = (Math.random() - 0.5) * 0.5
        diskPositions[i3 + 2] = Math.sin(spawnAngle) * spawnRadius
      }
    }

    this.accretionDiskGeometry.attributes.position.needsUpdate = true

    // Update jets
    const jetPositions = this.jetsGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < this.jetParticleCount; i++) {
      const i3 = i * 3

      // Move particles along velocity
      jetPositions[i3] += this.jetVelocities[i3]
      jetPositions[i3 + 1] += this.jetVelocities[i3 + 1]
      jetPositions[i3 + 2] += this.jetVelocities[i3 + 2]

      // Reset if too far
      const distanceY = Math.abs(jetPositions[i3 + 1])
      if (distanceY > 50) {
        const isTopJet = jetPositions[i3 + 1] > 0
        const poleY = isTopJet ? this.blackHoleRadius : -this.blackHoleRadius
        jetPositions[i3] = (Math.random() - 0.5) * 0.5
        jetPositions[i3 + 1] = poleY
        jetPositions[i3 + 2] = (Math.random() - 0.5) * 0.5
      }
    }

    this.jetsGeometry.attributes.position.needsUpdate = true

    // Pulse lensing ring
    const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
    if (!this.isForming) {
      lensingMaterial.opacity = 0.4 + Math.sin(this.time * 2) * 0.2
    }

    // Subtle rotation of event horizon (for effect)
    this.eventHorizon.rotation.y += deltaTime * 0.1
  }

  public dispose(): void {
    this.eventHorizon.geometry.dispose()
    ;(this.eventHorizon.material as THREE.Material).dispose()
    this.accretionDiskGeometry.dispose()
    this.accretionDiskMaterial.dispose()
    this.jetsGeometry.dispose()
    this.jetsMaterial.dispose()
    this.lensingRing.geometry.dispose()
    ;(this.lensingRing.material as THREE.Material).dispose()

    this.scene.remove(this.eventHorizon)
    this.scene.remove(this.accretionDisk)
    this.scene.remove(this.jets)
    this.scene.remove(this.lensingRing)
  }
}
