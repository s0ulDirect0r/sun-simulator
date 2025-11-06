# Plan: Phase-Aware Debug Mode Enhancement

**Created:** 2025-11-06
**Status:** Planning
**Priority:** P2 (Enhancement)

## Overview

Enhance the existing debug mode to be phase-aware, providing relevant toggles and statistics for all simulation phases (not just Black Hole phase). This will make debugging and visual tuning possible across the entire stellar lifecycle.

## Current State

### What Works
- Full debug mode for Phase 5 (Black Hole)
- Toggles for: accretion disk, jets, event horizon, lensing ring, accretion sources, supernova remnant
- Post-processing toggles: lights, bloom, film grain, vignette
- Debug overlay with stats (FPS, phase, BH mass/radius, particle counts)
- Master toggle (A key) for all elements

### Current Limitations
1. **Only Black Hole elements are toggleable** - other phases have no debug controls
2. **Stats display is Black Hole-specific** - shows "N/A" for other phases instead of relevant data
3. **No phase transition persistence** - debug state not applied when new phase objects created
4. **Private properties in other phases** - Nebula, Star, PlanetSystem meshes not accessible
5. **Static toggle list** - shows all keys regardless of phase relevance

## Goals

1. **Phase-specific toggles** - Each phase has relevant element controls
2. **Dynamic stats display** - Show appropriate metrics per phase
3. **Context-aware UI** - Debug overlay shows only available toggles for current phase
4. **Persistent debug state** - Toggle settings survive phase transitions
5. **Universal accessibility** - All major visual elements exposed for debugging

## Implementation Plan

### Phase 1: Expose Phase-Specific Properties

Make relevant properties public in each phase class for debug access.

**Files to modify:**
- `src/Nebula.ts`
- `src/Star.ts`
- `src/PlanetSystem.ts`
- `src/IgnitionBurst.ts`

**Changes:**

```typescript
// In Nebula.ts
export class Nebula {
  public particles!: THREE.Points       // Public for debug toggles
  public protostarMesh!: THREE.Mesh     // Public for debug toggles
  public protostarLight!: THREE.PointLight
  // ... rest private
}

// In Star.ts
export class Star {
  public starMesh!: THREE.Mesh          // Public for debug toggles
  public coronaParticles!: THREE.Points // Public for debug toggles
  public flareParticles!: THREE.Points  // Public for debug toggles
  // ... rest private
}

// In PlanetSystem.ts
export class PlanetSystem {
  public planets: THREE.Mesh[] = []     // Public for debug toggles
  // ... rest private
}

// In IgnitionBurst.ts
export class IgnitionBurst {
  public burstParticles!: THREE.Points  // Public for debug toggles
  public flashLight!: THREE.PointLight
  // ... rest private
}
```

### Phase 2: Add Phase-Specific Toggle Keys

Extend debug state and keyboard handlers for all phases.

**File:** `src/main.ts`

**New debug state properties:**
```typescript
private debugState = {
  // Phase 5 (existing)
  accretionDisk: true,
  jets: true,
  eventHorizon: true,
  lensingRing: true,
  accretionSources: true,
  supernovaRemnant: true,

  // Phase 1: Nebula
  nebulaParticles: true,
  protostar: true,

  // Phase 2-3: Star
  starMesh: true,
  corona: true,
  flares: true,
  planets: true,

  // Phase 4: Supernova (remnant already exists)
  supernovaFlash: true,

  // Global (existing)
  pointLight: true,
  ambientLight: true,
  bloom: true,
  filmGrain: true,
  vignette: true,
  showDebugOverlay: false,
}
```

**New keyboard mappings:**
```typescript
case '7':
  // Phase-specific toggle (context-aware)
  if (currentPhase === BLACK_HOLE) {
    // Future: toggle something else
  } else if (currentPhase === NEBULA_COLLAPSE) {
    this.debugState.nebulaParticles = !this.debugState.nebulaParticles
    this.applyDebugState()
  } else if (currentPhase === MAIN_SEQUENCE || currentPhase === RED_GIANT) {
    this.debugState.starMesh = !this.debugState.starMesh
    this.applyDebugState()
  } else if (currentPhase === SUPERNOVA) {
    this.debugState.supernovaFlash = !this.debugState.supernovaFlash
    this.applyDebugState()
  }
  break

case '8':
  // Similar phase-specific logic for secondary elements
  break

case '9':
  // Toggle planets (Phases 2-3)
  this.debugState.planets = !this.debugState.planets
  this.applyDebugState()
  break
```

### Phase 3: Make applyDebugState() Phase-Aware

Extend the existing `applyDebugState()` method to handle all phases.

**File:** `src/main.ts`

```typescript
private applyDebugState(): void {
  // Lights (global)
  this.ambientLight.intensity = this.debugState.ambientLight ? 0.5 : 0
  this.pointLight.intensity = this.debugState.pointLight ? 0.5 : 0

  // Phase 1: Nebula
  if (this.nebula) {
    this.nebula.particles.visible = this.debugState.nebulaParticles
    if (this.nebula.protostarMesh) {
      this.nebula.protostarMesh.visible = this.debugState.protostar
    }
    if (this.nebula.protostarLight) {
      this.nebula.protostarLight.intensity = this.debugState.protostar ? 4 : 0
    }
  }

  // Phase 2-3: Star
  if (this.star) {
    this.star.starMesh.visible = this.debugState.starMesh
    if (this.star.coronaParticles) {
      this.star.coronaParticles.visible = this.debugState.corona
    }
    if (this.star.flareParticles) {
      this.star.flareParticles.visible = this.debugState.flares
    }
  }

  // Planet system (Phases 2-3)
  if (this.planetSystem) {
    this.planetSystem.planets.forEach(planet => {
      planet.visible = this.debugState.planets
    })
  }

  // Phase 4: Supernova flash
  if (this.ignitionBurst) {
    // Toggle flash effects if they exist
  }

  // Phase 5: Black hole (existing implementation)
  if (this.blackHole) {
    this.blackHole.accretionDisk.visible = this.debugState.accretionDisk
    this.blackHole.jetTop.visible = this.debugState.jets
    this.blackHole.jetBottom.visible = this.debugState.jets
    this.blackHole.eventHorizon.visible = this.debugState.eventHorizon
    this.blackHole.lensingRing.visible = this.debugState.lensingRing
  }

  // Accretion sources (Phase 5)
  this.accretionSources.forEach(source => {
    source.particles.visible = this.debugState.accretionSources
  })

  // Supernova remnant (Phases 4-5)
  if (this.supernovaRemnant) {
    this.supernovaRemnant.shells.forEach(shell => {
      shell.visible = this.debugState.supernovaRemnant
    })
  }

  // Post-processing (global)
  this.bloomPass.enabled = this.debugState.bloom
  this.filmGrainPass.enabled = this.debugState.filmGrain
  this.vignettePass.enabled = this.debugState.vignette
}
```

### Phase 4: Implement Phase-Specific Stats Display

Create dynamic stats collection based on current phase.

**File:** `src/main.ts`

**Add method:**
```typescript
private getPhaseSpecificStats(): Record<string, string> {
  switch (this.currentPhase) {
    case SimulationPhase.NEBULA_COLLAPSE:
      return {
        'Collapse Progress': this.nebula ? `${(this.nebula.getCollapseProgress() * 100).toFixed(1)}%` : 'N/A',
        'Protostar Radius': this.nebula ? `${this.nebula.getProtostarRadius().toFixed(2)} units` : 'N/A',
        'Particle Count': this.nebula ? this.nebula.getParticleCount().toString() : 'N/A',
      }

    case SimulationPhase.MAIN_SEQUENCE:
      return {
        'Star Radius': this.star ? `${this.star.getRadius().toFixed(2)} units` : 'N/A',
        'Surface Temp': this.star ? `${this.star.getTemperature().toFixed(0)} K` : 'N/A',
        'Time in Phase': `${this.mainSequenceTimer.toFixed(1)} / ${this.mainSequenceDuration} sec`,
      }

    case SimulationPhase.RED_GIANT:
      return {
        'Star Radius': this.star ? `${this.star.getRadius().toFixed(2)} units` : 'N/A',
        'Expansion Progress': `${(this.redGiantTimer / this.redGiantDuration * 100).toFixed(1)}%`,
        'Engulfed Planets': this.planetSystem ? this.planetSystem.getEngulfedCount().toString() : '0',
      }

    case SimulationPhase.SUPERNOVA:
      return {
        'Explosion Progress': `${(this.supernovaTimer / this.supernovaDuration * 100).toFixed(1)}%`,
        'Shockwave Radius': this.supernovaRemnant ? `${this.supernovaRemnant.getExpansionRadius().toFixed(2)} units` : 'N/A',
        'Flash Intensity': this.star ? `${(this.star.getCameraShakeIntensity() * 100).toFixed(0)}%` : '0%',
      }

    case SimulationPhase.BLACK_HOLE:
      return {
        'Mass': this.blackHole ? `${this.blackHole.getCurrentMass().toFixed(2)} M☉` : 'N/A',
        'Event Horizon': this.blackHole ? `${this.blackHole.getEventHorizonRadius().toFixed(2)} units` : 'N/A',
        'Accreting Particles': this.accretionSources.reduce((sum, s) => sum + s.getActiveParticleCount(), 0).toString(),
      }

    default:
      return {}
  }
}
```

**Modify updateDebugStats():**
```typescript
private updateDebugStats(): void {
  if (!this.debugState.showDebugOverlay) return

  // FPS (unchanged)
  // ...

  // Phase name (unchanged)
  // ...

  // Phase-specific stats (NEW)
  const stats = this.getPhaseSpecificStats()
  // Update corresponding HTML elements dynamically
  // (May need to restructure HTML to support dynamic stat fields)
}
```

### Phase 5: Dynamic Toggle List in Overlay

Update debug overlay HTML to show context-aware toggle keys.

**File:** `index.html` or dynamically generated in `main.ts`

**Approach:** Generate toggle list dynamically based on current phase:

```typescript
private updateDebugToggleList(): void {
  const toggleList = document.getElementById('debug-toggle-list')
  if (!toggleList) return

  let keysHtml = 'D = This overlay<br>'

  // Add phase-specific keys
  switch (this.currentPhase) {
    case SimulationPhase.NEBULA_COLLAPSE:
      keysHtml += '7 = Nebula particles<br>8 = Protostar<br>'
      break
    case SimulationPhase.MAIN_SEQUENCE:
    case SimulationPhase.RED_GIANT:
      keysHtml += '7 = Star mesh<br>8 = Corona<br>9 = Planets<br>'
      break
    case SimulationPhase.SUPERNOVA:
      keysHtml += '6 = Remnant<br>7 = Flash effects<br>'
      break
    case SimulationPhase.BLACK_HOLE:
      keysHtml += '1 = Accretion disk<br>2 = Jets<br>3 = Event horizon<br>'
      keysHtml += '4 = Lensing ring<br>5 = Accretion sources<br>6 = Remnant<br>'
      break
  }

  // Global keys (always shown)
  keysHtml += 'L = Lights<br>B = Bloom<br>G = Film grain<br>V = Vignette<br>A = Toggle all'

  toggleList.innerHTML = keysHtml
}
```

Call this when phase changes or overlay is shown.

### Phase 6: Apply Debug State on Phase Transitions

Ensure debug toggles persist when transitioning between phases.

**File:** `src/main.ts`

**Modify phase transition methods:**
```typescript
private transitionToMainSequence(): void {
  // ... existing code to create star ...
  this.star = new Star(this.scene, ...)

  // Apply current debug state to new objects
  this.applyDebugState()
}

private transitionToBlackHole(): void {
  // ... existing code to create black hole ...
  this.blackHole = new BlackHole(this.scene, this.camera)

  // Apply current debug state to new objects
  this.applyDebugState()
}

// Repeat for all phase transitions
```

### Phase 7: Add Missing Getter Methods

Add methods to phase classes to support stats display.

**Files to modify:** Nebula.ts, Star.ts, PlanetSystem.ts, SupernovaRemnant.ts

**Examples:**
```typescript
// In Nebula.ts
public getCollapseProgress(): number {
  return this.collapseProgress / this.collapseDuration
}

public getProtostarRadius(): number {
  return this.protostarRadius
}

public getParticleCount(): number {
  return this.particleCount
}

// In Star.ts
public getRadius(): number {
  return this.currentRadius
}

public getTemperature(): number {
  return this.surfaceTemperature
}

// In PlanetSystem.ts
public getEngulfedCount(): number {
  return this.planets.filter(p => p.userData.engulfed).length
}

// In SupernovaRemnant.ts
public getExpansionRadius(): number {
  return this.expansionSpeed * this.time
}
```

### Phase 8: Optional Enhancement - Freeze Phase

Add ability to pause phase progression for debugging.

**File:** `src/main.ts`

**Add state:**
```typescript
private freezePhaseProgression: boolean = false
```

**Add keyboard handler:**
```typescript
case 'p':
  this.freezePhaseProgression = !this.freezePhaseProgression
  console.log(`[DEBUG] Phase Freeze: ${this.freezePhaseProgression ? 'ON' : 'OFF'}`)
  break
```

**Modify phase timer logic:**
```typescript
if (!this.freezePhaseProgression) {
  this.mainSequenceTimer += deltaTime
  // ... other phase timers
}
```

## Testing Plan

### Phase 1: Nebula Collapse
- Toggle `7` (nebula particles) - should hide/show gas cloud
- Toggle `8` (protostar) - should hide/show forming star
- Verify stats show collapse progress, protostar radius, particle count

### Phase 2: Main Sequence
- Toggle `7` (star mesh) - should hide/show sun
- Toggle `8` (corona) - should hide/show corona effects
- Toggle `9` (planets) - should hide/show all planets
- Verify stats show star radius, temperature, time in phase

### Phase 3: Red Giant
- Same as Phase 2, plus verify "engulfed planets" stat updates

### Phase 4: Supernova
- Toggle `6` (remnant) - should hide/show expanding shells
- Toggle `7` (flash) - should hide/show flash effects
- Verify stats show explosion progress, shockwave radius, flash intensity

### Phase 5: Black Hole
- All existing toggles should work (already tested)
- Verify stats show mass, event horizon, particles

### Cross-Phase Testing
- Enable debug state in Phase 1, verify it persists through all phase transitions
- Test "Toggle All" (A key) in each phase
- Verify debug overlay updates toggle list when phase changes
- Test phase freeze (P key) in each phase

## Success Criteria

1. ✅ All major visual elements in all phases are toggleable
2. ✅ Debug overlay shows relevant stats for current phase
3. ✅ Toggle list updates to show only available keys per phase
4. ✅ Debug state persists across phase transitions
5. ✅ No console errors or visual glitches when toggling
6. ✅ FPS remains stable (60fps) with debug mode active

## Future Enhancements

- Visual indicators on screen when elements are toggled off (not just console)
- Ability to save/load debug state presets
- Per-element opacity sliders (not just on/off)
- Timeline scrubbing (jump to specific phase times)
- Screenshot/recording mode (hide UI, optimal settings)

## Files Changed Summary

**Modified:**
- `src/main.ts` - Core debug logic, stats, toggles
- `src/Nebula.ts` - Expose properties, add getters
- `src/Star.ts` - Expose properties, add getters
- `src/PlanetSystem.ts` - Expose properties, add getters
- `src/IgnitionBurst.ts` - Expose properties
- `src/SupernovaRemnant.ts` - Add getter methods
- `index.html` - Update debug overlay structure (optional)

**No new files required** - all enhancements extend existing debug infrastructure.

## Estimated Effort

- **Phase 1-2** (Expose properties, add keys): 1-2 hours
- **Phase 3-4** (Phase-aware logic, stats): 2-3 hours
- **Phase 5-6** (Dynamic UI, persistence): 1-2 hours
- **Phase 7-8** (Getters, freeze feature): 1 hour
- **Testing**: 1 hour

**Total: 6-9 hours** (1-2 development sessions)

## Notes

- Current debug mode already works great for Phase 5 (Black Hole)
- This enhancement extends that pattern to all phases
- Maintains existing architecture - no breaking changes
- Optional freeze feature can be added later if desired
- This will dramatically improve debugging workflow across entire sim
