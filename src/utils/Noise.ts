/**
 * 3D Noise Utility
 *
 * Provides coherent noise functions for creating large-scale convection cell patterns.
 * Uses simplex-noise library for proven, performant noise generation.
 */

import { createNoise3D } from 'simplex-noise'

// Create a single noise instance (seeded for consistency)
const noiseGenerator = createNoise3D()

export class Noise3D {
  /**
   * 3D simplex noise - returns value in range [-1, 1], normalized to [0, 1]
   * Lower frequency = larger features
   */
  static noise(x: number, y: number, z: number): number {
    // Simplex noise returns [-1, 1], normalize to [0, 1]
    const rawNoise = noiseGenerator(x, y, z)
    return (rawNoise + 1.0) / 2.0
  }

  /**
   * Fractional Brownian Motion - multi-scale noise for more detail
   * octaves: number of noise layers (typically 2-4)
   */
  static fbm(x: number, y: number, z: number, octaves: number = 3): number {
    let value = 0
    let amplitude = 1.0
    let frequency = 1.0
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2.0
    }

    return value / maxValue // Normalize to [0, 1]
  }

  /**
   * Map noise to cell ID (for debugging/grouping)
   * numCells: how many distinct cells to create
   */
  static noiseToCell(noiseValue: number, numCells: number): number {
    return Math.floor(noiseValue * numCells)
  }
}
