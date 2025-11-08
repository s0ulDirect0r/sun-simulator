import * as THREE from 'three'
import type { Vector3 } from 'three'
import { createEventHorizonMaterial } from './shaders/EventHorizonShader'
import { createAccretionDiskMaterial } from './shaders/AccretionDiskShader'
import { createJetTrailMaterial } from './shaders/JetTrailShader'
import { createPhotonCoronaMaterial } from './shaders/PhotonCoronaShader'
import { createPhotonRingMaterial } from './shaders/PhotonRingShader'

export class BlackHole {
  private scene: THREE.Scene
  public eventHorizon!: THREE.Mesh // Public for debug toggles (pure black void)
  private eventHorizonMaterial!: THREE.ShaderMaterial
  public photonCorona!: THREE.Mesh // Glowing shell around void
  private photonCoronaMaterial!: THREE.ShaderMaterial
  public accretionDisk!: THREE.Mesh // Public for debug toggles
  private accretionDiskMaterial!: THREE.ShaderMaterial

  // Jets of matter escaping along poles (shader-based)
  public jetTop!: THREE.Mesh // Public for debug toggles
  public jetBottom!: THREE.Mesh // Public for debug toggles
  private jetMaterial!: THREE.ShaderMaterial
  private jetLength: number = 250.0 // Extend far into space for dramatic reach

  // Gravitational lensing ring (photon sphere)
  public lensingRing!: THREE.Mesh // Public for debug toggles
  private lensingRingMaterial!: THREE.ShaderMaterial

  private time: number = 0
  private blackHoleRadius: number = 12.0 // Schwarzschild radius (scaled up for dramatic visibility)

  // Mass growth tracking
  private currentMass: number = 1.0 // Initial mass in solar masses
  private baseRadius: number = 12.0 // Initial Schwarzschild radius
  private lastLoggedMass: number = 1.0 // For reducing console spam

  private formationProgress: number = 0
  private formationDuration: number = 4.0
  private isForming: boolean = true

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.createEventHorizon()
    this.createPhotonCorona()
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

  private createPhotonCorona(): void {
    // Glowing shell around the void (just outside event horizon)
    const coronaRadius = this.blackHoleRadius * 1.15 // 15% larger than event horizon

    const geometry = new THREE.SphereGeometry(coronaRadius, 128, 128)
    this.photonCoronaMaterial = createPhotonCoronaMaterial()
    this.photonCoronaMaterial.uniforms.glowIntensity.value = 0.0 // Start invisible

    this.photonCorona = new THREE.Mesh(geometry, this.photonCoronaMaterial)
    this.photonCorona.renderOrder = 2 // Render after event horizon

    this.scene.add(this.photonCorona)

    console.log(`Photon corona shell created: radius=${coronaRadius}`)
  }

  private createLensingRing(): void {
    // Photon sphere at 1.5× Schwarzschild radius - where light can orbit the black hole
    // Create multi-layered Einstein ring with dramatic shader effects
    const innerRadius = this.blackHoleRadius * 1.4  // 16.8 units - slightly inside photon sphere
    const outerRadius = this.blackHoleRadius * 2.2  // 26.4 units - extended for more drama

    const geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      128, // Higher resolution for smooth shader effects
      8
    )

    // Use new photon ring shader material
    this.lensingRingMaterial = createPhotonRingMaterial(this.blackHoleRadius)
    this.lensingRingMaterial.uniforms.intensity.value = 0.0 // Start invisible (fade in during formation)

    this.lensingRing = new THREE.Mesh(geometry, this.lensingRingMaterial)

    // Orient ring horizontally around black hole
    this.lensingRing.rotation.x = Math.PI / 2

    // Render order - visible above accretion disk
    this.lensingRing.renderOrder = 3

    this.scene.add(this.lensingRing)

    console.log(`⭕ Photon ring (Einstein ring) created: inner=${innerRadius}, outer=${outerRadius}`)
    console.log(`   Photon sphere at 1.5× Rs = ${this.blackHoleRadius * 1.5} units`)
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
    // Jet radius proportional to event horizon: ~5% at base, ~12.5% at tip (physically inspired)
    const baseRadius = this.blackHoleRadius * 0.05   // 5% of event horizon radius
    const tipRadius = this.blackHoleRadius * 0.125   // 12.5% of event horizon radius at tip
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

    // Update photon corona shader uniforms
    this.photonCoronaMaterial.uniforms.time.value = this.time
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

      // Fade in photon corona (glowing shell)
      this.photonCoronaMaterial.uniforms.glowIntensity.value = this.formationProgress * 6.0

      // Fade in photon ring via shader intensity uniform
      this.lensingRingMaterial.uniforms.intensity.value = this.formationProgress * 1.5

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

    // Update photon ring shader
    this.lensingRingMaterial.uniforms.time.value = this.time

    // Subtle rotation of event horizon (for effect)
    this.eventHorizon.rotation.y += deltaTime * 0.1

    // Subtle rotation of photon ring (opposite direction for visual interest)
    this.lensingRing.rotation.z += deltaTime * 0.05
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
    // Scale from 1.2 to 2.5 intensity as mass goes from 1.0 to 3.0 (more subtle plasma beams)
    const massScale = Math.min(this.currentMass, 3.0)
    const glowScale = 1.2 + (massScale - 1.0) * 0.65
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
    this.photonCorona.scale.setScalar(scale)
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

    // Photon corona (glowing shell)
    this.photonCoronaMaterial.uniforms.glowIntensity.value = opacity * 6.0

    // Photon ring opacity via shader intensity uniform
    this.lensingRingMaterial.uniforms.intensity.value = opacity * 1.5

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

    // Photon corona fades in with event horizon
    this.photonCoronaMaterial.uniforms.glowIntensity.value = opacity * 6.0

    // Photon ring fades in with event horizon
    this.lensingRingMaterial.uniforms.intensity.value = opacity * 1.5
  }

  public setAccretionDiskOpacity(opacity: number): void {
    this.accretionDiskMaterial.uniforms.globalOpacity.value = opacity * 1.0
  }

  public setJetOpacity(opacity: number): void {
    this.jetMaterial.uniforms.opacity.value = opacity * 0.8
    ;(this.jetBottom.material as THREE.ShaderMaterial).uniforms.opacity.value = opacity * 0.8
  }

  public getPosition(): Vector3 {
    return this.eventHorizon.position
  }

  public dispose(): void {
    this.eventHorizon.geometry.dispose()
    this.eventHorizonMaterial.dispose()
    this.photonCorona.geometry.dispose()
    this.photonCoronaMaterial.dispose()
    this.accretionDisk.geometry.dispose()
    this.accretionDiskMaterial.dispose()

    // Dispose shader-based jets
    this.jetTop.geometry.dispose()
    this.jetMaterial.dispose()
    this.jetBottom.geometry.dispose()
    ;(this.jetBottom.material as THREE.Material).dispose()

    // Dispose photon ring shader
    this.lensingRing.geometry.dispose()
    this.lensingRingMaterial.dispose()

    this.scene.remove(this.eventHorizon)
    this.scene.remove(this.photonCorona)
    this.scene.remove(this.accretionDisk)
    this.scene.remove(this.jetTop)
    this.scene.remove(this.jetBottom)
    this.scene.remove(this.lensingRing)
  }
}
