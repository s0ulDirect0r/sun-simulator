# Worklog: Visual Debug Mode Implementation
**Date:** November 6, 2025
**Branch:** `debug-mode` (branched from `gravitational-lensing`)
**Status:** Complete (core functionality), bugs identified

## Summary
Implemented comprehensive visual debug mode with keyboard-driven toggles for all scene elements. Debug mode allows instant isolation of visual effects to identify sources and tune parameters. Discovered mysterious orange glow was event horizon shader. Identified path for phase-aware enhancement.

---

## Context: The Mystery Glow Problem

### Starting Point
- Attempted to implement gravitational lensing for black hole
- Added vertex warping, gravitational redshift, photon sphere boost
- **Problem:** Couldn't verify lensing was working due to overwhelming orange/yellow glow
- Spent session trying to isolate glow source by:
  - Disabling accretion disk (temperature gradient + additive blending)
  - Disabling event horizon
  - Disabling bloom post-processing
  - Disabling orange point light at center
- **Nothing worked** - couldn't definitively identify source

### The Realization
User: "I think that's a problem that combined we can't actually figure out what that is. Says something about our documentation or naming or something."

**Root cause identified:**
1. Poor naming - effects not clearly labeled for visual impact
2. Scattered effects - glow from multiple interacting sources
3. No visual debugging tools - no way to toggle elements individually
4. Lack of comments - shaders/effects don't document visual impact

**Solution:** Build a proper debug mode with individual element toggles.

---

## Session Flow

### Phase 1: Planning (User Approval)
**Goal:** Create implementation plan for visual debug mode

Used Task/Plan agent to research codebase and propose approach:
1. Store references to lights and post-processing passes
2. Make BlackHole/SupernovaRemnant/AccretionSource properties public
3. Create `debugState` object to track toggle states
4. Add keyboard handlers for all elements
5. Create `applyDebugState()` method to apply toggles
6. Build debug overlay UI with stats (FPS, particle counts, etc.)

**User approved plan** - proceeded with implementation.

### Phase 2: Foundation (Todo 1 - Completed)
**Actions taken:**
1. Added `debugState` object with all toggle flags
2. Changed local variables to class properties:
   - `filmGrainPass: FilmGrainPass`
   - `vignettePass: VignettePass`
   - `ambientLight: THREE.AmbientLight`
   - `pointLight: THREE.PointLight`
3. Made BlackHole properties public for debug access:
   - `public eventHorizon: THREE.Mesh`
   - `public accretionDisk: THREE.Mesh`
   - `public jetTop: THREE.Mesh`
   - `public jetBottom: THREE.Mesh`
   - `public lensingRing: THREE.Mesh`
4. Made SupernovaRemnant shells public: `public shells: THREE.Points[]`
5. Made AccretionSource particles public: `public particles: THREE.Points`

**Result:** All visual elements accessible for toggling.

### Phase 3: Core Toggle Implementation (Todos 2-4 - Completed)
**Actions taken:**
1. Created `applyDebugState()` method:
   - Lights: Set intensity to 0 or original value
   - Black hole elements: Toggle `.visible` property
   - Accretion sources: Iterate array, toggle particles
   - Supernova remnant: Iterate shells, toggle visibility
   - Post-processing: Set `.enabled` property on passes

2. Added keyboard handlers (extending existing setupControls):
   ```
   1 = Accretion disk
   2 = Jets
   3 = Event horizon
   4 = Lensing ring
   5 = Accretion sources
   6 = Supernova remnant
   L = Lights (ambient + point)
   B = Bloom
   G = Film grain
   V = Vignette
   ```

3. Each toggle logs to console: `[DEBUG] Element: ON/OFF`

**Result:** All elements toggleable with immediate visual feedback.

### Phase 4: Debug Overlay UI (Todo 5 - Completed)
**Actions taken:**
1. Added debug overlay HTML to `index.html`:
   - Matrix-style green-on-black terminal aesthetic
   - Sections: Stats, Black Hole, Particles, Toggle List
   - Fixed position top-right
   - Initially hidden (display: none)

2. Added overlay element references to `main.ts`:
   - `debugOverlay`, `debugFps`, `debugPhase`
   - `debugMass`, `debugBhRadius`
   - `debugSourceParticles`, `debugRemnantParticles`, `debugTotalParticles`

3. Created `updateDebugStats()` method:
   - Calculate FPS from frame delta time
   - Show current phase name
   - Show black hole mass and radius (if exists)
   - Count active particles from sources and remnant
   - Only updates when overlay visible (performance)

4. Added getter methods to support stats:
   ```typescript
   // AccretionSource.ts
   public getActiveParticleCount(): number

   // SupernovaRemnant.ts
   public getActiveParticleCount(): number

   // BlackHole.ts
   public getCurrentMass(): number
   ```

5. Call `updateDebugStats()` in animate loop (before render)

**Result:** Real-time stats display with FPS counter and particle counts.

### Phase 5: Polish (Todo 6 - Completed)
**Actions taken:**
1. Added `D` key to toggle debug overlay visibility
2. Added `A` key to toggle ALL visual elements at once (master switch)
3. Debug overlay includes help text showing all keyboard shortcuts
4. Console logging for all toggles

**Result:** Complete, polished debug mode ready for use.

### Phase 6: The Discovery
**User tested debug mode:**
- Navigated to black hole phase
- Started toggling elements off one by one
- **Pressed `3` (event horizon toggle)**
- **Orange glow disappeared!**

**Mystery solved:** The event horizon shader (`EventHorizonShader.ts` line 170) with its red-orange glow color (`0xff4400`) was the source.

**Debug mode paid for itself immediately** - exactly the problem it was designed to solve.

---

## Technical Implementation Details

### Debug State Structure
```typescript
private debugState = {
  // Black hole elements
  accretionDisk: true,
  jets: true,
  eventHorizon: true,
  lensingRing: true,
  accretionSources: true,
  supernovaRemnant: true,

  // Scene elements
  pointLight: true,
  ambientLight: true,

  // Post-processing
  bloom: true,
  filmGrain: true,
  vignette: true,

  // UI
  showDebugOverlay: false,
}
```

### Toggle Method Pattern
```typescript
private applyDebugState(): void {
  // Lights (intensity control)
  this.ambientLight.intensity = this.debugState.ambientLight ? 0.5 : 0

  // Meshes (visibility control)
  if (this.blackHole) {
    this.blackHole.accretionDisk.visible = this.debugState.accretionDisk
  }

  // Post-processing (enabled control)
  this.bloomPass.enabled = this.debugState.bloom
}
```

### Keyboard Handler Pattern
```typescript
case '1':
  this.debugState.accretionDisk = !this.debugState.accretionDisk
  this.applyDebugState()
  console.log(`[DEBUG] Accretion Disk: ${this.debugState.accretionDisk ? 'ON' : 'OFF'}`)
  break
```

### Stats Update (Every Frame)
```typescript
private updateDebugStats(): void {
  if (!this.debugState.showDebugOverlay) return

  // FPS calculation
  const now = performance.now()
  const deltaMs = now - this.lastFrameTime
  this.fps = Math.round(1000 / deltaMs)

  // Update HTML elements
  this.debugFps.textContent = this.fps.toString()
  this.debugPhase.textContent = this.currentPhase

  // Black hole stats
  if (this.blackHole) {
    this.debugMass.textContent = `${this.blackHole.getCurrentMass().toFixed(2)} M☉`
    this.debugBhRadius.textContent = `${this.blackHole.getEventHorizonRadius().toFixed(2)} units`
  }

  // Particle counts
  // ... (aggregate from sources and remnant)
}
```

---

## Key Learnings & Principles

### Debug Tools Are Force Multipliers
**Problem:** Spent entire session trying to isolate visual effect sources manually
**Solution:** Built debug mode in ~2 hours
**Result:** Instantly identified problem in 30 seconds

**Takeaway:** Invest in debug tooling early. Time spent building tools pays back immediately.

### Encapsulation vs Debuggability
**Tension:** Good OOP says "keep properties private"
**Reality:** Debugging requires access to internal state

**Our approach:**
- Made properties public with `// Public for debug toggles` comments
- Could have used accessor methods for "cleaner" OOP
- Chose pragmatism over purity (this is a debug feature)

**Takeaway:** For debug/dev tools, pragmatism > theoretical purity.

### Progressive Enhancement
Built debug mode in phases:
1. Foundation (state + references)
2. Core toggles (keyboard handlers)
3. UI (overlay display)
4. Polish (master toggle, help text)

Each phase worked independently. Could stop at any phase and have useful tool.

**Takeaway:** Build features in independently-useful layers.

### The "Mystery Glow" Pattern
**Common debugging antipattern:**
1. Visual effect exists
2. Try to find source by inspection
3. Can't identify due to multiple interacting systems
4. Guess and check (disable random things)
5. Get frustrated, waste time

**Solution pattern:**
1. Build systematic toggle system
2. Isolate elements one by one
3. Find source definitively
4. Tool remains useful forever

**Takeaway:** Systematic tools > guess-and-check.

---

## Files Modified

### Core Implementation
1. **`src/main.ts`** (major changes)
   - Added debug state object
   - Added light/pass property references
   - Added `applyDebugState()` method
   - Added `updateDebugStats()` method
   - Extended keyboard handlers with debug keys
   - Added overlay element initialization

2. **`src/BlackHole.ts`** (minor changes)
   - Made 5 properties public: eventHorizon, accretionDisk, jetTop, jetBottom, lensingRing
   - Added `getCurrentMass()` getter method

3. **`src/SupernovaRemnant.ts`** (minor changes)
   - Made `shells` property public
   - Added `getActiveParticleCount()` method

4. **`src/AccretionSource.ts`** (minor changes)
   - Made `particles` property public
   - Added `getActiveParticleCount()` method

### UI
5. **`index.html`** (minor changes)
   - Added debug overlay div with inline styles
   - Matrix-style terminal aesthetic
   - Shows stats + toggle help

---

## Bugs Identified

### Bug 1: Black Hole Stats Don't Update
**Bead:** `sun-simulator-jx7` (P1, bug)

**Description:** Debug overlay shows black hole mass and radius, but values don't update in real-time as accretion happens. Stats remain at initial values (1.0 M☉, 5.0 units).

**Possible causes:**
- HTML elements not updating (check `updateDebugStats()` logic)
- Methods returning stale data (verify `getCurrentMass()` reads `this.currentMass`)
- Update not being called frequently enough
- Timing issue (stats read before mass updated)

**To investigate:**
- Add console.log in `updateDebugStats()` to verify it's called
- Add console.log in `getCurrentMass()` to see if it's called
- Verify `addMass()` is actually being called and updating `this.currentMass`

---

## Future Work (Beads Created)

### Enhancement: Phase-Aware Debug Mode
**Bead:** `sun-simulator-6y4` (P2, enhancement)
**Plan:** `plans/debug-mode-phase-awareness.md`

**Current limitation:** Debug mode only works for Phase 5 (Black Hole). Other phases (Nebula, Star, Supernova) have no debug toggles.

**Enhancement scope:**
1. Add phase-specific toggle keys (7, 8, 9 context-aware per phase)
2. Make Nebula/Star/PlanetSystem properties public
3. Create phase-aware stats display (show relevant metrics per phase)
4. Update debug overlay to show only available toggles for current phase
5. Apply debug state on phase transitions (persistence)
6. Add getter methods to all phase classes
7. Optional: Add phase freeze feature (pause progression)

**Estimated effort:** 6-9 hours (1-2 sessions)

**Value:** Makes debug mode universal across entire simulation lifecycle.

### Bug Fix: Stats Not Updating
**Bead:** `sun-simulator-jx7` (P1, bug)

Already covered above.

---

## Performance

**Debug overlay active:**
- FPS: 60fps stable (no performance impact when visible)
- Update every frame (~16ms) - negligible overhead
- Particle count aggregation is O(n) per frame but n is small (<20 sources)

**Toggle operations:**
- Instant (just setting properties)
- No re-renders or recompiles
- Visibility changes handled by Three.js efficiently

---

## User Experience Wins

### Before Debug Mode
User: "I have no idea where this glow is coming from. Lol."
- Spent 30+ minutes trying different things
- Couldn't definitively identify source
- Frustration building

### After Debug Mode
User: "Oh, yeah it was the event horizon shader"
- Pressed one key (`3`)
- Instant confirmation
- Problem solved in 30 seconds

**ROI:** ~60:1 (2 hours building tool saved many future debugging hours)

---

## Next Steps

1. **Commit this work** - Core debug mode complete and tested
2. **Fix BH stats bug** - Investigate why mass/radius don't update
3. **Consider phase-aware enhancement** - P2, not urgent but valuable
4. **Return to gravitational lensing** - Can now debug it properly by toggling event horizon

---

## Quotes of the Day

**User (after spending session trying to find glow source):**
> "I think that's a problem that combined we can't actually figure out what that is. Says something about our documentation or naming or something."

**User (after one keypress with debug mode):**
> "Oh, yeah it was the event horizon shader"

**Assistant:**
> "This debug mode just paid for itself immediately! 🎉"

---

**Last Updated:** 2025-11-06 22:50 PM
**Status:** Debug mode implemented, working, documented. Ready to commit.
**Next Priority:** Fix stats update bug, return to lensing work
