import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { Star } from '../src/Star'

describe('Star - Phase 2 Stellar Wind Enhancements', () => {
  let scene: THREE.Scene
  let star: Star

  beforeEach(() => {
    scene = new THREE.Scene()
    star = new Star(scene, 4.8)
  })

  describe('Particle Count', () => {
    it('should have 1200 particles in stellar wind (sweet spot between 900 and 1800)', () => {
      const particleCount = star.surfaceParticles.geometry.attributes.position.count
      expect(particleCount).toBe(1200)
    })

    it('should match internal surfaceCount property', () => {
      const snapshot = star.getDebugSnapshot()
      expect(snapshot.particleCount).toBe(1200)
    })
  })

  describe('Particle Colors - Bright Yellow-White', () => {
    it('should use bright yellow-white colors (not orange)', () => {
      const snapshot = star.getDebugSnapshot()

      // Check first particle color
      expect(snapshot.colors.first.r).toBe(1.0)
      expect(snapshot.colors.first.g).toBeCloseTo(0.98, 2) // Nearly white
      expect(snapshot.colors.first.b).toBeCloseTo(0.85, 2) // Slight warm tint

      // Verify it's NOT orange (orange would be ~0.6 green)
      expect(snapshot.colors.first.g).toBeGreaterThan(0.8)
    })

    it('should have consistent bright colors across all particles', () => {
      const snapshot = star.getDebugSnapshot()

      // Average should be close to (1.0, 0.98, 0.85)
      expect(snapshot.colors.average.r).toBeCloseTo(1.0, 1)
      expect(snapshot.colors.average.g).toBeGreaterThan(0.95)
      expect(snapshot.colors.average.b).toBeGreaterThan(0.8)
    })
  })

  describe('Particle Sizes - Larger but Subtle', () => {
    it('should have larger particle sizes (0.5-1.0 range)', () => {
      const snapshot = star.getDebugSnapshot()

      // Check min/max bounds
      expect(snapshot.sizes.min).toBeGreaterThanOrEqual(0.5)
      expect(snapshot.sizes.max).toBeLessThanOrEqual(1.0)
    })

    it('should have average size around 0.75 (midpoint of 0.5-1.0)', () => {
      const snapshot = star.getDebugSnapshot()

      // Average should be roughly in the middle of the range
      expect(snapshot.sizes.average).toBeGreaterThan(0.6)
      expect(snapshot.sizes.average).toBeLessThan(0.9)
    })

    it('should be approximately 1.5-2x larger than old sizes (0.3-0.6)', () => {
      const snapshot = star.getDebugSnapshot()

      // Old average was ~0.45, new should be ~0.75
      expect(snapshot.sizes.average).toBeGreaterThan(0.45 * 1.4) // At least 1.4x larger
    })
  })

  describe('Shader Enhancements - Streak Effect', () => {
    it('should use streak shader with velocity-based elongation', () => {
      const snapshot = star.getDebugSnapshot()

      // Verify shader contains streak code
      expect(snapshot.shader.hasStreakCode).toBe(true)
    })

    it('should boost color intensity by 1.3x for bloom', () => {
      const material = star.surfaceParticles.material as THREE.ShaderMaterial

      // Check for the subtle brightness boost in full shader code
      const hasBoost = material.fragmentShader.includes('vColor * 1.3')
      expect(hasBoost).toBe(true)
    })

    it('should use custom ShaderMaterial (not standard PointsMaterial)', () => {
      expect(star.surfaceParticles.material).toBeInstanceOf(THREE.ShaderMaterial)
    })

    it('should have additive blending for glow effect', () => {
      const material = star.surfaceParticles.material as THREE.ShaderMaterial
      expect(material.blending).toBe(THREE.AdditiveBlending)
    })
  })

  describe('Flickering Effect - Time-Based Animation', () => {
    it('should update particle sizes over time (flickering)', () => {
      const initialSnapshot = star.getDebugSnapshot()
      const initialSizes = [...initialSnapshot.sizes.sample]

      // Advance time by 1 second (60 frames at 60 FPS)
      for (let i = 0; i < 60; i++) {
        star.update(1 / 60)
      }

      const updatedSnapshot = star.getDebugSnapshot()
      const updatedSizes = updatedSnapshot.sizes.sample

      // Sizes should have changed due to flickering
      expect(initialSizes).not.toEqual(updatedSizes)
    })

    it('should keep sizes within valid range during flickering (80-120%)', () => {
      // Advance time significantly
      for (let i = 0; i < 120; i++) {
        star.update(1 / 60)
      }

      const snapshot = star.getDebugSnapshot()

      // Should still be in valid range (0.5*0.8 to 1.0*1.2)
      expect(snapshot.sizes.min).toBeGreaterThanOrEqual(0.5 * 0.8 - 0.1) // Small tolerance
      expect(snapshot.sizes.max).toBeLessThanOrEqual(1.0 * 1.2 + 0.1)
    })

    it('should flicker continuously (not just once)', () => {
      const snapshots = []

      for (let t = 0; t < 5; t++) {
        // Sample at different times
        for (let i = 0; i < 30; i++) {
          star.update(1 / 60) // 0.5 second intervals
        }
        snapshots.push(star.getDebugSnapshot().sizes.sample[0])
      }

      // Should have variation across samples
      const uniqueSizes = new Set(snapshots)
      expect(uniqueSizes.size).toBeGreaterThan(1)
    })
  })

  describe('Initial State - Main Sequence Phase', () => {
    it('should start in main sequence phase (not red giant or supernova)', () => {
      const snapshot = star.getDebugSnapshot()

      expect(snapshot.state.isRedGiant).toBe(false)
      expect(snapshot.state.isSupernova).toBe(false)
    })

    it('should have correct initial radius (4.0 units)', () => {
      const snapshot = star.getDebugSnapshot()

      // currentRadius starts at initialRadius (4.8) then contracts to 4.0
      expect(snapshot.state.currentRadius).toBeGreaterThan(3.9)
      expect(snapshot.state.currentRadius).toBeLessThan(5.0)
    })
  })

  describe('Snapshot Consistency', () => {
    it('should produce consistent snapshots for same state', () => {
      const snapshot1 = star.getDebugSnapshot()
      const snapshot2 = star.getDebugSnapshot()

      expect(snapshot1).toEqual(snapshot2)
    })

    it('should have all expected snapshot fields', () => {
      const snapshot = star.getDebugSnapshot()

      expect(snapshot).toHaveProperty('particleCount')
      expect(snapshot).toHaveProperty('colors')
      expect(snapshot).toHaveProperty('sizes')
      expect(snapshot).toHaveProperty('positions')
      expect(snapshot).toHaveProperty('shader')
      expect(snapshot).toHaveProperty('state')
    })
  })
})
