import * as THREE from 'three'
import { createEventHorizonMaterial } from './shaders/EventHorizonShader'
import { createAccretionDiskMaterial } from './shaders/AccretionDiskShader'
import { createJetTrailMaterial } from './shaders/JetTrailShader'

export class BlackHole {
  private scene: THREE.Scene
  private camera: THREE.Camera // Needed for gravitational lensing calculations
  public eventHorizon!: THREE.Mesh // Public for debug toggles
  private eventHorizonMaterial!: THREE.ShaderMaterial
  public accretionDisk!: THREE.Mesh // Public for debug toggles
  private accretionDiskMaterial!: THREE.ShaderMaterial

  // Jets of matter escaping along poles (shader-based)
  public jetTop!: THREE.Mesh // Public for debug toggles
  public jetBottom!: THREE.Mesh // Public for debug toggles
  private jetMaterial!: THREE.ShaderMaterial
  private jetLength: number = 250.0 // Extend far into space for dramatic reach

  // Gravitational lensing ring
  public lensingRing!: THREE.Mesh // Public for debug toggles

  private time: number = 0
  private blackHoleRadius: number = 5.0 // Schwarzschild radius (scaled up for visibility)

  // Mass growth tracking
  private currentMass: number = 1.0 // Initial mass in solar masses
  private baseRadius: number = 5.0 // Initial Schwarzschild radius
  private lastLoggedMass: number = 1.0 // For reducing console spam

  private formationProgress: number = 0
  private formationDuration: number = 4.0
  private isForming: boolean = true

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene
    this.camera = camera

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
    // Create shader-based jet beams (cone geometry for realistic narrowing)
    // Jet radius proportional to event horizon: ~20% at base, ~50% at tip (physically inspired)
    const baseRadius = this.blackHoleRadius * 0.20   // 20% of event horizon radius
    const tipRadius = this.blackHoleRadius * 0.50    // 50% of event horizon radius at tip
    const radialSegments = 16
    const heightSegments = 32 // Segments along length for smooth animation

    // Create cone geometry
    const geometry = new THREE.CylinderGeometry(
      baseRadius,      // radiusTop
      tipRadius,       // radiusBottom (wider at tip)
      this.jetLength,  // height
      radialSegments,
      heightSegments
    )

    // Create shader material
    this.jetMaterial = createJetTrailMaterial(this.jetLength)
    this.jetMaterial.uniforms.opacity.value = 0.0 // Start invisible (fade in during formation)

    // Top jet (pointing up along +Y axis)
    this.jetTop = new THREE.Mesh(geometry.clone(), this.jetMaterial)
    this.jetTop.position.set(0, this.blackHoleRadius + this.jetLength / 2, 0)
    this.jetTop.renderOrder = 4 // Render after accretion disk and streams
    this.scene.add(this.jetTop)

    // Bottom jet (pointing down along -Y axis)
    this.jetBottom = new THREE.Mesh(geometry.clone(), this.jetMaterial.clone())
    this.jetBottom.position.set(0, -this.blackHoleRadius - this.jetLength / 2, 0)
    this.jetBottom.rotation.x = Math.PI // Flip upside down
    this.jetBottom.renderOrder = 4
    this.scene.add(this.jetBottom)

    console.log(`Jets created: length=${this.jetLength}, base radius=${baseRadius}`)
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

      // Fade in jets via shader uniform
      this.jetMaterial.uniforms.opacity.value = this.formationProgress * 0.8
      ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.opacity.value = this.formationProgress * 0.8
    }

    // Update jet shaders
    this.jetMaterial.uniforms.time.value = this.time
    // Bottom jet uses cloned material, update it too
    ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.time.value = this.time

    // Pulse lensing ring
    const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
    if (!this.isForming) {
      lensingMaterial.opacity = 0.4 + Math.sin(this.time * 2) * 0.2
    }

    // Subtle rotation of event horizon (for effect)
    this.eventHorizon.rotation.y += deltaTime * 0.1
  }

  public addMass(deltaMass: number): void {
    this.currentMass += deltaMass

    // Schwarzschild radius: Rs = 2GM/c² (simplified: Rs ∝ M)
    const newRadius = this.baseRadius * this.currentMass

    // Clamp maximum growth to prevent excessive scaling (max 3x initial size)
    const clampedRadius = Math.min(newRadius, this.baseRadius * 3.0)

    // Scale event horizon sphere
    this.eventHorizon.scale.setScalar(clampedRadius / this.baseRadius)

    // Update shader uniform for Schwarzschild radius
    this.eventHorizonMaterial.uniforms.schwarzschildRadius.value = clampedRadius
    this.blackHoleRadius = clampedRadius

    // Scale jets proportionally to event horizon radius (maintains consistent ratio)
    const radiusRatio = clampedRadius / this.baseRadius

    // Scale jet width/depth to match event horizon growth
    this.jetTop.scale.x = radiusRatio
    this.jetTop.scale.z = radiusRatio
    this.jetTop.scale.y = 1.0 // Keep length constant

    this.jetBottom.scale.x = radiusRatio
    this.jetBottom.scale.z = radiusRatio
    this.jetBottom.scale.y = 1.0 // Keep length constant

    // Increase jet brightness with mass (more energetic accretion = brighter jets)
    // Scale from 2.0 to 4.5 intensity as mass goes from 1.0 to 3.0
    const massScale = Math.min(this.currentMass, 3.0)
    const glowScale = 2.0 + (massScale - 1.0) * 1.25
    this.jetMaterial.uniforms.glowIntensity.value = glowScale
    ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.glowIntensity.value = glowScale

    // Only log every 0.1 mass increase to reduce console spam
    if (this.currentMass - this.lastLoggedMass >= 0.1) {
      console.log(`Black hole mass: ${this.currentMass.toFixed(2)}, radius: ${clampedRadius.toFixed(2)}`)
      this.lastLoggedMass = this.currentMass
    }
  }

  public getEventHorizonRadius(): number {
    return this.blackHoleRadius
  }

  public getCurrentMass(): number {
    return this.currentMass
  }

  public setScale(scale: number): void {
    // Uniformly scale all black hole elements (for emergence from singularity)
    this.eventHorizon.scale.setScalar(scale)
    this.accretionDisk.scale.setScalar(scale)
    this.lensingRing.scale.setScalar(scale)
    this.jetTop.scale.set(scale, scale, scale)
    this.jetBottom.scale.set(scale, scale, scale)
  }

  public setOpacity(opacity: number): void {
    // Manual opacity control - bypass formation animation
    this.isForming = false
    this.formationProgress = opacity

    // Apply to all black hole elements
    this.eventHorizonMaterial.opacity = opacity * 1.0
    this.eventHorizonMaterial.uniforms.glowIntensity.value = opacity * 8.0

    const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
    lensingMaterial.opacity = opacity * 0.6

    // Accretion disk opacity via shader uniform
    this.accretionDiskMaterial.uniforms.globalOpacity.value = opacity * 1.0

    // Jets opacity via shader uniforms
    this.jetMaterial.uniforms.opacity.value = opacity * 0.8
    ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.opacity.value = opacity * 0.8
  }

  // Separate control for staged formation (physically accurate)
  public setEventHorizonOpacity(opacity: number): void {
    this.isForming = false
    this.eventHorizonMaterial.opacity = opacity * 1.0
    this.eventHorizonMaterial.uniforms.glowIntensity.value = opacity * 8.0

    const lensingMaterial = this.lensingRing.material as THREE.MeshBasicMaterial
    lensingMaterial.opacity = opacity * 0.6
  }

  public setAccretionDiskOpacity(opacity: number): void {
    this.accretionDiskMaterial.uniforms.globalOpacity.value = opacity * 1.0
  }

  public setJetOpacity(opacity: number): void {
    this.jetMaterial.uniforms.opacity.value = opacity * 0.8
    ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.opacity.value = opacity * 0.8
  }

  public dispose(): void {
    this.eventHorizon.geometry.dispose()
    this.eventHorizonMaterial.dispose()
    this.accretionDisk.geometry.dispose()
    this.accretionDiskMaterial.dispose()

    // Dispose shader-based jets
    this.jetTop.geometry.dispose()
    this.jetMaterial.dispose()
    this.jetBottom.geometry.dispose()
    ;(this.jetBottom.material as THREE.Material).dispose()

    this.lensingRing.geometry.dispose()
    ;(this.lensingRing.material as THREE.Material).dispose()

    this.scene.remove(this.eventHorizon)
    this.scene.remove(this.accretionDisk)
    this.scene.remove(this.jetTop)
    this.scene.remove(this.jetBottom)
    this.scene.remove(this.lensingRing)
  }
}
