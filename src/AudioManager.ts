/**
 * AudioManager - Handles all audio playback for the stellar evolution simulation
 *
 * Features:
 * - Smooth crossfading between phase soundscapes
 * - Event-based sound effects with spatial audio
 * - Master volume and mute controls
 * - Browser autoplay policy handling
 * - Preloading and buffering optimization
 */

export enum SimulationPhase {
  NEBULA_COLLAPSE = 'NEBULA_COLLAPSE',
  MAIN_SEQUENCE = 'MAIN_SEQUENCE',
  RED_GIANT = 'RED_GIANT',
  SUPERNOVA = 'SUPERNOVA',
  BLACK_HOLE = 'BLACK_HOLE'
}

interface AudioConfig {
  url: string
  loop: boolean
  volume: number
}

interface SoundEffect {
  buffer: AudioBuffer | null
  volume: number
  loop: boolean
}

export class AudioManager {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isInitialized: boolean = false
  private isMuted: boolean = false
  private masterVolume: number = 0.7

  // Phase audio management
  private phaseAudioBuffers: Map<SimulationPhase, AudioBuffer | null> = new Map()
  private phaseAudioConfig: Map<SimulationPhase, AudioConfig> = new Map()
  private currentPhaseSource: AudioBufferSourceNode | null = null
  private currentPhaseGain: GainNode | null = null
  private currentPhase: SimulationPhase | null = null

  // Sound effects
  private sfxBuffers: Map<string, SoundEffect> = new Map()
  private activeSfxSources: AudioBufferSourceNode[] = []

  // Crossfade state
  private isCrossfading: boolean = false
  private crossfadeDuration: number = 3.0 // seconds

  constructor() {
    this.setupPhaseAudioConfig()
    this.setupSoundEffectsConfig()
  }

  /**
   * Configure audio file paths and settings for each phase
   */
  private setupPhaseAudioConfig(): void {
    this.phaseAudioConfig.set(SimulationPhase.NEBULA_COLLAPSE, {
      url: '/audio/nebula-collapse.mp3',
      loop: true,
      volume: 0.8
    })

    this.phaseAudioConfig.set(SimulationPhase.MAIN_SEQUENCE, {
      url: '/audio/main-sequence.mp3',
      loop: true,
      volume: 0.6
    })

    this.phaseAudioConfig.set(SimulationPhase.RED_GIANT, {
      url: '/audio/red-giant.mp3',
      loop: true,
      volume: 0.7
    })

    this.phaseAudioConfig.set(SimulationPhase.SUPERNOVA, {
      url: '/audio/supernova.mp3',
      loop: false, // One-shot explosion
      volume: 1.0
    })

    this.phaseAudioConfig.set(SimulationPhase.BLACK_HOLE, {
      url: '/audio/black-hole.mp3',
      loop: true,
      volume: 0.5
    })
  }

  /**
   * Configure sound effect file paths and settings
   */
  private setupSoundEffectsConfig(): void {
    this.sfxBuffers.set('ignition-burst', {
      buffer: null,
      volume: 0.8,
      loop: false
    })

    this.sfxBuffers.set('accretion-chunk', {
      buffer: null,
      volume: 0.4,
      loop: false
    })

    this.sfxBuffers.set('explosion-flash', {
      buffer: null,
      volume: 0.9,
      loop: false
    })

    this.sfxBuffers.set('gravitational-rumble', {
      buffer: null,
      volume: 0.6,
      loop: false
    })
  }

  /**
   * Initialize the Web Audio API context (requires user interaction)
   * Call this on the "Begin Simulation" button click
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[AUDIO] Already initialized')
      return
    }

    try {
      // Create audio context
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create master gain node for volume control
      this.masterGain = this.context.createGain()
      this.masterGain.connect(this.context.destination)
      this.masterGain.gain.value = this.masterVolume

      this.isInitialized = true
      console.log('[AUDIO] AudioManager initialized successfully')

      // Load audio files before resolving (prevents race condition)
      await this.preloadAudio()
    } catch (error) {
      console.error('[AUDIO] Failed to initialize AudioContext:', error)
    }
  }

  /**
   * Preload all audio files to avoid delays during playback
   */
  private async preloadAudio(): Promise<void> {
    if (!this.context) return

    console.log('[AUDIO] Starting audio preload...')

    // Load phase audio
    for (const [phase, config] of this.phaseAudioConfig) {
      try {
        const buffer = await this.loadAudioFile(config.url)
        this.phaseAudioBuffers.set(phase, buffer)
        console.log(`[AUDIO] Loaded phase audio: ${phase}`)
      } catch (error) {
        console.warn(`[AUDIO] Failed to load ${phase} audio:`, error)
        this.phaseAudioBuffers.set(phase, null)
      }
    }

    // Load sound effects
    const sfxUrls: Map<string, string> = new Map([
      ['ignition-burst', '/audio/sfx/ignition-burst.mp3'],
      ['accretion-chunk', '/audio/sfx/accretion-chunk.mp3'],
      ['explosion-flash', '/audio/sfx/explosion-flash.mp3'],
      ['gravitational-rumble', '/audio/sfx/gravitational-rumble.mp3']
    ])

    for (const [name, url] of sfxUrls) {
      try {
        const buffer = await this.loadAudioFile(url)
        const sfx = this.sfxBuffers.get(name)
        if (sfx) {
          sfx.buffer = buffer
          console.log(`[AUDIO] Loaded sound effect: ${name}`)
        }
      } catch (error) {
        console.warn(`[AUDIO] Failed to load ${name} SFX:`, error)
      }
    }

    console.log('[AUDIO] Audio preload complete')
  }

  /**
   * Load an audio file and decode it into an AudioBuffer
   */
  private async loadAudioFile(url: string): Promise<AudioBuffer> {
    if (!this.context) {
      throw new Error('AudioContext not initialized')
    }

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer)
    return audioBuffer
  }

  /**
   * Start playing audio for a specific phase
   */
  playPhase(phase: SimulationPhase): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot play - not initialized')
      return
    }

    const buffer = this.phaseAudioBuffers.get(phase)
    const config = this.phaseAudioConfig.get(phase)

    if (!buffer || !config) {
      console.warn(`[AUDIO] No audio loaded for phase: ${phase}`)
      return
    }

    // Stop current phase audio if playing
    if (this.currentPhaseSource) {
      this.currentPhaseSource.stop()
      this.currentPhaseSource = null
    }

    // Create new source
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = config.loop

    // Create gain node for this phase
    const gainNode = this.context.createGain()
    gainNode.gain.value = config.volume * (this.isMuted ? 0 : 1)

    // Connect: source → gainNode → masterGain → destination
    source.connect(gainNode)
    gainNode.connect(this.masterGain)

    // Start playback
    source.start(0)

    // Store references
    this.currentPhaseSource = source
    this.currentPhaseGain = gainNode
    this.currentPhase = phase

    console.log(`[AUDIO] Playing phase: ${phase}`)
  }

  /**
   * Smoothly transition from current phase to next phase with crossfade
   */
  transitionToPhase(nextPhase: SimulationPhase, fadeTime?: number): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot transition - not initialized')
      return
    }

    if (this.isCrossfading) {
      console.warn('[AUDIO] Already crossfading, ignoring transition request')
      return
    }

    const duration = fadeTime ?? this.crossfadeDuration
    const nextBuffer = this.phaseAudioBuffers.get(nextPhase)
    const nextConfig = this.phaseAudioConfig.get(nextPhase)

    if (!nextBuffer || !nextConfig) {
      console.warn(`[AUDIO] No audio loaded for next phase: ${nextPhase}`)
      // Fallback to direct play
      this.playPhase(nextPhase)
      return
    }

    this.isCrossfading = true

    // Create next phase source
    const nextSource = this.context.createBufferSource()
    nextSource.buffer = nextBuffer
    nextSource.loop = nextConfig.loop

    // Create gain node for next phase (start silent)
    const nextGainNode = this.context.createGain()
    nextGainNode.gain.value = 0

    // Connect next source
    nextSource.connect(nextGainNode)
    nextGainNode.connect(this.masterGain)

    // Start next source
    nextSource.start(0)

    const now = this.context.currentTime

    // Fade out current phase
    if (this.currentPhaseGain && this.currentPhaseSource) {
      const currentGain = this.currentPhaseGain
      const currentSource = this.currentPhaseSource

      currentGain.gain.cancelScheduledValues(now)
      currentGain.gain.setValueAtTime(currentGain.gain.value, now)
      currentGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

      // Stop current source after fade completes
      setTimeout(() => {
        currentSource.stop()
      }, duration * 1000)
    }

    // Fade in next phase
    const targetVolume = nextConfig.volume * (this.isMuted ? 0 : 1)
    nextGainNode.gain.cancelScheduledValues(now)
    nextGainNode.gain.setValueAtTime(0.001, now)
    nextGainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVolume), now + duration)

    // Update references
    this.currentPhaseSource = nextSource
    this.currentPhaseGain = nextGainNode
    this.currentPhase = nextPhase

    // Reset crossfade flag after completion
    setTimeout(() => {
      this.isCrossfading = false
    }, duration * 1000)

    console.log(`[AUDIO] Crossfading to ${nextPhase} over ${duration}s`)
  }

  /**
   * Play a one-shot sound effect
   * @param name - Sound effect identifier
   * @param volume - Optional volume multiplier (0-1)
   * @param pan - Optional stereo panning (-1 = left, 0 = center, 1 = right)
   */
  playSoundEffect(name: string, volume?: number, pan?: number): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot play SFX - not initialized')
      return
    }

    const sfx = this.sfxBuffers.get(name)
    if (!sfx || !sfx.buffer) {
      console.warn(`[AUDIO] Sound effect not loaded: ${name}`)
      return
    }

    // Create source
    const source = this.context.createBufferSource()
    source.buffer = sfx.buffer
    source.loop = sfx.loop

    // Create gain node
    const gainNode = this.context.createGain()
    const effectiveVolume = (volume ?? sfx.volume) * (this.isMuted ? 0 : 1)
    gainNode.gain.value = effectiveVolume

    // Optional stereo panning
    if (pan !== undefined) {
      const panNode = this.context.createStereoPanner()
      panNode.pan.value = Math.max(-1, Math.min(1, pan))
      source.connect(gainNode)
      gainNode.connect(panNode)
      panNode.connect(this.masterGain)
    } else {
      source.connect(gainNode)
      gainNode.connect(this.masterGain)
    }

    // Start playback
    source.start(0)

    // Track active SFX
    this.activeSfxSources.push(source)

    // Clean up after playback
    source.onended = () => {
      const index = this.activeSfxSources.indexOf(source)
      if (index > -1) {
        this.activeSfxSources.splice(index, 1)
      }
    }

    console.log(`[AUDIO] Playing SFX: ${name}`)
  }

  /**
   * Play a spatial sound effect with 3D positioning
   * @param name - Sound effect identifier
   * @param x - X position in world space
   * @param y - Y position in world space
   * @param z - Z position in world space
   */
  playSpatialSoundEffect(name: string, x: number, y: number, z: number): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot play spatial SFX - not initialized')
      return
    }

    const sfx = this.sfxBuffers.get(name)
    if (!sfx || !sfx.buffer) {
      console.warn(`[AUDIO] Sound effect not loaded: ${name}`)
      return
    }

    // Create source
    const source = this.context.createBufferSource()
    source.buffer = sfx.buffer
    source.loop = sfx.loop

    // Create gain node
    const gainNode = this.context.createGain()
    gainNode.gain.value = sfx.volume * (this.isMuted ? 0 : 1)

    // Create panner node for spatial audio
    const panner = this.context.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 10
    panner.maxDistance = 200
    panner.rolloffFactor = 1
    panner.coneInnerAngle = 360
    panner.coneOuterAngle = 0
    panner.coneOuterGain = 0

    // Set position
    panner.positionX.value = x
    panner.positionY.value = y
    panner.positionZ.value = z

    // Connect: source → gain → panner → masterGain → destination
    source.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.masterGain)

    // Start playback
    source.start(0)

    // Track active SFX
    this.activeSfxSources.push(source)

    // Clean up after playback
    source.onended = () => {
      const index = this.activeSfxSources.indexOf(source)
      if (index > -1) {
        this.activeSfxSources.splice(index, 1)
      }
    }

    console.log(`[AUDIO] Playing spatial SFX: ${name} at (${x}, ${y}, ${z})`)
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))

    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume * (this.isMuted ? 0 : 1)
    }

    console.log(`[AUDIO] Master volume: ${(this.masterVolume * 100).toFixed(0)}%`)
  }

  /**
   * Get current master volume (0-1)
   */
  getVolume(): number {
    return this.masterVolume
  }

  /**
   * Toggle mute on/off
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted
    this.updateMuteState()
    console.log(`[AUDIO] ${this.isMuted ? 'Muted' : 'Unmuted'}`)
  }

  /**
   * Set mute state explicitly
   */
  setMute(muted: boolean): void {
    this.isMuted = muted
    this.updateMuteState()
  }

  /**
   * Get current mute state
   */
  isMutedState(): boolean {
    return this.isMuted
  }

  /**
   * Update audio gain based on mute state
   */
  private updateMuteState(): void {
    if (!this.context || !this.masterGain) return

    const now = this.context.currentTime
    const targetVolume = this.isMuted ? 0 : this.masterVolume

    // Smooth transition to avoid audio pops
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
    this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + 0.1)
  }

  /**
   * Stop all audio playback
   */
  stopAll(): void {
    // Stop phase audio
    if (this.currentPhaseSource) {
      this.currentPhaseSource.stop()
      this.currentPhaseSource = null
    }

    // Stop all active sound effects
    this.activeSfxSources.forEach(source => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.activeSfxSources = []

    console.log('[AUDIO] All audio stopped')
  }

  /**
   * Clean up and dispose audio resources
   */
  dispose(): void {
    this.stopAll()

    if (this.context) {
      this.context.close()
      this.context = null
    }

    this.isInitialized = false
    console.log('[AUDIO] AudioManager disposed')
  }

  /**
   * Check if audio system is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.context !== null
  }

  /**
   * Get audio context state (for debugging)
   */
  getState(): string {
    return this.context?.state ?? 'not-initialized'
  }
}
