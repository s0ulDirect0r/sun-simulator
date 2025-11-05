import * as THREE from 'three'

export class SupernovaFlash {
  private readonly duration = 1.0 // Very quick flash
  private readonly peakTime = 0.15 // Peak brightness at 15%

  private time = 0
  private scene: THREE.Scene
  private group: THREE.Group
  private flashSphere: THREE.Mesh
  private coreSprite: THREE.Sprite
  private flashLight: THREE.PointLight
  private disposed = false

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()

    // Massive expanding flash sphere - fills entire scene
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, // Pure white
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide // Render inside
    })

    this.flashSphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    this.flashSphere.scale.setScalar(30) // Start large
    this.group.add(this.flashSphere)

    // Bright core sprite
    const spriteMaterial = new THREE.SpriteMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.coreSprite = new THREE.Sprite(spriteMaterial)
    this.coreSprite.scale.set(50, 50, 50) // Huge sprite
    this.group.add(this.coreSprite)

    // Insanely bright light
    this.flashLight = new THREE.PointLight(0xffffff, 2000, 1000)
    this.group.add(this.flashLight)

    this.scene.add(this.group)
  }

  update(deltaTime: number): void {
    if (this.disposed) {
      return
    }

    this.time += deltaTime
    const progress = Math.min(this.time / this.duration, 1)

    // Expand sphere rapidly
    const expansion = THREE.MathUtils.lerp(30, 200, progress)
    this.flashSphere.scale.setScalar(expansion)

    // Expand sprite
    const spriteScale = THREE.MathUtils.lerp(50, 150, progress)
    this.coreSprite.scale.set(spriteScale, spriteScale, spriteScale)

    const sphereMaterial = this.flashSphere.material as THREE.MeshBasicMaterial
    const spriteMaterial = this.coreSprite.material as THREE.SpriteMaterial

    // Quick peak then fast fade
    if (this.time < this.peakTime) {
      // Rising to peak
      const riseProgress = this.time / this.peakTime
      sphereMaterial.opacity = THREE.MathUtils.lerp(0, 0.95, riseProgress)
      spriteMaterial.opacity = THREE.MathUtils.lerp(0, 1.0, riseProgress)
      this.flashLight.intensity = THREE.MathUtils.lerp(0, 2000, riseProgress)
    } else {
      // Fading out
      const fadeProgress = (this.time - this.peakTime) / (this.duration - this.peakTime)
      sphereMaterial.opacity = THREE.MathUtils.lerp(0.95, 0, fadeProgress)
      spriteMaterial.opacity = THREE.MathUtils.lerp(1.0, 0, fadeProgress)
      this.flashLight.intensity = THREE.MathUtils.lerp(2000, 0, fadeProgress)

      // Shift color to blue as it fades
      const blueShift = THREE.MathUtils.lerp(1.0, 0.7, fadeProgress)
      sphereMaterial.color.setRGB(blueShift, blueShift, 1.0)
      spriteMaterial.color.setRGB(blueShift, blueShift, 1.0)
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
    this.flashSphere.geometry.dispose()
    ;(this.flashSphere.material as THREE.Material).dispose()
    ;(this.coreSprite.material as THREE.Material).dispose()
  }

  get active(): boolean {
    return !this.disposed
  }
}
