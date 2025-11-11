import * as THREE from 'three'

interface PlanetConfig {
  name: string
  radius: number
  orbitRadius: number
  orbitSpeed: number
  color: number
  emissive?: number
  hasAtmosphere?: boolean
  atmosphereColor?: number
}

export class PlanetSystem {
  private scene: THREE.Scene
  private planets: THREE.Mesh[] = []
  private orbits: THREE.Line[] = []
  private planetData: PlanetConfig[] = [
    {
      name: 'Mercury',
      radius: 0.4,
      orbitRadius: 8,
      orbitSpeed: 1.6,
      color: 0x8c7853,
    },
    {
      name: 'Venus',
      radius: 0.9,
      orbitRadius: 12,
      orbitSpeed: 1.2,
      color: 0xffc649,
      hasAtmosphere: true,
      atmosphereColor: 0xffaa00,
    },
    {
      name: 'Earth',
      radius: 1.0,
      orbitRadius: 16,
      orbitSpeed: 1.0,
      color: 0x2233ff,
      emissive: 0x001133,
      hasAtmosphere: true,
      atmosphereColor: 0x4488ff,
    },
    {
      name: 'Mars',
      radius: 0.5,
      orbitRadius: 20,
      orbitSpeed: 0.8,
      color: 0xdc4b3c,
    },
  ]
  private orbitAngles: number[] = []
  private time: number = 0
  private isVisible: boolean = true
  private fadeProgress: number = 0
  private isFading: boolean = false
  private atmospheres: THREE.Mesh[] = []
  private engulfedPlanets: Set<number> = new Set()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createPlanets()
    this.createOrbits()
  }

  private createOrbits(): void {
    // Create orbit paths for each planet
    this.planetData.forEach((planetConfig) => {
      const orbitGeometry = new THREE.BufferGeometry()
      const orbitPoints: THREE.Vector3[] = []
      const segments = 128

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const x = Math.cos(angle) * planetConfig.orbitRadius
        const z = Math.sin(angle) * planetConfig.orbitRadius
        orbitPoints.push(new THREE.Vector3(x, 0, z))
      }

      orbitGeometry.setFromPoints(orbitPoints)

      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.3,
      })

      const orbit = new THREE.Line(orbitGeometry, orbitMaterial)
      this.orbits.push(orbit)
      this.scene.add(orbit)
    })
  }

  private createPlanets(): void {
    this.planetData.forEach((planetConfig, _index) => {
      // Create planet
      const geometry = new THREE.SphereGeometry(planetConfig.radius, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: planetConfig.color,
        emissive: planetConfig.emissive || 0x000000,
        emissiveIntensity: 0.2,
        roughness: 0.9,
        metalness: 0.1,
      })

      const planet = new THREE.Mesh(geometry, material)

      // Set initial position (random angle around orbit)
      const initialAngle = Math.random() * Math.PI * 2
      this.orbitAngles.push(initialAngle)

      planet.position.x = Math.cos(initialAngle) * planetConfig.orbitRadius
      planet.position.z = Math.sin(initialAngle) * planetConfig.orbitRadius

      this.planets.push(planet)
      this.scene.add(planet)

      // Create atmosphere for planets that have one
      if (planetConfig.hasAtmosphere) {
        const atmosphereGeometry = new THREE.SphereGeometry(planetConfig.radius * 1.15, 32, 32)
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
          color: planetConfig.atmosphereColor || 0x4488ff,
          transparent: true,
          opacity: 0.2,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        })

        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
        atmosphere.position.copy(planet.position)
        this.atmospheres.push(atmosphere)
        this.scene.add(atmosphere)
      } else {
        // Push null for planets without atmosphere to maintain indexing
        this.atmospheres.push(null as any)
      }
    })
  }

  public update(deltaTime: number, starRadius: number = 4.0): void {
    this.time += deltaTime

    // Update each planet's orbit
    this.planets.forEach((planet, index) => {
      // Skip if engulfed
      if (this.engulfedPlanets.has(index)) {
        return
      }

      const planetConfig = this.planetData[index]

      // Update orbit angle
      this.orbitAngles[index] += deltaTime * planetConfig.orbitSpeed * 0.1

      // Calculate new position
      const x = Math.cos(this.orbitAngles[index]) * planetConfig.orbitRadius
      const z = Math.sin(this.orbitAngles[index]) * planetConfig.orbitRadius

      planet.position.set(x, 0, z)

      // Update atmosphere position if it exists
      if (this.atmospheres[index]) {
        this.atmospheres[index].position.copy(planet.position)
      }

      // Rotate planet on its axis
      planet.rotation.y += deltaTime * 0.5

      // Check if planet should be engulfed by star
      const distanceFromStar = Math.sqrt(x * x + z * z)
      if (distanceFromStar < starRadius * 1.2 && !this.engulfedPlanets.has(index)) {
        this.engulfPlanet(index)
      }
    })

    // Handle fading
    if (this.isFading) {
      this.fadeProgress += deltaTime * 2.0 // Fade over 0.5 seconds
      if (this.fadeProgress >= 1.0) {
        this.fadeProgress = 1.0
        this.isFading = false
      }

      const opacity = this.isVisible ? this.fadeProgress : (1.0 - this.fadeProgress)

      this.planets.forEach((planet, index) => {
        if (!this.engulfedPlanets.has(index)) {
          const material = planet.material as THREE.MeshStandardMaterial
          material.transparent = true
          material.opacity = opacity

          if (this.atmospheres[index]) {
            const atmMaterial = this.atmospheres[index].material as THREE.MeshBasicMaterial
            atmMaterial.opacity = 0.2 * opacity
          }
        }
      })

      this.orbits.forEach((orbit) => {
        const material = orbit.material as THREE.LineBasicMaterial
        material.opacity = 0.3 * opacity
      })
    }
  }

  private engulfPlanet(index: number): void {
    this.engulfedPlanets.add(index)

    const planet = this.planets[index]
    const atmosphere = this.atmospheres[index]

    // Dramatic fade out and removal
    let fadeTime = 0
    const fadeDuration = 2.0

    const fadeInterval = setInterval(() => {
      fadeTime += 0.016
      const fadeProgress = fadeTime / fadeDuration

      if (fadeProgress < 1.0) {
        const opacity = 1.0 - fadeProgress
        const material = planet.material as THREE.MeshStandardMaterial
        material.transparent = true
        material.opacity = opacity

        // Make planet glow as it's engulfed
        material.emissiveIntensity = fadeProgress * 2.0

        if (atmosphere) {
          const atmMaterial = atmosphere.material as THREE.MeshBasicMaterial
          atmMaterial.opacity = 0.2 * opacity
        }

        // Planet gets pulled toward star center
        planet.position.multiplyScalar(0.98)
        if (atmosphere) {
          atmosphere.position.copy(planet.position)
        }
      } else {
        // Remove planet
        this.scene.remove(planet)
        if (atmosphere) {
          this.scene.remove(atmosphere)
        }
        clearInterval(fadeInterval)
      }
    }, 16)
  }

  public show(): void {
    this.isVisible = true
    this.isFading = true
    this.fadeProgress = 0
  }

  public hide(): void {
    this.isVisible = false
    this.isFading = true
    this.fadeProgress = 0
  }

  public dispose(): void {
    this.planets.forEach((planet) => {
      planet.geometry.dispose()
      ;(planet.material as THREE.Material).dispose()
      this.scene.remove(planet)
    })

    this.atmospheres.forEach((atmosphere) => {
      if (atmosphere) {
        atmosphere.geometry.dispose()
        ;(atmosphere.material as THREE.Material).dispose()
        this.scene.remove(atmosphere)
      }
    })

    this.orbits.forEach((orbit) => {
      orbit.geometry.dispose()
      ;(orbit.material as THREE.Material).dispose()
      this.scene.remove(orbit)
    })
  }
}
