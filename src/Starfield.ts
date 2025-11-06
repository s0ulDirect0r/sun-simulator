import * as THREE from 'three'

export class Starfield {
  private stars: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private starCount: number = 10000

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.starCount * 3)
    const colors = new Float32Array(this.starCount * 3)
    const sizes = new Float32Array(this.starCount)

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3

      // Random position in a large sphere
      const radius = 300 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      // Star colors - most white, some slightly colored
      const colorType = Math.random()
      if (colorType < 0.7) {
        // White stars
        colors[i3] = 1.0
        colors[i3 + 1] = 1.0
        colors[i3 + 2] = 1.0
      } else if (colorType < 0.85) {
        // Blue stars
        colors[i3] = 0.7
        colors[i3 + 1] = 0.8
        colors[i3 + 2] = 1.0
      } else {
        // Red/orange stars
        colors[i3] = 1.0
        colors[i3 + 1] = 0.7
        colors[i3 + 2] = 0.5
      }

      // Random sizes - most small, some larger
      sizes[i] = Math.random() < 0.9 ? 0.5 + Math.random() * 0.5 : 1.0 + Math.random() * 1.5
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.stars = new THREE.Points(this.geometry, this.material)
    scene.add(this.stars)
  }

  public update(deltaTime: number): void {
    // Subtle rotation for parallax effect
    this.stars.rotation.y += deltaTime * 0.001
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
