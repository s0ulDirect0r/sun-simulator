import * as THREE from 'three'

export class NeutronStar {
  private scene: THREE.Scene
  private camera: THREE.Camera

  // Core neutron star
  public surface!: THREE.Mesh // Public for debug toggles
  private surfaceMaterial!: THREE.ShaderMaterial
  private neutronStarRadius: number = 1.5 // Tiny compared to black hole (represents ~10-20km)

  // Pulsar beams (rotating lighthouse effect)
  public pulsarBeamTop!: THREE.Mesh // Public for debug toggles
  public pulsarBeamBottom!: THREE.Mesh // Public for debug toggles
  private pulsarBeamMaterial!: THREE.ShaderMaterial
  private beamLength: number = 300.0 // Long beams for dramatic effect

  // Magnetic field visualization
  public magneticFieldLines!: THREE.Group // Public for debug toggles

  // Accretion "hotspots" on surface
  private hotspotLight1!: THREE.PointLight
  private hotspotLight2!: THREE.PointLight

  private time: number = 0
  private rotationSpeed: number = 30.0 // 30 rotations per second (millisecond pulsar!)
  private beamAngle: number = 0 // Current rotation angle of pulsar beams

  // Mass growth tracking
  private currentMass: number = 1.4 // Typical neutron star mass (1.4 solar masses)
  private baseRadius: number = 1.5
  private lastLoggedMass: number = 1.4

  private formationProgress: number = 0
  private formationDuration: number = 4.0
  private isForming: boolean = true

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene
    this.camera = camera

    this.createSurface()
    this.createPulsarBeams()
    this.createMagneticField()
    this.createHotspots()
  }

  private createSurface(): void {
    // Neutron star surface - incredibly dense, small sphere
    const geometry = new THREE.SphereGeometry(this.neutronStarRadius, 64, 64)

    // Create shader material for neutron star surface
    this.surfaceMaterial = this.createSurfaceMaterial()

    this.surface = new THREE.Mesh(geometry, this.surfaceMaterial)
    this.surface.renderOrder = 1

    this.scene.add(this.surface)

    console.log(`Neutron star created: radius=${this.neutronStarRadius}`)
  }

  private createSurfaceMaterial(): THREE.ShaderMaterial {
    // Neutron star surface shader with extreme brightness and color
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        glowIntensity: { value: 0.0 }, // Start at 0 for formation fade-in
        rotationAngle: { value: 0.0 },
        cameraPosition: { value: this.camera.position }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float glowIntensity;
        uniform float rotationAngle;
        uniform vec3 cameraPosition;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          // Neutron star color - bluish white (extremely hot surface)
          vec3 baseColor = vec3(0.8, 0.9, 1.0);

          // Add magnetic pole hotspots (rotating with star)
          float lat = asin(vPosition.y / length(vPosition));
          float lon = atan(vPosition.z, vPosition.x) + rotationAngle;

          // Hotspots near magnetic poles (offset from rotation axis)
          float poleOffset = 0.3; // Magnetic axis tilted from rotation axis
          float hotspot1 = smoothstep(0.3, 0.0, distance(lat, 1.3 - poleOffset));
          float hotspot2 = smoothstep(0.3, 0.0, distance(lat, -1.3 + poleOffset));

          // Add hotspot glow
          vec3 hotspotColor = vec3(1.0, 0.8, 0.6); // Warmer color for accreting material
          float hotspotIntensity = (hotspot1 + hotspot2) * 0.5;
          vec3 color = mix(baseColor, hotspotColor, hotspotIntensity);

          // Fresnel effect for limb brightening
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.0);

          // Add surface texture variation (crustal features)
          float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233)) * 43758.5453) * 0.5 + 0.5);
          float surfaceDetail = noise * 0.1;

          // Combine effects
          vec3 finalColor = color + fresnel * baseColor * 0.5 + surfaceDetail;

          gl_FragColor = vec4(finalColor * glowIntensity, 1.0);
        }
      `,
      transparent: false,
      side: THREE.FrontSide
    })
  }

  private createPulsarBeams(): void {
    // Create narrow, intense pulsar beams (lighthouse effect)
    // Much narrower than black hole jets
    const baseRadius = this.neutronStarRadius * 0.05  // Very narrow beams
    const tipRadius = this.neutronStarRadius * 0.15   // Slight widening
    const radialSegments = 12
    const heightSegments = 32

    const geometry = new THREE.CylinderGeometry(
      baseRadius,
      tipRadius,
      this.beamLength,
      radialSegments,
      heightSegments
    )

    this.pulsarBeamMaterial = this.createPulsarBeamMaterial()

    // Top beam
    this.pulsarBeamTop = new THREE.Mesh(geometry.clone(), this.pulsarBeamMaterial)
    this.pulsarBeamTop.position.set(0, this.neutronStarRadius + this.beamLength / 2, 0)
    this.pulsarBeamTop.renderOrder = 4
    this.scene.add(this.pulsarBeamTop)

    // Bottom beam
    this.pulsarBeamBottom = new THREE.Mesh(geometry.clone(), this.pulsarBeamMaterial.clone())
    this.pulsarBeamBottom.position.set(0, -this.neutronStarRadius - this.beamLength / 2, 0)
    this.pulsarBeamBottom.rotation.x = Math.PI
    this.pulsarBeamBottom.renderOrder = 4
    this.scene.add(this.pulsarBeamBottom)

    console.log(`Pulsar beams created: length=${this.beamLength}`)
  }

  private createPulsarBeamMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        opacity: { value: 0.0 }, // Start invisible for formation
        beamLength: { value: this.beamLength },
        glowIntensity: { value: 3.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform float beamLength;
        uniform float glowIntensity;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Pulsar beam color - bright blue-white (radio/optical emission)
          vec3 beamColor = vec3(0.7, 0.8, 1.0);

          // Distance from center (radial)
          float radialDist = length(vUv - vec2(0.5, 0.5)) * 2.0;

          // Height along beam (0 = base, 1 = tip)
          float heightFactor = vPosition.y / beamLength + 0.5;

          // Beam intensity - bright at center, fades at edges
          float beamIntensity = 1.0 - smoothstep(0.0, 1.0, radialDist);
          beamIntensity *= smoothstep(1.0, 0.3, heightFactor); // Fade towards tip

          // Pulsing effect
          float pulse = 0.7 + 0.3 * sin(time * 10.0);
          beamIntensity *= pulse;

          // Apply glow
          vec3 finalColor = beamColor * glowIntensity * beamIntensity;
          float finalOpacity = beamIntensity * opacity;

          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  }

  private createMagneticField(): void {
    // Create magnetic field lines emanating from poles
    this.magneticFieldLines = new THREE.Group()

    const numLines = 12
    const fieldColor = new THREE.Color(0x00ffff) // Cyan for magnetic field

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2
      const curve = this.createFieldLineCurve(angle)

      const points = curve.getPoints(50)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)

      const material = new THREE.LineBasicMaterial({
        color: fieldColor,
        transparent: true,
        opacity: 0.0, // Start invisible for formation
        linewidth: 1
      })

      const line = new THREE.Line(geometry, material)
      this.magneticFieldLines.add(line)
    }

    this.scene.add(this.magneticFieldLines)
    console.log(`Magnetic field lines created: ${numLines} lines`)
  }

  private createFieldLineCurve(azimuthAngle: number): THREE.CatmullRomCurve3 {
    // Create a curved path for magnetic field line
    const points: THREE.Vector3[] = []
    const numPoints = 20
    const maxRadius = this.neutronStarRadius * 15 // Field extends far from star

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1)

      // Field line starts at pole, loops out and back
      const polarAngle = Math.PI * t // 0 to π (north to south pole)

      // Distance from star (loops out and back in)
      const radius = this.neutronStarRadius + Math.sin(polarAngle) * maxRadius

      const x = radius * Math.sin(polarAngle) * Math.cos(azimuthAngle)
      const y = radius * Math.cos(polarAngle)
      const z = radius * Math.sin(polarAngle) * Math.sin(azimuthAngle)

      points.push(new THREE.Vector3(x, y, z))
    }

    return new THREE.CatmullRomCurve3(points)
  }

  private createHotspots(): void {
    // Point lights at magnetic poles where material accretes
    this.hotspotLight1 = new THREE.PointLight(0xffaa66, 2.0, 50)
    this.hotspotLight1.position.set(0, this.neutronStarRadius * 0.9, 0)
    this.scene.add(this.hotspotLight1)

    this.hotspotLight2 = new THREE.PointLight(0xffaa66, 2.0, 50)
    this.hotspotLight2.position.set(0, -this.neutronStarRadius * 0.9, 0)
    this.scene.add(this.hotspotLight2)
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    // Rapid rotation
    this.beamAngle += deltaTime * this.rotationSpeed
    this.surface.rotation.y = this.beamAngle

    // Update surface shader
    this.surfaceMaterial.uniforms.time.value = this.time
    this.surfaceMaterial.uniforms.rotationAngle.value = this.beamAngle

    // Rotate pulsar beams with magnetic axis (tilted from rotation axis)
    const tiltAngle = 0.3 // Magnetic axis tilt
    this.pulsarBeamTop.rotation.z = Math.sin(this.beamAngle) * tiltAngle
    this.pulsarBeamTop.rotation.x = Math.cos(this.beamAngle) * tiltAngle
    this.pulsarBeamBottom.rotation.z = Math.sin(this.beamAngle) * tiltAngle
    this.pulsarBeamBottom.rotation.x = Math.PI + Math.cos(this.beamAngle) * tiltAngle

    // Rotate magnetic field lines
    this.magneticFieldLines.rotation.y = this.beamAngle

    // Rotate hotspot lights with star
    const hotspotAngle = this.beamAngle + Math.PI / 4
    this.hotspotLight1.position.set(
      Math.sin(hotspotAngle) * this.neutronStarRadius * 0.9,
      this.neutronStarRadius * 0.8,
      Math.cos(hotspotAngle) * this.neutronStarRadius * 0.9
    )
    this.hotspotLight2.position.set(
      -Math.sin(hotspotAngle) * this.neutronStarRadius * 0.9,
      -this.neutronStarRadius * 0.8,
      -Math.cos(hotspotAngle) * this.neutronStarRadius * 0.9
    )

    // Handle formation animation
    if (this.isForming) {
      this.formationProgress += deltaTime / this.formationDuration

      if (this.formationProgress >= 1.0) {
        this.formationProgress = 1.0
        this.isForming = false
      }

      // Fade in all elements
      this.surfaceMaterial.uniforms.glowIntensity.value = this.formationProgress * 10.0

      // Fade in pulsar beams
      this.pulsarBeamMaterial.uniforms.opacity.value = this.formationProgress * 0.9
      ;(this.pulsarBeamBottom.material as THREE.ShaderMaterial).uniforms.opacity.value = this.formationProgress * 0.9

      // Fade in magnetic field lines
      this.magneticFieldLines.children.forEach((child: THREE.Object3D) => {
        const line = child as THREE.Line
        const material = line.material as THREE.LineBasicMaterial
        material.opacity = this.formationProgress * 0.3
      })

      // Fade in hotspot lights
      this.hotspotLight1.intensity = this.formationProgress * 2.0
      this.hotspotLight2.intensity = this.formationProgress * 2.0
    }

    // Update pulsar beam shaders
    this.pulsarBeamMaterial.uniforms.time.value = this.time
    ;(this.pulsarBeamBottom.material as THREE.ShaderMaterial).uniforms.time.value = this.time
  }

  public addMass(deltaMass: number): void {
    this.currentMass += deltaMass

    // Neutron stars have a maximum mass (~2-3 solar masses)
    // Beyond that they collapse to black holes (not implemented yet)
    const clampedMass = Math.min(this.currentMass, 2.5)

    // Slight radius increase (neutron stars don't grow much)
    const newRadius = this.baseRadius * (1.0 + (clampedMass - 1.4) * 0.1)
    this.neutronStarRadius = newRadius

    // Scale surface
    this.surface.scale.setScalar(newRadius / this.baseRadius)

    // Increase hotspot intensity with accretion
    const accretionScale = 1.0 + (clampedMass - 1.4) * 2.0
    this.hotspotLight1.intensity = 2.0 * accretionScale
    this.hotspotLight2.intensity = 2.0 * accretionScale

    // Only log every 0.05 mass increase
    if (this.currentMass - this.lastLoggedMass >= 0.05) {
      console.log(`Neutron star mass: ${this.currentMass.toFixed(2)}, radius: ${newRadius.toFixed(2)}`)
      this.lastLoggedMass = this.currentMass
    }
  }

  public getSurfaceRadius(): number {
    return this.neutronStarRadius
  }

  public getCurrentMass(): number {
    return this.currentMass
  }

  public dispose(): void {
    this.surface.geometry.dispose()
    this.surfaceMaterial.dispose()

    this.pulsarBeamTop.geometry.dispose()
    this.pulsarBeamMaterial.dispose()
    this.pulsarBeamBottom.geometry.dispose()
    ;(this.pulsarBeamBottom.material as THREE.Material).dispose()

    this.magneticFieldLines.children.forEach((child: THREE.Object3D) => {
      const line = child as THREE.Line
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })

    this.scene.remove(this.surface)
    this.scene.remove(this.pulsarBeamTop)
    this.scene.remove(this.pulsarBeamBottom)
    this.scene.remove(this.magneticFieldLines)
    this.scene.remove(this.hotspotLight1)
    this.scene.remove(this.hotspotLight2)
  }
}
