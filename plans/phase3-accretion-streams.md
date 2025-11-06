# Phase 3: Dynamic Accretion Streams - Implementation Specification

**Created:** 2025-01-06
**Status:** In Progress
**Bead:** sun-simulator-7q4

## Overview

Create realistic black hole accretion with sporadic particle chunks spiraling from the supernova remnant into the event horizon, with the black hole growing as it consumes mass.

## Physics Foundation

- **Gravitational attraction**: Simplified inverse-square force (F = G\*M/r²)
- **Angular momentum**: Particles spiral inward, not fall straight down
- **Mass growth**: Event horizon scales as Rs ∝ M (realistic accretion physics)
- **Sporadic chunks**: Turbulent, clumpy accretion (astrophysically accurate)

---

## Implementation Tasks

### Phase 3A: Foundation (3-4 hours)

#### Task 1: Modify Remnant Lifecycle ✅
**Bead:** TBD
**Files:** `main.ts` (line ~465)

**Goal:** Keep supernova remnant alive during Black Hole phase instead of disposing it

**Changes:**
- DON'T dispose supernova remnant when black hole starts
- Keep remnant reference alive during Black Hole phase
- Continue updating remnant in BLACK_HOLE phase update loop

**Status:** COMPLETED

---

#### Task 2: Implement Gravitational Attraction
**Bead:** TBD
**Files:** `SupernovaRemnant.ts`

**Goal:** Pull particles toward black hole with simplified gravitational physics

**New Properties:**
```typescript
private isBeingAccreted: boolean = false
private blackHolePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
private accretionStrength: number = 0 // Gravitational constant
private eventHorizonRadius: number = 5.0
```

**New Method:**
```typescript
public enableAccretion(blackHolePosition: THREE.Vector3, strength: number, horizonRadius: number): void {
  this.isBeingAccreted = true
  this.blackHolePosition.copy(blackHolePosition)
  this.accretionStrength = strength
  this.eventHorizonRadius = horizonRadius
}
```

**Modify update():**
```typescript
if (this.isBeingAccreted) {
  for (let i = 0; i < this.particleCount; i++) {
    const i3 = i * 3

    // Calculate vector to black hole
    const dx = this.blackHolePosition.x - positions[i3]
    const dy = this.blackHolePosition.y - positions[i3 + 1]
    const dz = this.blackHolePosition.z - positions[i3 + 2]
    const distanceSquared = dx*dx + dy*dy + dz*dz
    const distance = Math.sqrt(distanceSquared)

    // Only apply gravity within accretion radius (performance optimization)
    if (distance < 100) {
      // Gravitational acceleration (simplified)
      const acceleration = this.accretionStrength / distanceSquared

      // Normalize direction and apply force
      const ax = (dx / distance) * acceleration
      const ay = (dy / distance) * acceleration
      const az = (dz / distance) * acceleration

      // Update velocities (add gravity)
      velocities[i3] += ax
      velocities[i3 + 1] += ay
      velocities[i3 + 2] += az
    }
  }
}
```

**Integration in main.ts:**
```typescript
// In startBlackHole():
if (this.supernovaRemnant && this.blackHole) {
  this.supernovaRemnant.enableAccretion(
    new THREE.Vector3(0, 0, 0),
    0.01, // accretion strength
    5.0   // event horizon radius
  )
}
```

---

#### Task 3: Particle Consumption System
**Bead:** TBD
**Files:** `SupernovaRemnant.ts`, `BlackHole.ts`

**Goal:** Remove particles when they reach event horizon, track consumed mass

**New Properties in SupernovaRemnant:**
```typescript
private consumedParticles: Set<number> = new Set()
private onParticleConsumed?: (mass: number) => void
```

**New Methods:**
```typescript
public setConsumptionCallback(callback: (mass: number) => void): void {
  this.onParticleConsumed = callback
}
```

**Consumption Detection in update():**
```typescript
// Check if particle reached event horizon
if (distance < this.eventHorizonRadius && !this.consumedParticles.has(i)) {
  this.consumedParticles.add(i)

  // Notify black hole of mass consumption
  if (this.onParticleConsumed) {
    this.onParticleConsumed(0.0001) // Each particle = 0.0001 mass units
  }

  // Make particle invisible (move far away)
  positions[i3] = 10000
  positions[i3 + 1] = 10000
  positions[i3 + 2] = 10000
}
```

**Integration in main.ts:**
```typescript
// When creating black hole:
if (this.supernovaRemnant && this.blackHole) {
  this.supernovaRemnant.setConsumptionCallback((mass) => {
    this.blackHole.addMass(mass)
  })
}
```

---

### Phase 3B: Orbital Mechanics (2-3 hours)

#### Task 4: Add Spiral Motion
**Bead:** TBD
**Files:** `SupernovaRemnant.ts`

**Goal:** Particles spiral inward rather than fall straight down

**Approach:**
Add tangential velocity component perpendicular to radial direction

**Implementation in update():**
```typescript
// After calculating radial gravity, add orbital component
if (this.isBeingAccreted && distance < 100) {
  // Calculate tangential direction (perpendicular to radial)
  const radialX = dx / distance
  const radialY = dy / distance
  const radialZ = dz / distance

  // Use up vector (0,1,0) to create perpendicular direction
  // tangent = radial × up
  const tangentX = radialY * 0 - radialZ * 1
  const tangentY = radialZ * 0 - radialX * 0
  const tangentZ = radialX * 1 - radialY * 0

  // Normalize tangent
  const tangentLength = Math.sqrt(tangentX*tangentX + tangentY*tangentY + tangentZ*tangentZ)
  if (tangentLength > 0.001) {
    const txNorm = tangentX / tangentLength
    const tyNorm = tangentY / tangentLength
    const tzNorm = tangentZ / tangentLength

    // Add orbital velocity (Keplerian: v = sqrt(GM/r))
    const orbitalSpeed = Math.sqrt(this.accretionStrength / distance) * 0.5
    velocities[i3] += txNorm * orbitalSpeed
    velocities[i3 + 1] += tyNorm * orbitalSpeed
    velocities[i3 + 2] += tzNorm * orbitalSpeed
  }
}
```

---

#### Task 5: Black Hole Mass Growth
**Bead:** TBD
**Files:** `BlackHole.ts`

**Goal:** Scale event horizon radius as black hole consumes mass

**New Properties:**
```typescript
private currentMass: number = 1.0 // Initial mass in solar masses
private baseRadius: number = 5.0 // Initial Schwarzschild radius
```

**New Method:**
```typescript
public addMass(deltaMass: number): void {
  this.currentMass += deltaMass

  // Schwarzschild radius: Rs = 2GM/c² (simplified: Rs ∝ M)
  const newRadius = this.baseRadius * this.currentMass

  // Clamp maximum growth to prevent excessive scaling
  const clampedRadius = Math.min(newRadius, this.baseRadius * 3.0) // Max 3x growth

  // Scale event horizon sphere
  this.eventHorizon.scale.setScalar(clampedRadius / this.baseRadius)

  // Update shader uniform for Schwarzschild radius
  this.eventHorizonMaterial.uniforms.schwarzschildRadius.value = clampedRadius
  this.blackHoleRadius = clampedRadius

  // Update accretion disk size (optional - can defer to Phase 3C)
  // this.updateAccretionDiskSize(clampedRadius)

  console.log(`Black hole mass: ${this.currentMass.toFixed(4)}, radius: ${clampedRadius.toFixed(2)}`)
}
```

---

### Phase 3C: Polish & New Sources (3-4 hours)

#### Task 6: Create AccretionSource Class
**Bead:** TBD
**New File:** `AccretionSource.ts`

**Goal:** Create sporadic "chunks" of infalling matter from various distances

**Class Structure:**
```typescript
export class AccretionSource {
  private scene: THREE.Scene
  private particles: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private particleCount: number = 500
  private maxActiveParticles: number = 200
  private spawnPosition: THREE.Vector3
  private spawnInterval: number = 2.0
  private spawnTimer: number = 0
  private positions: Float32Array
  private velocities: Float32Array
  private lifetimes: Float32Array
  private blackHolePosition: THREE.Vector3
  private accretionStrength: number

  constructor(scene: THREE.Scene, position: THREE.Vector3, color: number, accretionStrength: number) {
    this.scene = scene
    this.spawnPosition = position.clone()
    this.blackHolePosition = new THREE.Vector3(0, 0, 0)
    this.accretionStrength = accretionStrength

    // Initialize particle system
    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.particleCount * 3)
    this.velocities = new Float32Array(this.particleCount * 3)
    this.lifetimes = new Float32Array(this.particleCount)

    // Set all particles as inactive initially (lifetime = 0)
    this.lifetimes.fill(0)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

    this.material = new THREE.PointsMaterial({
      size: 0.4,
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.particles = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.particles)
  }

  public update(deltaTime: number): void {
    this.spawnTimer += deltaTime

    // Spawn new chunk
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnChunk()
      this.spawnTimer = 0
      // Randomize next interval (1-4 seconds for sporadic effect)
      this.spawnInterval = 1.0 + Math.random() * 3.0
    }

    // Update all active particles
    for (let i = 0; i < this.particleCount; i++) {
      if (this.lifetimes[i] <= 0) continue // Skip inactive particles

      const i3 = i * 3

      // Apply gravitational attraction (same as SupernovaRemnant)
      const dx = this.blackHolePosition.x - this.positions[i3]
      const dy = this.blackHolePosition.y - this.positions[i3 + 1]
      const dz = this.blackHolePosition.z - this.positions[i3 + 2]
      const distanceSquared = dx*dx + dy*dy + dz*dz
      const distance = Math.sqrt(distanceSquared)

      if (distance < 100) {
        const acceleration = this.accretionStrength / distanceSquared
        const ax = (dx / distance) * acceleration
        const ay = (dy / distance) * acceleration
        const az = (dz / distance) * acceleration

        this.velocities[i3] += ax
        this.velocities[i3 + 1] += ay
        this.velocities[i3 + 2] += az

        // Add spiral motion (simplified)
        // TODO: Implement same tangential velocity as SupernovaRemnant
      }

      // Update position
      this.positions[i3] += this.velocities[i3]
      this.positions[i3 + 1] += this.velocities[i3 + 1]
      this.positions[i3 + 2] += this.velocities[i3 + 2]

      // Deactivate if consumed (reached event horizon)
      if (distance < 5.0) {
        this.lifetimes[i] = 0
        this.positions[i3] = 10000
        this.positions[i3 + 1] = 10000
        this.positions[i3 + 2] = 10000
      }

      // Age particles
      this.lifetimes[i] -= deltaTime
    }

    this.geometry.attributes.position.needsUpdate = true
  }

  private spawnChunk(): void {
    const chunkSize = 20 + Math.floor(Math.random() * 30) // 20-50 particles
    let spawned = 0

    for (let i = 0; i < this.particleCount && spawned < chunkSize; i++) {
      if (this.lifetimes[i] > 0) continue // Skip active particles

      const i3 = i * 3

      // Spawn at source position with random offset
      const offsetRadius = 5.0
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.positions[i3] = this.spawnPosition.x + Math.sin(phi) * Math.cos(theta) * offsetRadius
      this.positions[i3 + 1] = this.spawnPosition.y + Math.sin(phi) * Math.sin(theta) * offsetRadius
      this.positions[i3 + 2] = this.spawnPosition.z + Math.cos(phi) * offsetRadius

      // Give slight random initial velocity toward black hole
      const dx = -this.spawnPosition.x
      const dy = -this.spawnPosition.y
      const dz = -this.spawnPosition.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)

      const speed = 0.05 + Math.random() * 0.1
      this.velocities[i3] = (dx / dist) * speed + (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 1] = (dy / dist) * speed + (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 2] = (dz / dist) * speed + (Math.random() - 0.5) * 0.02

      // Set lifetime (particles exist for 30 seconds max)
      this.lifetimes[i] = 30.0

      spawned++
    }
  }

  public dispose(): void {
    this.scene.remove(this.particles)
    this.geometry.dispose()
    this.material.dispose()
  }
}
```

**Integration in main.ts:**
```typescript
// Add property:
private accretionSources: AccretionSource[] = []

// In startBlackHole():
const sourcePositions = [
  new THREE.Vector3(50, 20, 30),
  new THREE.Vector3(-40, -10, 50),
  new THREE.Vector3(30, -30, -40),
]

sourcePositions.forEach(pos => {
  const source = new AccretionSource(this.scene, pos, 0xff6600, 0.01)
  this.accretionSources.push(source)
})

// In BLACK_HOLE phase update:
this.accretionSources.forEach(source => source.update(deltaTime))

// In cleanup/reset:
this.accretionSources.forEach(source => source.dispose())
this.accretionSources = []
```

---

#### Task 7: Visual Effects
**Bead:** TBD
**Files:** `SupernovaRemnant.ts`, `AccretionSource.ts`

**Goal:** Add heat glow, size increase, and color shifts as particles approach event horizon

**Heat Glow in update():**
```typescript
// After gravity calculation, modify particle appearance based on proximity
if (distance < 20) {
  // Particles heat up as they approach
  const heatFactor = 1 - (distance / 20)

  // Shift color to white-hot
  const colorIndex = i * 3
  colors[colorIndex] = THREE.MathUtils.lerp(colors[colorIndex], 1.0, heatFactor)
  colors[colorIndex + 1] = THREE.MathUtils.lerp(colors[colorIndex + 1], 0.9, heatFactor)
  colors[colorIndex + 2] = THREE.MathUtils.lerp(colors[colorIndex + 2], 0.5, heatFactor)

  // Increase particle size
  sizes[i] = sizes[i] * (1 + heatFactor * 0.5)

  // Mark color/size buffer for update
  this.geometry.attributes.color.needsUpdate = true
  // Note: Size attribute updates require custom handling in PointsMaterial
}
```

---

#### Task 8: Performance Optimization
**Bead:** TBD
**Files:** `SupernovaRemnant.ts`, `AccretionSource.ts`

**Goal:** Ensure 60 FPS with 30k+ particles

**Optimizations:**
1. **Distance culling**: Only apply gravity within 100 units
2. **Update throttling**: Update distant particles every other frame
3. **Particle count tuning**: Reduce if performance issues
4. **Velocity clamping**: Prevent extreme speeds causing instability

**Example throttling:**
```typescript
// In update():
private updateFrame: number = 0

this.updateFrame++
const shouldUpdateAll = this.updateFrame % 2 === 0

for (let i = 0; i < this.particleCount; i++) {
  const distance = calculateDistance(i)

  // Always update close particles, throttle distant ones
  if (distance < 50 || shouldUpdateAll) {
    // Apply gravity...
  }
}
```

---

## Tunable Physics Constants

```typescript
const PHYSICS_CONSTANTS = {
  ACCRETION_STRENGTH: 0.01,        // Base gravitational constant
  ORBITAL_VELOCITY_SCALE: 0.5,     // How much spiral vs direct fall
  EVENT_HORIZON_RADIUS: 5.0,       // Starting black hole size
  HEAT_GLOW_DISTANCE: 20.0,        // Start glowing when within 20 units
  MASS_PER_PARTICLE: 0.0001,       // Mass added per consumed particle
  MAX_MASS_MULTIPLIER: 3.0,        // Black hole can grow up to 3x initial size
  PARTICLE_LIFETIME: 30.0,         // Max seconds before particle fades
  CHUNK_SIZE_MIN: 20,              // Min particles per chunk
  CHUNK_SIZE_MAX: 50,              // Max particles per chunk
  CHUNK_SPAWN_INTERVAL_MIN: 1.0,   // Min seconds between chunks
  CHUNK_SPAWN_INTERVAL_MAX: 4.0,   // Max seconds between chunks
  ACCRETION_RADIUS: 100.0,         // Only apply gravity within this distance
}
```

---

## Testing Checkpoints

1. ✅ **After Task 1**: Remnant should persist when black hole forms
2. **After Task 2**: Particles should visibly pull toward center
3. **After Task 3**: Particles should disappear at event horizon, console logs mass increase
4. **After Task 4**: Particles should spiral instead of falling straight
5. **After Task 5**: Event horizon should visibly grow as it feeds
6. **After Task 6**: New chunks should spawn and spiral inward
7. **After Task 7**: Particles glow white-hot near event horizon
8. **After Task 8**: Maintains 60 FPS with all systems active

---

## Performance Targets

- **Frame rate**: 60 FPS on mid-range GPU
- **Particle count**: 30,000+ total (remnant + sources)
- **Memory**: < 200MB additional
- **Update time**: < 8ms per frame for particle physics

---

## Related Beads

- **sun-simulator-7q4** - Phase 3: Dynamic accretion streams (parent)
- **sun-simulator-gxu** - Larger event horizon exploration (ties into Task 5)
- **sun-simulator-xhn** - Black hole particle growth from offscreen (ties into Task 6)
- **sun-simulator-74a** - Phase 4: Relativistic jets (next phase)

---

## Implementation Timeline

- **Phase 3A (Foundation)**: 3-4 hours - Tasks 1-3
- **Phase 3B (Orbital Mechanics)**: 2-3 hours - Tasks 4-5
- **Phase 3C (Polish & Sources)**: 3-4 hours - Tasks 6-8
- **Total**: 8-11 hours

---

## Notes

- Physics simplified for visual drama over accuracy
- Performance optimization critical with 30k+ particles
- Mass growth clamped to prevent excessive scaling
- Sporadic chunks provide turbulent, realistic accretion aesthetic
- Heat glow creates dramatic visual feedback
