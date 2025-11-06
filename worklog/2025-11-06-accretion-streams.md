# Worklog: Dynamic Accretion Streams Implementation
**Date:** November 6, 2025
**Branch:** `dynamic-accretion-stream`
**PR:** #12

## Summary
Successfully implemented AccretionSource class with realistic spiral orbital motion. Particles now spawn from distant orbital positions and spiral into the black hole over multiple orbits, creating dramatic visual accretion streams.

---

## Session Flow

### Phase 1: Initial Investigation
**Goal:** Continue Phase 3 accretion stream work from previous session

- Reviewed AccretionSource.ts implementation
- Particles were configured to spawn but user reported not seeing anything
- Initial assumption: rendering issue or position problem

### Phase 2: Make Problem Visible
**Key Decision:** "Can't debug what you can't see"

**Actions taken:**
1. Changed particle size from 1.5 → 50 pixels (with `sizeAttenuation: false`)
2. Changed color to bright purple (0xff00ff) for maximum visibility
3. Added bright purple debug marker spheres (2-unit radius) at spawn positions
4. Added extensive console logging (spawn events, particle counts, positions)

**Discovery:** Particles WERE rendering - they were being launched into space like particle cannons! The tangential velocity was overpowering gravity and flinging particles outward.

### Phase 3: Strip to Baseline
**Key Decision:** "When stuck tweaking: stop, simplify, validate one thing"

**Actions taken:**
1. Removed ALL tangential velocity code
2. Kept ONLY gravitational infall (radial acceleration)
3. Validated baseline: particles fell straight into event horizon
4. Confirmed consumption was working (particle count + black hole growth)

**Result:** Baseline validated - 1690+ particles consumed, black hole growing steadily

### Phase 4: Identify Root Cause
**Analysis of velocity balance:**
- Radial (inward): 0.15-0.25 units/frame
- Tangential (orbital): ~0.003 units/frame
- **Problem:** Radial was 50-80x stronger → straight infall, no spiral

**Physics insight:** Real accretion requires particles to START in orbit (high tangential), then slowly lose angular momentum via gravity. We were doing it backwards.

### Phase 5: Implement Correct Spiral Motion
**Key Change:** Flip the velocity ratio

**New velocity profile:**
- Radial velocity: 0.01-0.02 (15x weaker - gentle inward drift)
- Tangential velocity: 0.8 × sqrt(GM/r) (13x stronger - dominant orbital motion)
- Lifetime: 60s → 120s (time for multiple orbits)

**Physics:** Particles spawn with strong orbital velocity, gravity gradually adds radial velocity over many orbits → spiral infall

**Result:** Beautiful spiral trajectories visible! Particles make multiple loops before being consumed.

### Phase 6: Fix Event Horizon Mismatch
**Problem discovered:** Consumption radius (10.0 units) didn't match visual event horizon (~7.5 units)

**Solution:**
1. Added `BlackHole.getEventHorizonRadius()` getter
2. Added `updateEventHorizonRadius()` methods to AccretionSource and SupernovaRemnant
3. Wired up dynamic updates when black hole grows
4. Now particles consumed exactly when they touch visible sphere

### Phase 7: Visual Polish
**Removed debug elements:**
- Purple debug markers → invisible
- Purple particles → hot orange (0xff5500)
- Particle size: 50px → 0.8 units (realistic)
- Console spam reduced (only log every 0.1 mass increase)
- Removed spawn/particle tracking diagnostics

**Result:** Clean, cinematic accretion effect

### Phase 8: Speed Control Investigation
**User observation:** Beautiful at 1x speed, clumpy at 5x speed

**Root cause:** `deltaTime *= timeScale` causes large physics time steps at high speed
- At 5x: ~0.08s steps → particles "teleport" too far per frame
- Orbital mechanics require small time steps for smooth trajectories
- Particles can skip past event horizon detection

**Decision:** Accept 1x as intended viewing experience. Created P2 bead for sub-stepping enhancement if needed for demos.

---

## Technical Implementation Details

### AccretionSource Class
**File:** `src/AccretionSource.ts`

**Key features:**
- 1000 particle capacity per source
- Sporadic chunk spawning (0.3-1.5s intervals, 50-100 particles per chunk)
- 120s lifetime for orbital decay
- Orbit-first velocity initialization
- Dynamic event horizon radius updates

**Physics parameters:**
```typescript
radialSpeed = 0.01 + Math.random() * 0.01  // Gentle inward drift
orbitalSpeed = Math.sqrt(accretionStrength / dist) * 0.8  // Keplerian orbital
```

### Integration Points
**File:** `src/main.ts`

**3 AccretionSource positions:**
- (50, 30, 20) - ~62 units from black hole
- (-44, -20, 36) - ~62 units from black hole
- (36, -40, -30) - ~62 units from black hole

**Gravitational parameters:**
- Accretion strength: 0.15 (3x baseline)
- Event horizon radius: Dynamic (starts at 5.0, grows with mass)

### Event Horizon Synchronization
**Files:** `BlackHole.ts`, `SupernovaRemnant.ts`, `AccretionSource.ts`

**Implementation:**
1. BlackHole tracks actual radius as it grows (Rs ∝ M)
2. Public getter exposes current radius
3. Consumption callbacks update all particle systems when black hole grows
4. Ensures particles consumed at visual boundary

---

## Key Learnings & Principles

### Debugging Principle (Added to CLAUDE.md)
**"When stuck tweaking parameters: Make it obvious. Strip to minimal. Prove one thing."**

**Application in this session:**
1. Made particles maximally visible (50px purple squares)
2. Stripped to baseline (gravity-only infall)
3. Validated consumption worked
4. Built back spiral motion with correct physics

### Physics Insight
**Accretion requires orbit-first approach:**
- Start particles in stable orbit (tangential >> radial)
- Let gravity slowly rob angular momentum
- Result: Gradual spiral over many orbits
- Not: Fast inward velocity + weak tangential (shoots straight in)

### Time Step Stability
**Physics simulations break at large time steps:**
- Orbital mechanics requires small dt for smooth integration
- Particles can "teleport" past collision boundaries
- Sub-stepping or clamping needed for fast-forward modes

---

## Commits (6 total)

1. `b447088` - Add AccretionSource class for sporadic particle streams
2. `c01a08a` - Add dynamic event horizon radius getter to BlackHole
3. `17b9d34` - Add updateEventHorizonRadius to SupernovaRemnant
4. `1f87427` - Integrate AccretionSource with spiral orbital motion
5. `886c29a` - Add debugging principle to CLAUDE.md
6. `4a7cd21` - Add P2 beads for speed enhancement and accretion polish

---

## Future Work (P2 Beads)

### sun-simulator-642: Speed Control Robustness
**Goal:** Make 5x speed work smoothly for demos

**Approach:** Physics sub-stepping
- Run multiple small physics steps per large frame step
- Maintains accuracy at high speeds
- Prevents particle "teleportation"

### sun-simulator-jw8: Enhanced Accretion Streams
**Ideas:**
- More than 3 sources (5-7 for fuller coverage)
- Thinner, more numerous streams
- Color variation (temperature gradients)
- Varying spawn rates per source

---

## Visual Result
At 1x speed, particles spawn from three distant orbital positions and spiral inward over ~2 minutes, creating beautiful orange streams feeding the black hole. Black hole grows visibly as it consumes matter, with event horizon expanding from 5 → 15 units max.

**Performance:** Stable at 60fps with 3000 active particles spiraling simultaneously.
