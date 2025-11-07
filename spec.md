# Sun Simulator - Project Specification

## Project Overview
A web-based interactive simulation that visualizes the complete lifecycle of a star, from its birth in a nebula through its various evolutionary stages, culminating in its dramatic death as a supernova. Built with Three.js for impressive visual presentation.

## Project Goals
- Create a visually dramatic and engaging simulation of stellar evolution
- Creatively model the lifecycle of a star with enough scientific grounding to justify the "simulator" name
- Demonstrate gravitational effects and stellar processes in an accessible, impressive way
- Build a portfolio piece suitable for bootcamp demo presentation
- Balance visual spectacle with conceptual accuracy (leaning toward drama)

## Simulation Phases

### Phase 1: Stellar Birth (Nebula to Protostar)
- **Initial State**: Vast interstellar gas and dust cloud (nebula)
- **Process**: Gravitational collapse of the nebula
- **Visual Elements**:
  - Swirling gas and dust particles
  - Gradual concentration of matter toward center
  - Formation of accretion disk
  - Initial heat generation (infrared glow)
- **Duration**: Accelerated time-lapse (represents ~100,000 years)

### Phase 2: Main Sequence Star
- **Process**: Hydrogen fusion begins in the core
- **Visual Elements**:
  - Stable, bright yellow-white star
  - Solar surface activity (sunspots, solar flares)
  - Radiating light and heat
  - Corona effects
- **Duration**: Majority of simulation time (represents billions of years)
- **Solar System Integration**: Star becomes the center of a planetary system with Earth in orbit

### Phase 3: Red Giant Phase
- **Process**: Hydrogen exhaustion, helium fusion begins
- **Visual Elements**:
  - Dramatic expansion of star's outer layers
  - Color shift from yellow to red-orange
  - Increased luminosity
  - Possible ejection of outer layers
- **Duration**: Extended transition period

### Phase 4: Death - Supernova
- **Process**: Core collapse and explosive ejection of stellar material
- **Visual Elements**:
  - Rapid brightening
  - Catastrophic explosion with shockwave
  - Ejection of heavy elements into space
  - Formation of remnant (neutron star or black hole)
  - Expanding nebula of ejected material
- **Duration**: Dramatic, high-energy sequence

### Phase 5: Stellar Remnant Formation (Random: Black Hole OR Neutron Star)
- **Process**: 50/50 random selection determines remnant type - adds spontaneity to each simulation run!
- **Duration**: Continuous accretion process, demonstrates remnant dynamics

#### Black Hole Branch:
- **Visual Elements**:
  - **Event Horizon**: Shader-based spacetime distortion with gravitational warping
  - **Accretion Disk**: Ring of superheated material with temperature-based color gradients (blue-white core → orange → red edges)
  - **Accretion Streams**: Spiraling particle streams feeding the black hole from distant orbital positions
  - **Relativistic Jets**: Shader-based polar beams with flowing synchrotron radiation effects
  - **Gravitational Lensing**: Light-bending photon ring (basic implementation, enhancement planned)
  - **Mass Growth**: Black hole visibly grows as it consumes matter, jets intensify proportionally
- **Physics Inspiration**:
  - Schwarzschild radius scaling (Rs ∝ M)
  - Innermost Stable Circular Orbit (ISCO) at 3× Schwarzschild radius
  - Jet collimation (20-50% of event horizon radius)
  - Blandford-Znajek process (energy extraction via magnetic fields)

#### Neutron Star Branch:
- **Visual Elements**:
  - **Ultra-Dense Surface**: Tiny (~1.5 units), incredibly bright bluish-white sphere
  - **Pulsar Beams**: Rotating lighthouse effect with narrow, intense beams along magnetic poles
  - **Magnetic Field Lines**: Curved cyan field lines emanating from poles
  - **Rapid Rotation**: 30 rotations per second (millisecond pulsar)
  - **Surface Hotspots**: Rotating accretion points where material impacts surface
  - **Accretion Streams**: Bluish-white particles spiraling onto neutron star surface
  - **Mass Growth**: Slight radius increase with accretion (limited to ~2.5 solar masses)
- **Physics Inspiration**:
  - Millisecond pulsar rotation periods
  - Magnetic axis offset from rotation axis
  - Surface accretion (vs black hole event horizon consumption)
  - Neutron star mass limits (Tolman-Oppenheimer-Volkoff limit)

## Technical Requirements

### Core Technologies
- **Platform**: Web Browser
- **Graphics Engine**: Three.js (WebGL-based 3D rendering)
- **Physics Simulation**: Simplified gravitational physics for visual effect (not full n-body simulation)
- **Language**: JavaScript/TypeScript
- **Performance**: Real-time rendering with smooth animation, optimized for demo purposes

### Features
- **Time Controls**: Play, pause, speed up/slow down simulation
- **Camera Controls**: Zoom, pan, rotate view (orbital controls)
- **Phase Indicators**: Show current lifecycle stage
- **Simple Info Display**: Basic stats about what's happening
- **Auto-play Mode**: Simulation runs through entire lifecycle automatically
- **Visual Effects Priority**: Emphasis on impressive particle effects, lighting, and transitions

### Visual Requirements
- Dramatic color representation (temperature-based but enhanced for visual appeal)
- Heavy particle effects for gas, dust, and stellar material
- Impressive lighting effects (lens flares, glow, bloom, HDR)
- Gravitational effects visible through particle motion
- Artistic liberty prioritized for "wow factor" while maintaining conceptual accuracy
- Smooth, cinematic transitions between lifecycle phases

### User Experience
- Intuitive, minimal UI that doesn't distract from visuals
- Smooth, cinematic transitions between lifecycle phases
- Easy to demo - should be impressive within 2-3 minutes
- Clean, modern interface suitable for portfolio presentation
- Performance optimized for presentation on typical laptops

## Project Phases (Development)

### Phase 1: Foundation
- Set up project structure
- Implement basic 3D rendering environment
- Create camera and control systems
- Establish time simulation framework

### Phase 2: Nebula & Birth
- Particle system for gas and dust
- Gravitational collapse simulation
- Protostar formation visuals

### Phase 3: Main Sequence
- Stable star rendering
- Solar surface effects
- Solar system/Earth orbit integration

### Phase 4: Evolution & Death
- Red giant expansion
- Supernova explosion effects
- Remnant visualization

### Phase 5: Polish & Education
- UI/UX refinement
- Educational content integration
- Performance optimization
- Testing and bug fixes

## Success Criteria
- Visually impressive and memorable presentation
- Conceptually accurate enough to be called a "simulator" with confidence
- Demonstrates understanding of 3D graphics, particle systems, and physics concepts
- Successfully showcases gravitational effects and stellar evolution phases
- Makes bootcamp colleagues and instructors say "wow, that's cool!"
- Runs smoothly during live demos
- Portfolio-worthy code quality

## Future Enhancements (Post-MVP)
- Multiple star types (different masses, different fates)
  - **Mass-based remnant determination**: Currently 50/50 random choice between neutron star and black hole. Future enhancement: use initial stellar mass thresholds (~8-25 solar masses → neutron star, >25 solar masses → black hole)
- Binary star systems
- Formation of planetary systems in detail
- VR/AR support
- Sound design and music

## Design Philosophy
**"Spectacular Science"** - Prioritize visual drama and impressive effects while maintaining enough scientific grounding to justify calling it a simulator. Think "science documentary" rather than "physics textbook." The goal is to impress and engage while demonstrating technical skills and conceptual understanding of stellar evolution and gravitational physics.

## Target Audience
- Primary: Bootcamp instructors and colleagues (demo/portfolio piece)
- Secondary: Personal amusement and learning
- Demo Context: Should make a strong impression in 2-3 minute presentation

## Key Constraints
- Must run smoothly in web browser
- Should be demo-ready (not overly complex to explain)
- Balance realism with performance
- Prioritize visual impact over scientific precision

---

## Implementation Status

### ✅ Completed Features

**Phase 5: Random Stellar Remnants:**
- **50/50 Random Selection**: Each simulation run randomly creates either a black hole OR neutron star
- **Black Hole Implementation**:
  - Event horizon with shader-based spacetime distortion
  - Accretion disk with temperature gradients and rotation
  - Dynamic accretion streams (3 sources) with spiral orbital motion
  - Shader-based relativistic jets with flowing effects
  - Mass-based scaling (jets and event horizon grow with consumption)
  - Formation animations (4-second fade-in)
- **Neutron Star Implementation** (NEW):
  - Ultra-dense surface with custom shader (bluish-white, 1.5 unit radius)
  - Rotating pulsar beams with lighthouse effect
  - Magnetic field line visualization (12 curved lines)
  - Millisecond pulsar rotation (30 rotations/second)
  - Surface hotspot lights for accretion visualization
  - Mass growth with TOV limit enforcement (~2.5 solar masses)

**Technical Implementation:**
- Custom GLSL shaders (EventHorizonShader, AccretionDiskShader, JetTrailShader, NeutronStar surface shader, Pulsar beam shader)
- Particle systems with Keplerian orbital mechanics
- Real-time physics integration (gravity, angular momentum)
- Mass tracking and growth system for both remnant types
- Additive blending for luminous effects
- Phase enum with NEUTRON_STAR state
- Debug overlay support for neutron star stats

**Testing:**
- Playwright E2E tests to verify random remnant selection
- Multiple-run tests to confirm randomness (50/50 distribution)
- Visual element verification tests
- Console log verification for both branches

**Performance:**
- 60fps stable with 3000+ active particles
- Shader-based rendering for complex effects
- Optimized particle lifecycle management
- Neutron star adds minimal overhead (small geometry, efficient shaders)

### 🚧 In Progress

**Phase 5 Enhancements:**
- Gravitational lensing shader effects (planned)
- Photon sphere visualization (planned)
- Enhanced light-bending around event horizon

### 📋 Planned Features

**Earlier Phases (1-4):**
- Nebula collapse and stellar birth
- Main sequence star with solar activity
- Red giant expansion
- Supernova explosion and shockwave

**Polish & Effects:**
- Post-processing bloom/glow
- Enhanced camera controls
- Educational phase descriptions
- Sound effects (optional)

---

**Last Updated**: 2025-11-06
**Status**: Phase 5 (Black Hole) in active development - Early phases deferred
