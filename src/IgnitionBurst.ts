import * as THREE from 'three'

export class IgnitionBurst {
  private readonly duration = 2.5
  private readonly fadeStart = 1.2

  private time = 0
  private scene: THREE.Scene
  private group: THREE.Group
  private shockShell: THREE.Mesh
  private coreSprite: THREE.Sprite
  private flashLight: THREE.PointLight
  private disposed = false

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()

    const shellGeometry = new THREE.SphereGeometry(1, 64, 64)
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe8a6,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    })

    this.shockShell = new THREE.Mesh(shellGeometry, shellMaterial)
    this.group.add(this.shockShell)

    const spriteMaterial = new THREE.SpriteMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.coreSprite = new THREE.Sprite(spriteMaterial)
    this.coreSprite.scale.set(4, 4, 4)
    this.group.add(this.coreSprite)

    this.flashLight = new THREE.PointLight(0xfff5e1, 18, 140, 1.6)
    this.group.add(this.flashLight)

    this.scene.add(this.group)
  }

  update(deltaTime: number): void {
    if (this.disposed) {
      return
    }

    this.time += deltaTime
    const t = this.time
    const progress = Math.min(t / this.duration, 1)

    const expansion = THREE.MathUtils.lerp(1, 95, progress)
    this.shockShell.scale.setScalar(expansion)

    const spriteScale = THREE.MathUtils.lerp(6, 18, progress * 0.8)
    this.coreSprite.scale.set(spriteScale, spriteScale, spriteScale)

    const brightnessPeak = Math.sin(Math.min(progress, 0.9) * Math.PI)
    const shellMaterial = this.shockShell.material as THREE.MeshBasicMaterial
    const spriteMaterial = this.coreSprite.material as THREE.SpriteMaterial

    if (t > this.fadeStart) {
      const fadeProgress = (t - this.fadeStart) / (this.duration - this.fadeStart)
      const alpha = THREE.MathUtils.lerp(0.6, 0, fadeProgress)
      shellMaterial.opacity = Math.max(alpha, 0)
      spriteMaterial.opacity = Math.max(THREE.MathUtils.lerp(0.75, 0, fadeProgress), 0)
    } else {
      shellMaterial.opacity = 0.45 + brightnessPeak * 0.3
      spriteMaterial.opacity = 0.65 + brightnessPeak * 0.35
    }

    this.flashLight.intensity = THREE.MathUtils.lerp(12, 0, progress)

    if (t >= this.duration) {
      this.dispose()
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.scene.remove(this.group)
    this.shockShell.geometry.dispose()
    ;(this.shockShell.material as THREE.Material).dispose()
    ;(this.coreSprite.material as THREE.Material).dispose()
  }

  get active(): boolean {
    return !this.disposed
  }
}
