import * as THREE from 'three'

export class SupernovaFlash {
  private readonly duration = 3.0 // Longer, more dramatic flash
  private readonly peakTime = 0.3 // Peak brightness at 30%

  private time = 0
  private scene: THREE.Scene
  private group: THREE.Group

  // Multiple shockwave rings
  private shockwaveRings: THREE.Mesh[] = []
  private ringCount = 5

  // Massive particle burst
  private burstParticles!: THREE.Points
  private burstGeometry!: THREE.BufferGeometry
  private burstMaterial!: THREE.PointsMaterial
  private particleCount = 5000
  private particlePositions!: Float32Array
  private particleVelocities!: Float32Array

  private coreSprite: THREE.Sprite
  private flashLight: THREE.PointLight
  private disposed = false

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()

    // Create multiple shockwave rings at different scales and speeds
    const ringGeometry = new THREE.RingGeometry(1, 1.3, 64)
    for (let i = 0; i < this.ringCount; i++) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })

      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.scale.setScalar(20 + i * 10) // Stagger starting sizes
      this.shockwaveRings.push(ring)
      this.group.add(ring)
    }

    // Create massive particle burst
    this.burstGeometry = new THREE.BufferGeometry()
    this.particlePositions = new Float32Array(this.particleCount * 3)
    this.particleVelocities = new Float32Array(this.particleCount * 3)

    // Initialize particles at center with random velocities
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      // Start at center
      this.particlePositions[i3] = 0
      this.particlePositions[i3 + 1] = 0
      this.particlePositions[i3 + 2] = 0

      // Random velocities in all directions
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.5 + Math.random() * 1.5

      this.particleVelocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      this.particleVelocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      this.particleVelocities[i3 + 2] = Math.cos(phi) * speed
    }

    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3))

    this.burstMaterial = new THREE.PointsMaterial({
      size: 0.8,
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.burstParticles = new THREE.Points(this.burstGeometry, this.burstMaterial)
    this.group.add(this.burstParticles)

    // Bright core sprite - even bigger
    const spriteMaterial = new THREE.SpriteMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.coreSprite = new THREE.Sprite(spriteMaterial)
    this.coreSprite.scale.set(80, 80, 80) // Massive sprite
    this.group.add(this.coreSprite)

    // Insanely bright light - even more intense
    this.flashLight = new THREE.PointLight(0xffffff, 3000, 1500)
    this.group.add(this.flashLight)

    this.scene.add(this.group)
  }

  update(deltaTime: number): void {
    if (this.disposed) {
      return
    }

    this.time += deltaTime
    const progress = Math.min(this.time / this.duration, 1)

    // Update multiple shockwave rings at different speeds
    for (let i = 0; i < this.ringCount; i++) {
      const ring = this.shockwaveRings[i]
      const material = ring.material as THREE.MeshBasicMaterial

      // Each ring expands at a different speed (faster rings start later)
      const speedMultiplier = 1 + i * 0.3
      const delayedProgress = Math.max(0, progress - i * 0.05) // Stagger start
      const expansion = THREE.MathUtils.lerp(20 + i * 10, 250 + i * 30, delayedProgress * speedMultiplier)
      ring.scale.setScalar(expansion)

      // Ring opacity fades as it expands
      if (delayedProgress < 0.3) {
        material.opacity = THREE.MathUtils.lerp(0, 0.8, delayedProgress / 0.3)
      } else {
        material.opacity = THREE.MathUtils.lerp(0.8, 0, (delayedProgress - 0.3) / 0.7)
      }
    }

    // Update particle burst
    const positions = this.burstGeometry.attributes.position.array as Float32Array
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      positions[i3] += this.particleVelocities[i3]
      positions[i3 + 1] += this.particleVelocities[i3 + 1]
      positions[i3 + 2] += this.particleVelocities[i3 + 2]
    }
    this.burstGeometry.attributes.position.needsUpdate = true

    // Expand sprite dramatically
    const spriteScale = THREE.MathUtils.lerp(80, 250, progress)
    this.coreSprite.scale.set(spriteScale, spriteScale, spriteScale)

    const spriteMaterial = this.coreSprite.material as THREE.SpriteMaterial

    // Color progression: white → blue → purple
    let color: THREE.Color
    if (progress < 0.3) {
      // White peak
      color = new THREE.Color(0xffffff)
    } else if (progress < 0.6) {
      // White → blue
      const blueProgress = (progress - 0.3) / 0.3
      color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0x4488ff),
        blueProgress
      )
    } else {
      // Blue → purple
      const purpleProgress = (progress - 0.6) / 0.4
      color = new THREE.Color().lerpColors(
        new THREE.Color(0x4488ff),
        new THREE.Color(0x8844ff),
        purpleProgress
      )
    }

    // Apply color to all elements
    spriteMaterial.color.copy(color)
    this.burstMaterial.color.copy(color)
    this.flashLight.color.copy(color)
    for (const ring of this.shockwaveRings) {
      (ring.material as THREE.MeshBasicMaterial).color.copy(color)
    }

    // Intensity/opacity curves
    if (this.time < this.peakTime) {
      // Rising to peak
      const riseProgress = this.time / this.peakTime
      spriteMaterial.opacity = THREE.MathUtils.lerp(0, 1.0, riseProgress)
      this.burstMaterial.opacity = THREE.MathUtils.lerp(0, 1.0, riseProgress)
      this.flashLight.intensity = THREE.MathUtils.lerp(0, 3000, riseProgress)
    } else {
      // Fading out
      const fadeProgress = (this.time - this.peakTime) / (this.duration - this.peakTime)
      spriteMaterial.opacity = THREE.MathUtils.lerp(1.0, 0, fadeProgress)
      this.burstMaterial.opacity = THREE.MathUtils.lerp(1.0, 0, fadeProgress)
      this.flashLight.intensity = THREE.MathUtils.lerp(3000, 0, fadeProgress)
    }

    if (this.time >= this.duration) {
      this.dispose()
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.scene.remove(this.group)

    // Dispose shockwave rings
    for (const ring of this.shockwaveRings) {
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    }

    // Dispose particle burst
    this.burstGeometry.dispose()
    this.burstMaterial.dispose()

    // Dispose sprite
    ;(this.coreSprite.material as THREE.Material).dispose()
  }

  get active(): boolean {
    return !this.disposed
  }

  // Get camera shake intensity (0-1) based on flash progress
  getShakeIntensity(): number {
    if (this.disposed) return 0

    const progress = Math.min(this.time / this.duration, 1)

    // Strong shake at beginning, tapering off
    if (progress < 0.2) {
      return THREE.MathUtils.lerp(0, 1.0, progress / 0.2)
    } else if (progress < 0.5) {
      return THREE.MathUtils.lerp(1.0, 0.5, (progress - 0.2) / 0.3)
    } else {
      return THREE.MathUtils.lerp(0.5, 0, (progress - 0.5) / 0.5)
    }
  }
}
