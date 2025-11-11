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

  // Sound effects
  private sfxBuffers: Map<string, SoundEffect> = new Map()
  private activeSfxSources: AudioBufferSourceNode[] = []

  // Crossfade state
  private isCrossfading: boolean = false
  private crossfadeDuration: number = 3.0 // seconds

  // Background music (continuous underscore)
  private backgroundMusicBuffer: AudioBuffer | null = null
  private backgroundMusicSource: AudioBufferSourceNode | null = null
  private backgroundMusicVolume: number = 0.25 // Low volume to sit under ambients

  // Preloaded raw audio data (fetched before AudioContext creation)
  private preloadedAudioData: Map<string, ArrayBuffer> = new Map()
  private isPreloaded: boolean = false

  // Essential audio loading state
  private essentialAudioReady: boolean = false
  private audioLoadingCallbacks: Set<() => void> = new Set()
  private pendingPhaseRequests: Map<SimulationPhase, boolean> = new Map()

  constructor() {
    this.setupPhaseAudioConfig()
    this.setupSoundEffectsConfig()
  }

  /**
   * Preload audio files as raw ArrayBuffers (can be called before user interaction)
   * This fetches all audio files in the background without creating an AudioContext
   */
  async preloadAudioFiles(): Promise<void> {
    if (this.isPreloaded) {
      return
    }


    const filesToPreload: Map<string, string> = new Map()

    // Phase audio
    for (const [phase, config] of this.phaseAudioConfig) {
      filesToPreload.set(`phase_${phase}`, config.url)
    }

    // Sound effects
    filesToPreload.set('sfx_ignition-burst', '/audio/sfx/ignition-burst.mp3')
    filesToPreload.set('sfx_accretion-chunk', '/audio/sfx/accretion-chunk.mp3')
    filesToPreload.set('sfx_explosion-flash', '/audio/sfx/explosion-flash.mp3')
    filesToPreload.set('sfx_gravitational-rumble', '/audio/sfx/gravitational-rumble.mp3')

    // Background music
    filesToPreload.set('background-music', '/audio/background-music.mp3')

    // Fetch all files in parallel
    const fetchPromises = Array.from(filesToPreload.entries()).map(async ([key, url]) => {
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        this.preloadedAudioData.set(key, arrayBuffer)
      } catch (error) {
        console.warn(`[AUDIO] Failed to preload ${key}:`, error)
      }
    })

    await Promise.all(fetchPromises)
    this.isPreloaded = true
  }

  /**
   * Check if audio files have been preloaded
   */
  isPreloadComplete(): boolean {
    return this.isPreloaded
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

    // Supernova uses only the explosion-flash sound effect, no ambient track
    // (The phase is brief and the sound effect is dramatic enough)

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

      // Decode essential audio (nebula + background music) - wait for this!
      await this.decodeEssentialAudio()

      // Decode remaining audio in background (doesn't block)
      this.decodeRemainingAudio()
    } catch (error) {
      console.error('[AUDIO] Failed to initialize AudioContext:', error)
    }
  }

  /**
   * Decode only essential audio for immediate playback (nebula + background music)
   */
  private async decodeEssentialAudio(): Promise<void> {
    if (!this.context) return


    // Decode nebula phase audio (first phase)
    try {
      const nebulaConfig = this.phaseAudioConfig.get(SimulationPhase.NEBULA_COLLAPSE)
      if (nebulaConfig) {
        const buffer = await this.decodeAudioFile('phase_NEBULA_COLLAPSE', nebulaConfig.url)
        this.phaseAudioBuffers.set(SimulationPhase.NEBULA_COLLAPSE, buffer)
      }
    } catch (error) {
      console.warn('[AUDIO] Failed to decode nebula audio:', error)
    }

    // Decode background music
    try {
      const buffer = await this.decodeAudioFile('background-music', '/audio/background-music.mp3')
      this.backgroundMusicBuffer = buffer
    } catch (error) {
      console.warn('[AUDIO] Failed to decode background music:', error)
    }


    // Mark as ready and notify callbacks
    this.essentialAudioReady = true
    this.notifyAudioReady()

    // Process any pending phase playback requests
    this.processPendingPhaseRequests()
  }

  /**
   * Decode remaining audio in background (doesn't block simulation start)
   */
  private async decodeRemainingAudio(): Promise<void> {
    if (!this.context) return


    // Decode remaining phase audio
    const remainingPhases = [
      SimulationPhase.MAIN_SEQUENCE,
      SimulationPhase.RED_GIANT,
      SimulationPhase.BLACK_HOLE
    ]

    for (const phase of remainingPhases) {
      try {
        const config = this.phaseAudioConfig.get(phase)
        if (config) {
          const buffer = await this.decodeAudioFile(`phase_${phase}`, config.url)
          this.phaseAudioBuffers.set(phase, buffer)
        }
      } catch (error) {
        console.warn(`[AUDIO] Failed to decode ${phase} audio:`, error)
      }
    }

    // Decode sound effects
    const sfxMap: Map<string, string> = new Map([
      ['ignition-burst', '/audio/sfx/ignition-burst.mp3'],
      ['accretion-chunk', '/audio/sfx/accretion-chunk.mp3'],
      ['explosion-flash', '/audio/sfx/explosion-flash.mp3'],
      ['gravitational-rumble', '/audio/sfx/gravitational-rumble.mp3']
    ])

    for (const [name, url] of sfxMap) {
      try {
        const buffer = await this.decodeAudioFile(`sfx_${name}`, url)
        const sfx = this.sfxBuffers.get(name)
        if (sfx) {
          sfx.buffer = buffer
        }
      } catch (error) {
        console.warn(`[AUDIO] Failed to decode ${name} SFX:`, error)
      }
    }

  }

  /**
   * Decode an audio file into an AudioBuffer (uses preloaded data if available)
   * @param key - Preload key for this audio file
   * @param url - Fallback URL if not preloaded
   */
  private async decodeAudioFile(key: string, url: string): Promise<AudioBuffer> {
    if (!this.context) {
      throw new Error('AudioContext not initialized')
    }

    // Check if we have preloaded data
    let arrayBuffer = this.preloadedAudioData.get(key)

    if (!arrayBuffer) {
      // Fallback: fetch now if not preloaded
      const response = await fetch(url)
      arrayBuffer = await response.arrayBuffer()
    }

    // Decode the audio data
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

    // Free memory: delete preloaded data after successful decode
    if (this.preloadedAudioData.has(key)) {
      this.preloadedAudioData.delete(key)
    }

    return audioBuffer
  }

  /**
   * Start playing audio for a specific phase
   * If audio isn't ready yet, queues the request to play when available
   */
  playPhase(phase: SimulationPhase): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot play - not initialized')
      return
    }

    const buffer = this.phaseAudioBuffers.get(phase)
    const config = this.phaseAudioConfig.get(phase)

    if (!buffer || !config) {
      // Audio not loaded yet - queue for later if it's an essential phase
      if (!this.essentialAudioReady && phase === SimulationPhase.NEBULA_COLLAPSE) {
        this.pendingPhaseRequests.set(phase, true)
        return
      }

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
      currentGain.gain.linearRampToValueAtTime(0, now + duration)

      // Stop current source after fade completes
      setTimeout(() => {
        currentSource.stop()
      }, duration * 1000)
    }

    // Fade in next phase
    const targetVolume = nextConfig.volume * (this.isMuted ? 0 : 1)
    nextGainNode.gain.cancelScheduledValues(now)
    nextGainNode.gain.setValueAtTime(0, now)
    nextGainNode.gain.linearRampToValueAtTime(targetVolume, now + duration)

    // Update references
    this.currentPhaseSource = nextSource
    this.currentPhaseGain = nextGainNode

    // Reset crossfade flag after completion
    setTimeout(() => {
      this.isCrossfading = false
    }, duration * 1000)

  }

  /**
   * Start playing background music (continuous underscore beneath phase audio)
   */
  playBackgroundMusic(): void {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      console.warn('[AUDIO] Cannot play background music - not initialized')
      return
    }

    if (!this.backgroundMusicBuffer) {
      console.warn('[AUDIO] Background music not loaded')
      return
    }

    // Stop existing background music if playing
    if (this.backgroundMusicSource) {
      this.backgroundMusicSource.stop()
      this.backgroundMusicSource = null
    }

    // Create source
    const source = this.context.createBufferSource()
    source.buffer = this.backgroundMusicBuffer
    source.loop = true

    // Create gain node for background music
    const gainNode = this.context.createGain()
    gainNode.gain.value = this.backgroundMusicVolume * (this.isMuted ? 0 : 1)

    // Connect: source → gainNode → masterGain → destination
    source.connect(gainNode)
    gainNode.connect(this.masterGain)

    // Start playback
    source.start(0)

    // Store reference
    this.backgroundMusicSource = source

  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    if (this.backgroundMusicSource) {
      this.backgroundMusicSource.stop()
      this.backgroundMusicSource = null
    }
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

  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))

    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume * (this.isMuted ? 0 : 1)
    }

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
   * Notify all callbacks that essential audio is ready
   */
  private notifyAudioReady(): void {
    this.audioLoadingCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('[AUDIO] Error in audio ready callback:', error)
      }
    })
    // Clear callbacks after notifying
    this.audioLoadingCallbacks.clear()
  }

  /**
   * Process any pending phase playback requests
   */
  private processPendingPhaseRequests(): void {
    this.pendingPhaseRequests.forEach((_, phase) => {
      this.playPhase(phase)
    })
    this.pendingPhaseRequests.clear()
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

    // Stop background music
    this.stopBackgroundMusic()

    // Stop all active sound effects
    this.activeSfxSources.forEach(source => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.activeSfxSources = []

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
  }

  /**
   * Check if audio system is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.context !== null
  }

  /**
   * Check if essential audio (nebula + background music) is decoded and ready
   */
  isEssentialAudioReady(): boolean {
    return this.essentialAudioReady
  }

  /**
   * Register a callback to be notified when essential audio is ready
   * If audio is already ready, callback is invoked immediately
   */
  onEssentialAudioReady(callback: () => void): void {
    if (this.essentialAudioReady) {
      // Audio already ready, invoke immediately
      callback()
    } else {
      // Queue for later
      this.audioLoadingCallbacks.add(callback)
    }
  }

  /**
   * Get audio context state (for debugging)
   */
  getState(): string {
    return this.context?.state ?? 'not-initialized'
  }
}
