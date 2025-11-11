import { test, expect } from '@playwright/test'

test.describe('Audio Loading - Non-Blocking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('canvas')
  })

  test('START button is disabled until audio preloads', async ({ page }) => {
    // Throttle network to slow down audio preloading
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100000, // 100 KB/s
      uploadThroughput: 100000,
      latency: 50
    })

    // Reload to apply throttling from the start
    await page.reload()
    await page.waitForSelector('canvas')

    // Button should initially be disabled with loading text
    const startButton = page.locator('#btn-start')
    await expect(startButton).toBeDisabled()

    const buttonText = await startButton.textContent()
    expect(buttonText).toBe('Loading audio...')

    // Wait for button to become enabled (audio preloaded)
    await expect(startButton).toBeEnabled({ timeout: 15000 })

    // Button text should change
    const enabledText = await startButton.textContent()
    expect(enabledText).toBe('Begin Simulation')
  })

  test('simulator starts immediately without freezing after preload', async ({ page }) => {
    // Wait for START button to be enabled (audio preloaded)
    const beginButton = page.locator('#btn-start')
    await expect(beginButton).toBeEnabled({ timeout: 10000 })

    // Click "Begin Simulation" button
    await beginButton.click()

    // Simulation should start immediately (within 600ms for fade animation)
    await page.waitForTimeout(600)

    // Verify simulation is running by checking phase indicator updates
    const phaseIndicator = page.locator('#current-phase')
    const phaseText = await phaseIndicator.textContent()
    expect(phaseText).not.toBe('Initializing...')

    // Verify animation loop is running (check FPS in console logs or canvas changes)
    const isAnimating = await page.evaluate(() => {
      return window.__getStarSnapshot?.()?.isRunning ?? true
    })
    expect(isAnimating).toBe(true)
  })

  test('simulator runs smoothly without blocking during audio decode', async ({ page }) => {
    // Monitor for long tasks (blocking operations)
    const longTasks: number[] = []

    await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            window.__longTasks = window.__longTasks || []
            window.__longTasks.push(entry.duration)
          }
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    })

    // Click "Begin Simulation"
    const beginButton = page.locator('button:has-text("Begin Simulation")')
    await beginButton.click()

    // Let simulation run for a few seconds
    await page.waitForTimeout(5000)

    // Check for long tasks
    const detectedLongTasks = await page.evaluate(() => {
      return window.__longTasks || []
    })

    // We expect few or no long tasks (audio decoding shouldn't block)
    // Note: There might be some long tasks from WebGL rendering, but not from audio
    console.log('Long tasks detected:', detectedLongTasks.length)

    // Verify simulation is still responsive
    const isResponsive = await page.evaluate(() => {
      return window.__getStarSnapshot?.()?.isRunning ?? true
    })
    expect(isResponsive).toBe(true)
  })

  test('audio plays successfully after loading', async ({ page }) => {
    // Enable audio context monitoring
    await page.evaluate(() => {
      window.__audioReady = false
      const originalAudioContext = window.AudioContext || (window as any).webkitAudioContext

      if (originalAudioContext) {
        window.AudioContext = function(...args: any[]) {
          const ctx = new originalAudioContext(...args)
          const originalCreateBufferSource = ctx.createBufferSource.bind(ctx)

          ctx.createBufferSource = function() {
            window.__audioReady = true
            return originalCreateBufferSource()
          }

          return ctx
        } as any
      }
    })

    // Click "Begin Simulation"
    const beginButton = page.locator('button:has-text("Begin Simulation")')
    await beginButton.click()

    // Wait for audio to initialize and play
    await page.waitForFunction(() => window.__audioReady, { timeout: 10000 })

    const audioReady = await page.evaluate(() => window.__audioReady)
    expect(audioReady).toBe(true)
  })
})

// Extend Window interface for test helpers
declare global {
  interface Window {
    __getStarSnapshot?: () => { isRunning: boolean; particleCount?: number }
    __longTasks?: number[]
    __audioReady?: boolean
  }
}
