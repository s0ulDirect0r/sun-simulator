import * as THREE from 'three'
import { createEventHorizonMaterial } from './shaders/EventHorizonShader'
import { createAccretionDiskMaterial } from './shaders/AccretionDiskShader'

export class BlackHole {
  private scene: THREE.Scene
  // private camera: THREE.Camera // Not needed - Three.js provides cameraPosition automatically
  private eventHorizon!: THREE.Mesh
  private eventHorizonMaterial!: THREE.ShaderMaterial
  private accretionDisk!: THREE.Mesh
  private accretionDiskMaterial!: THREE.ShaderMaterial

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
  private blackHoleRadius: number = 5.0 // Schwarzschild radius (scaled up for visibility)

  private formationProgress: number = 0
  private formationDuration: number = 4.0
  private isForming: boolean = true

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    this.scene = scene
    // camera not needed - Three.js provides cameraPosition automatically

    this.createEventHorizon()
    this.createAccretionDisk()
    this.createJets()
    this.createLensingRing()
  }

  private createEventHorizon(): void {
    // Event horizon with shader-based spacetime distortion
    // Using high-resolution sphere for smooth curvature
    const geometry = new THREE.SphereGeometry(this.blackHoleRadius, 128, 128)

    // Create shader material with Schwarzschild radius
    this.eventHorizonMaterial = createEventHorizonMaterial(this.blackHoleRadius)

    // Start at full opacity to test visibility (skip formation fade-in for now)
    this.eventHorizonMaterial.uniforms.glowIntensity.value = 8.0
    this.eventHorizonMaterial.opacity = 1.0

    this.eventHorizon = new THREE.Mesh(geometry, this.eventHorizonMaterial)

    // Render after jets but before disk for proper layering
    this.eventHorizon.renderOrder = 1

    this.scene.add(this.eventHorizon)

    console.log(`Event horizon created: radius=${this.blackHoleRadius}`)
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
    // Shader-based accretion disk - sized to be visible from default camera
    // ISCO at 3× Schwarzschild radius, but scaled up for visibility
    const innerRadius = this.blackHoleRadius * 2.0  // 6.0 units
    const outerRadius = this.blackHoleRadius * 12.0  // 36.0 units

    console.log(`Creating accretion disk: inner=${innerRadius}, outer=${outerRadius}, schwarzschild=${this.blackHoleRadius}`)

    // Create ring geometry for the disk
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 32)

    // Rotate to horizontal (default ring is vertical)
    geometry.rotateX(-Math.PI / 2)

    // Create shader material with physically accurate rendering
    this.accretionDiskMaterial = createAccretionDiskMaterial(this.blackHoleRadius)

    this.accretionDisk = new THREE.Mesh(geometry, this.accretionDiskMaterial)
    this.accretionDisk.position.set(0, 0, 0)

    console.log('Accretion disk created with shader material')
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

    // Update event horizon shader uniforms
    this.eventHorizonMaterial.uniforms.time.value = this.time
    // cameraPosition is automatically updated by Three.js

    // Update accretion disk shader uniforms
    this.accretionDiskMaterial.uniforms.time.value = this.time
    // cameraPosition is automatically updated by Three.js

    // Handle formation animation
    if (this.isForming) {
      this.formationProgress += deltaTime / this.formationDuration

      if (this.formationProgress >= 1.0) {
        this.formationProgress = 1.0
        this.isForming = false
      }

      // Fade in all elements
      this.eventHorizonMaterial.opacity = this.formationProgress * 1.0
      this.eventHorizonMaterial.uniforms.glowIntensity.value = this.formationProgress * 8.0 // Match shader base value

      const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
      lensingMaterial.opacity = this.formationProgress * 0.6

      // Fade in accretion disk via shader uniform
      this.accretionDiskMaterial.uniforms.globalOpacity.value = this.formationProgress * 1.0
      this.jetsMaterial.opacity = this.formationProgress * 0.7
    }

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
    console.log(this.eventHorizonMaterial)
  }

  public dispose(): void {
    this.eventHorizon.geometry.dispose()
    this.eventHorizonMaterial.dispose()
    this.accretionDisk.geometry.dispose()
    this.accretionDiskMaterial.dispose()
    this.jetsGeometry.dispose()
    this.jetsMaterial.dispose()
    this.lensingRing.geometry.dispose()
      ; (this.lensingRing.material as THREE.Material).dispose()

    this.scene.remove(this.eventHorizon)
    this.scene.remove(this.accretionDisk)
    this.scene.remove(this.jets)
    this.scene.remove(this.lensingRing)
  }
}
