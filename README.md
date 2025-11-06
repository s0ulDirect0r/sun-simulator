# ☀️ Stellar Evolution Simulator

An interactive, real-time 3D visualization of the complete lifecycle of a massive star, from nebula to black hole. Built with Three.js and TypeScript.

## ✨ Features

### Complete Stellar Lifecycle
- **Phase 1: Nebula Collapse** - Watch a colorful gas cloud collapse under gravity with realistic particle dynamics
- **Phase 2: Main Sequence Star** - Witness fusion ignition and stable stellar burning with corona effects
- **Phase 3: Red Giant Expansion** - See the star swell massively as hydrogen depletes
- **Phase 4: Supernova** - Experience a catastrophic explosion with multi-ring shockwaves and camera shake
- **Phase 5: Black Hole** - Marvel at the accretion disk, jets, and gravitational lensing effects

### Planetary System
- 4 planets (Mercury, Venus, Earth, Mars) with realistic orbits
- Planets get dramatically engulfed during red giant phase
- Atmospheric effects for Earth and Venus

### Visual Effects
- **Multi-color nebula** with blue (oxygen), purple (hydrogen-alpha), pink (hydrogen), and orange (sulfur) regions
- **Starfield background** with 10,000 stars in varied colors and sizes
- **Cinematic post-processing** with film grain and vignette effects
- **Bloom effects** that intensify during supernova
- **Accretion disk** with temperature-based coloring (blue-white to red-orange)
- **Polar jets** shooting matter from black hole
- **Supernova remnant** with expanding multi-color shells

### Interactive Controls
- **Play/Pause** - Space bar or button
- **Speed Control** - 0.1x to 5.0x simulation speed
- **Reset** - R key or button
- **Fullscreen** - F key or button
- **Camera Controls** - Mouse drag to rotate, scroll to zoom

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🎮 Controls

### Mouse
- **Left Click + Drag** - Rotate camera
- **Scroll Wheel** - Zoom in/out

### Keyboard
- **Space** - Play/Pause
- **R** - Reset simulation
- **F** - Toggle fullscreen

### UI Buttons
- Speed slider for fine-tuned control
- Real-time phase descriptions

## 🎨 Technical Highlights

- **20,000 particle nebula** with gravitational physics
- **Real-time particle dynamics** for stellar wind and explosions
- **Custom shader passes** for film grain and vignette
- **Planet engulfment detection** during red giant phase
- **Dynamic bloom intensity** synchronized with supernova
- **Smooth phase transitions** with fade effects
- **Educational descriptions** for each phase

## 📚 Technologies

- **Three.js** - 3D rendering engine
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **WebGL** - Hardware-accelerated graphics

## 🌟 Demo-Ready

This project is designed to be impressive in a 2-3 minute demo, showcasing:
- Advanced 3D graphics programming
- Real-time particle systems (28,000+ particles)
- Custom post-processing effects
- Interactive controls and UI design
- Physics simulation concepts
- Creative scientific visualization

## 🎯 Project Philosophy

"Spectacular Science" - Prioritizing visual drama and impressive effects while maintaining enough scientific grounding to justify calling it a simulator. Think science documentary, not physics textbook.

---

Built with ❤️ and lots of particles
