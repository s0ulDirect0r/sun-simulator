# Sun Simulator - Audio Guide

This guide will help you source and prepare audio files for the stellar evolution simulation.

## Required Audio Files

### Phase Soundscapes (Looping Background Audio)

Place these files in `/public/audio/`:

1. **nebula-collapse.mp3** - Nebula phase ambient sound
   - Character: Deep rumbles, swirling wind, particles coalescing
   - Duration: 30-60 seconds (will loop)
   - Suggested keywords: "space ambience", "nebula", "cosmic wind", "gas cloud"

2. **main-sequence.mp3** - Main sequence star ambient sound
   - Character: Steady hum, crackling plasma, warm power
   - Duration: 30-60 seconds (will loop)
   - Suggested keywords: "fusion reactor", "solar wind", "corona", "star hum"

3. **red-giant.mp3** - Red giant phase ambient sound
   - Character: Deeper rumble, unstable pulsing, ominous atmosphere
   - Duration: 30-60 seconds (will loop)
   - Suggested keywords: "deep drone", "pulsating", "unstable", "ominous space"

4. **supernova.mp3** - Supernova explosion (one-shot)
   - Character: LOUD explosion, shockwave, chaotic energy
   - Duration: 8-12 seconds (plays once, no loop)
   - Suggested keywords: "massive explosion", "shockwave", "cosmic explosion", "supernova"

5. **black-hole.mp3** - Black hole phase ambient sound
   - Character: Eerie silence + accretion disk hiss, gravitational hum
   - Duration: 30-60 seconds (will loop)
   - Suggested keywords: "eerie space", "accretion", "gravitational", "void"

### Sound Effects (One-Shot Sounds)

Place these files in `/public/audio/sfx/`:

1. **ignition-burst.mp3** - Fusion ignition (nebula → main sequence)
   - Character: Sudden powerful ignition, energy release
   - Duration: 2-4 seconds
   - Suggested keywords: "ignition", "power up", "energy burst"

2. **accretion-chunk.mp3** - Matter hitting accretion disk
   - Character: Subtle impact, particle collision
   - Duration: 0.5-1 second
   - Suggested keywords: "impact", "debris", "particle hit"

3. **explosion-flash.mp3** - Supernova flash moment
   - Character: Intense bright explosion peak
   - Duration: 1-2 seconds
   - Suggested keywords: "flash", "bright explosion", "energy release"

4. **gravitational-rumble.mp3** - Spacetime warping effect
   - Character: Low-frequency rumble, distortion
   - Duration: 2-3 seconds
   - Suggested keywords: "rumble", "low frequency", "distortion", "gravity"

## Recommended Sources

### Free & Open Sources

1. **Freesound.org** (https://freesound.org)
   - License: CC0 (public domain) or CC-BY (attribution required)
   - Largest community sound library
   - Search tips: Use specific keywords from above
   - Download as MP3 or convert from WAV

2. **NASA Audio Library** (https://www.nasa.gov/audio-and-ringtones/)
   - License: Public domain (NASA content)
   - Real space sounds (converted from radio waves)
   - Excellent for authentic nebula, pulsar, and cosmic sounds

3. **BBC Sound Effects** (https://sound-effects.bbcrewind.co.uk/)
   - License: RemArc (free for personal/educational use)
   - Professional quality recordings
   - Search "space", "rumble", "explosion", etc.

4. **Archive.org Audio Collection** (https://archive.org/details/audio)
   - License: Various (check individual items)
   - Massive public domain collection
   - Search "space sounds", "ambient", "explosion"

### Synthesis/Generation Options

If you can't find suitable sounds, you can generate them:

1. **tone.js** (https://tonejs.github.io/)
   - Generate drones, oscillations, noise
   - Perfect for nebula ambience and star hums

2. **Audacity** (Free audio editor)
   - Generate noise → filter → process
   - Create custom rumbles and drones
   - Effects: reverb, pitch shift, distortion

## Audio Specifications

- **Format**: MP3 (best browser compatibility)
- **Sample Rate**: 44.1kHz or 48kHz
- **Bit Rate**: 128-192 kbps (good quality, reasonable file size)
- **Channels**: Stereo recommended (mono acceptable)
- **File Size Target**:
  - Phase soundscapes: 1-3 MB each
  - Sound effects: 50-200 KB each

## Processing Tips

1. **Normalization**: Ensure consistent volume levels across all files
2. **Looping**: For looping files, ensure smooth fade-in/fade-out at loop points
3. **Compression**: Use MP3 compression to keep file sizes manageable
4. **EQ**: Apply low-pass filters for deep space rumbles, high-pass for plasma crackles

## Quick Start Example

To get started quickly with placeholder sounds:

1. Visit Freesound.org
2. Search for:
   - "space ambience" → download for nebula-collapse.mp3
   - "reactor hum" → download for main-sequence.mp3
   - "deep drone" → download for red-giant.mp3
   - "explosion" → download for supernova.mp3
   - "eerie atmosphere" → download for black-hole.mp3
3. Convert to MP3 if needed (use Audacity or online converter)
4. Rename files to match the required names above
5. Place in appropriate directories

## Testing

After adding audio files:

1. Run the development server: `npm run dev`
2. Open browser console to check for audio loading logs
3. Click "Begin Simulation" to trigger audio initialization
4. Use the volume slider and mute button to verify controls work
5. Watch phase transitions to hear crossfading

## Troubleshooting

- **No audio playing**: Check browser console for 404 errors (missing files)
- **Audio cuts off**: Ensure MP3 files are properly encoded
- **Clicking/popping**: Add short fade-in/fade-out (10-50ms) in Audacity
- **Volume too low**: Normalize audio to -1dB or -3dB in audio editor
- **File won't load**: Check file path matches exactly (case-sensitive)

## Attribution

If using CC-BY licensed sounds from Freesound, add attribution to your project:

```markdown
## Audio Credits

- nebula-collapse.mp3: "Space Ambience" by [Artist] (Freesound) - CC-BY 4.0
- main-sequence.mp3: "Reactor Hum" by [Artist] (Freesound) - CC-BY 4.0
...
```

## Next Steps

Once you have the audio files in place:

1. Test the simulation with sound enabled
2. Adjust crossfade timings in `AudioManager.ts` if needed
3. Fine-tune volume levels for each phase
4. Add additional sound effects for extra polish (optional)

---

**Note**: The AudioManager is fully implemented and ready to play these files as soon as you add them to the correct directories. No code changes needed - just drop in the audio files!
