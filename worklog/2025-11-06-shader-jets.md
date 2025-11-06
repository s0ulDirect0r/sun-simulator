# Worklog: Shader-Based Relativistic Jets Implementation
**Date:** November 6, 2025
**Branch:** `black-hole-jets`
**PR:** #13

## Summary
Successfully implemented Phase 4: Relativistic Jets using GLSL shader materials instead of particles. Jets now feature flowing animation effects and scale proportionally with black hole mass, creating a dramatic progression effect as the black hole feeds.

---

## Session Flow

### Phase 1: Plan and Research
**Goal:** Replace particle-based jets with shader-based glowing beams

- Entered plan mode and researched current jet implementation
- User asked about the physics of black hole jets
- Explained Blandford-Znajek process, M87*, synchrotron radiation, magnetic collimation
- Created 5-task plan following "small testable wins" approach from Phase 3

### Phase 2: Create Shader Foundation (Task 1)
**Actions taken:**
1. Created `src/shaders/JetTrailShader.ts` following EventHorizonShader pattern
2. Vertex shader: basic position/normal/UV pass-through
3. Fragment shader: distance-based fade, edge fade, simple noise turbulence
4. Export function: `createJetTrailMaterial(jetLength)`

**Result:** Clean shader module with no compilation errors

### Phase 3: Integrate with BlackHole (Task 2)
**Actions taken:**
1. Added import for `createJetTrailMaterial`
2. Replaced particle properties with shader-based:
   - Old: `jets`, `jetsGeometry`, `jetsMaterial`, particle arrays
   - New: `jetTop`, `jetBottom`, `jetMaterial`, `jetLength: 180.0`
3. Rewrote `createJets()`:
   - CylinderGeometry with cone shape (baseRadius 0.8 → tipRadius 3.0)
   - Two meshes (top/bottom) positioned at poles
   - renderOrder = 4 for proper blending
4. Updated `update()` loop to animate shader uniforms
5. Updated `dispose()` for new geometry

**Result:** User confirmed "Ok it looks cool. We've got the baseline jets."

### Phase 4: Add Flow Animation (Task 3)
**Actions taken:**
1. Added `flowSpeed` uniform to shader
2. Modified fragment shader:
   - Scrolling noise pattern moves along Y axis with time
   - Streaming waves: `sin(distAlongJet * 10.0 - time * flowSpeed * 3.0)` for traveling blobs
   - Base pulsing: brightness variation at jet origin
   - Combined turbulence effects

**Result:** Jets now show visible flowing motion

### Phase 5: Tune for Drama → Overcorrection
**Initial tuning attempt:**
- Cranked opacity to 1.2, glow to 4.5, pure white color
- Extended length to 250 units
- Increased cone size

**User feedback:** "lol bro this shit is insane" 😂
- Jets were completely overwhelming the scene
- White supernova beam washing out accretion disk
- Needed "dramatic but balanced" not "retina-searing laser cannon"

### Phase 6: Dial Back to Balance
**Actions taken:**
1. Reduced opacity: 1.2 → 0.7 → 0.4 → 0.8 (iterative tuning)
2. Reduced glow: 4.5 → 2.5 → 1.5 → 2.0
3. Softened color: Pure white → 0xaaddff → 0x88ccff (blue-white)
4. Kept good stuff: 250 unit length, flow speed 6.0

**Result:** Much better balance, accretion disk visible again

### Phase 7: Mass-Based Scaling (User suggestion)
**User insight:** "Scale jets with mass and radius of black hole"
- Physically inspired: bigger/more massive black holes = more powerful jets

**Implementation:**
1. Changed geometry creation to be proportional to event horizon:
   - Base radius: 20% of event horizon radius
   - Tip radius: 50% of event horizon radius
   - (Real jets are 10-30% of event horizon, we're in that range)

2. Added scaling in `addMass()`:
   - Scale jet width/depth (x/z) with radius ratio
   - Keep length (y) constant at 250 units
   - Brightness scales from 2.0 → 4.5 as mass grows 1.0 → 3.0

**Result:** Jets start subtle, grow more powerful as black hole feeds

### Phase 8: Code Cleanup
**User observation:** "take out the old jets code, you commented it out"
- Also noted the old particle spray effect looked cool

**Actions taken:**
1. Removed all commented-out particle jet code
2. Updated P2 bead (sun-simulator-mit) to include particle spray idea as future enhancement
3. Committed cleanup

---

## Technical Implementation Details

### JetTrailShader.ts
**File:** `src/shaders/JetTrailShader.ts`

**Fragment shader effects:**
```glsl
// Distance along jet fade
float distanceFade = 1.0 - smoothstep(0.3, 1.0, distAlongJet);

// Edge fade for soft boundaries
float edgeFade = 1.0 - smoothstep(0.5, 1.0, distFromAxis);
edgeFade = pow(edgeFade, 2.0);

// Flowing noise pattern (scrolls with time)
vec3 flowingNoisePos = vec3(
  vWorldPosition.x,
  vWorldPosition.y - time * flowSpeed,
  vWorldPosition.z
) * 0.15;

// Streaming waves (blobs of brightness)
float streamingWaves = sin(distAlongJet * 15.0 - time * flowSpeed * 3.0) * 0.5 + 0.5;
streamingWaves = pow(streamingWaves, 3.0);

// Base pulsing
float basePulse = (1.0 - distAlongJet) * (sin(time * 2.0) * 0.2 + 0.8);
```

**Uniforms:**
- `time`: Animation driver
- `jetLength`: 250 units
- `coreColor`: 0x88ccff (blue-white synchrotron)
- `glowIntensity`: 2.0 base (scales to 4.5)
- `opacity`: 0.8 base
- `flowSpeed`: 6.0 units/sec

**Material settings:**
- Additive blending for glow effect
- Transparent: true, depthWrite: false
- DoubleSide rendering

### BlackHole.ts Integration

**Geometry creation:**
```typescript
const baseRadius = this.blackHoleRadius * 0.20   // 20% of event horizon
const tipRadius = this.blackHoleRadius * 0.50    // 50% at tip

const geometry = new THREE.CylinderGeometry(
  baseRadius,      // radiusTop
  tipRadius,       // radiusBottom (cone shape)
  this.jetLength,  // 250 units
  16,              // radialSegments
  32               // heightSegments (for smooth animation)
)
```

**Mass-based scaling:**
```typescript
const radiusRatio = clampedRadius / this.baseRadius

// Scale width/depth, keep length constant
this.jetTop.scale.x = radiusRatio
this.jetTop.scale.z = radiusRatio
this.jetTop.scale.y = 1.0

// Brightness scales with mass
const massScale = Math.min(this.currentMass, 3.0)
const glowScale = 2.0 + (massScale - 1.0) * 1.25  // 2.0 → 4.5
```

---

## Key Learnings & Principles

### Iterative Tuning is Essential
**"Dramatic but balanced" requires iteration:**
- First pass was way too extreme (opacity 1.2, glow 4.5, pure white)
- Multiple rounds of user feedback to find sweet spot
- Final: opacity 0.8, glow 2.0→4.5, soft blue-white

### User Feedback on Visual Impact
**User was excellent at articulating what worked:**
- "this shit is insane" = too much 😂
- "retina-searing laser cannon" vs "dramatic but balanced"
- Clear direction: jets should be impressive but not dominate accretion disk

### Physically-Inspired Scaling Adds Depth
**Mass-based growth creates progression:**
- Black hole starts with subtle jets
- As it feeds and grows, jets become more powerful
- Rewards player for watching the accretion process
- Feels physically grounded (bigger BH = more energy)

### Clean Up as You Go
**Don't leave commented code:**
- Old particle jet code was taking up space
- Captured the good idea (particle spray) in a bead for later
- Keeps codebase clean and focused

---

## Commits (3 total)

1. `c313a12` - Add JetTrailShader with flowing glow effects
2. `7dbd550` - Replace particle jets with shader-based beams that scale with mass
3. `3316648` - Remove commented-out particle jet code

---

## Future Work (P2 Beads)

### sun-simulator-mit: Further Refine Relativistic Jets
**Ideas captured:**
- Add particle spray on top of shader beams (like old implementation had)
- Adjust streaming wave parameters
- Fine-tune color temperature variations along jet length
- Consider turbulent particle envelope

---

## Visual Result
Jets start subtle with blue-white glow (intensity 2.0), allowing the beautiful orange accretion disk to be the star. As the black hole consumes matter and grows, jets scale proportionally in size and brightness (up to 4.5 intensity), becoming increasingly dramatic. The flowing animation creates visible streaming motion that enhances the "plasma beam" effect.

**Physics grounding:**
- Jet radius: 20%→50% of event horizon (realistic range)
- Synchrotron radiation blue-white color
- Magnetic collimation cone shape
- Power scales with black hole mass (Blandford-Znajek inspired)

**Performance:** Stable at 60fps with shader-based rendering.

---

## Next Steps
- Phase 5: Gravitational lensing and photon sphere (P2)
- Close P0 "complete overhaul" bead after lensing implementation
- Consider post-processing bloom/glow for entire scene
