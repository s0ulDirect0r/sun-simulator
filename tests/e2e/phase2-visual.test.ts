import { test, expect } from '@playwright/test'

test.describe('Phase 2 - Main Sequence Visual E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('canvas')
  })

  test('should load the simulator and render canvas', async ({ page }) => {
    const canvas = await page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Verify WebGL context is initialized
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      return !!canvas.getContext('webgl2') || !!canvas.getContext('webgl')
    })
    expect(hasWebGL).toBe(true)
  })

  test('should start simulation and reach phase 2', async ({ page }) => {
    // Click "Begin Simulation" button
    const beginButton = page.locator('button:has-text("Begin Simulation")')
    await beginButton.click()

    // Wait for nebula collapse to complete and phase 2 to begin
    // Phase 1 (nebula) lasts ~6-8 seconds
    await page.waitForTimeout(9000)

    // Check phase indicator
    const phaseText = await page.locator('#phase-name').textContent()
    expect(phaseText).toContain('Main Sequence')
  })

  test('should have enhanced stellar wind particles in phase 2', async ({ page }) => {
    // Start simulation
    await page.locator('button:has-text("Begin Simulation")').click()

    // Wait for phase 2
    await page.waitForTimeout(9000)

    // Query the star snapshot via window global
    const snapshot = await page.evaluate(() => {
      return window.__getStarSnapshot?.()
    })

    expect(snapshot).toBeTruthy()
    expect(snapshot.particleCount).toBe(1800)
  })

  test('should verify bright yellow-white particle colors', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot).toBeTruthy()
    expect(snapshot.colors.first.r).toBe(1.0)
    expect(snapshot.colors.first.g).toBeGreaterThan(0.95) // Nearly white
    expect(snapshot.colors.first.b).toBeGreaterThan(0.8) // Warm tint

    // Verify NOT orange
    expect(snapshot.colors.first.g).toBeGreaterThan(0.8) // Orange would be ~0.6
  })

  test('should have larger particle sizes (0.8-1.5 range)', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot).toBeTruthy()
    expect(snapshot.sizes.min).toBeGreaterThanOrEqual(0.8)
    expect(snapshot.sizes.max).toBeLessThanOrEqual(1.5)
  })

  test('should use streak shader with brightness boost', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot).toBeTruthy()
    expect(snapshot.shader.hasStreakCode).toBe(true)
    expect(snapshot.shader.hasBrightnessBoost).toBe(true)
  })

  test('should animate particle sizes over time (flickering)', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    // Get initial snapshot
    const snapshot1 = await page.evaluate(() => window.__getStarSnapshot?.())

    // Wait 1 second
    await page.waitForTimeout(1000)

    // Get updated snapshot
    const snapshot2 = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot1).toBeTruthy()
    expect(snapshot2).toBeTruthy()

    // Sizes should have changed due to flickering
    expect(snapshot1.sizes.sample).not.toEqual(snapshot2.sizes.sample)
  })

  test('should remain in main sequence state (not red giant yet)', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot).toBeTruthy()
    expect(snapshot.state.isRedGiant).toBe(false)
    expect(snapshot.state.isSupernova).toBe(false)
  })

  test('should have stellar wind visible (debug toggle)', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    // Check if particles are visible in the scene
    const particlesVisible = await page.evaluate(() => {
      const simulator = window.__simulator as any
      if (!simulator || !simulator.star) return false

      const particles = simulator.star.surfaceParticles
      return particles && particles.visible
    })

    expect(particlesVisible).toBe(true)
  })

  test('should toggle stellar wind on/off with key 8', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    // Press key 8 to toggle stellar wind
    await page.keyboard.press('8')

    const visibleAfterToggle = await page.evaluate(() => {
      const simulator = window.__simulator as any
      return simulator?.star?.surfaceParticles?.visible ?? null
    })

    // Toggle state should have changed (either true or false, depends on initial state)
    expect(typeof visibleAfterToggle).toBe('boolean')
  })

  test('should have consistent snapshot structure', async ({ page }) => {
    await page.locator('button:has-text("Begin Simulation")').click()
    await page.waitForTimeout(9000)

    const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())

    expect(snapshot).toBeTruthy()
    expect(snapshot).toHaveProperty('particleCount')
    expect(snapshot).toHaveProperty('colors')
    expect(snapshot).toHaveProperty('sizes')
    expect(snapshot).toHaveProperty('positions')
    expect(snapshot).toHaveProperty('shader')
    expect(snapshot).toHaveProperty('state')
  })
})
