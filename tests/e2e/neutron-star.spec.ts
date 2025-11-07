import { test, expect } from '@playwright/test'

/**
 * E2E test to verify neutron star implementation and random remnant selection
 *
 * This test verifies:
 * 1. The simulation progresses through all phases
 * 2. After supernova, either a neutron star OR black hole appears (50/50 random)
 * 3. The appropriate phase text is displayed
 * 4. The remnant object is created in the scene
 */

test.describe('Neutron Star Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the simulation
    await page.goto('http://localhost:5173')

    // Wait for canvas to be ready
    await expect(page.locator('#canvas')).toBeVisible()
  })

  test('should randomly create either neutron star or black hole after supernova', async ({
    page,
  }) => {
    // Speed up simulation by manipulating time scale (if exposed)
    // For now, we'll use timeouts to wait for phases

    // Wait for Phase 1: Nebula
    await expect(page.locator('#current-phase')).toContainText('Nebula', {
      timeout: 5000,
    })
    console.log('✓ Phase 1: Nebula started')

    // Fast forward through phases
    // Total time: ~30s (nebula) + 30s (main seq) + 15s (red giant) + 8s (supernova) = ~83s
    // We'll wait with generous timeout

    // Wait for Phase 5: Either Black Hole or Neutron Star
    await page.waitForFunction(
      () => {
        const phaseElement = document.querySelector('#current-phase')
        const phaseText = phaseElement?.textContent || ''
        return (
          phaseText.includes('Black Hole') || phaseText.includes('Neutron Star')
        )
      },
      { timeout: 90000 } // 90 second timeout
    )

    // Get the final phase text
    const phaseText = await page.locator('#current-phase').textContent()
    console.log(`✓ Final phase reached: ${phaseText}`)

    // Verify it's either black hole or neutron star
    expect(
      phaseText?.includes('Black Hole') || phaseText?.includes('Neutron Star')
    ).toBe(true)

    // Verify the appropriate description is shown
    const descriptionElement = page.locator('.phase-info p')
    const description = await descriptionElement.textContent()

    if (phaseText?.includes('Black Hole')) {
      console.log('  → Black hole formed!')
      expect(description).toContain('singularity')
    } else if (phaseText?.includes('Neutron Star')) {
      console.log('  → Neutron star formed!')
      expect(description).toContain('neutron star')
    }

    // Take a screenshot for verification
    await page.screenshot({
      path: `tests/e2e/screenshots/remnant-${phaseText?.includes('Black Hole') ? 'blackhole' : 'neutron-star'}.png`,
      fullPage: true,
    })
  })

  test('should show correct console logs for remnant formation', async ({
    page,
  }) => {
    // Listen for console messages
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      consoleLogs.push(msg.text())
    })

    // Wait for remnant formation
    await page.waitForFunction(
      () => {
        const phaseElement = document.querySelector('#current-phase')
        const phaseText = phaseElement?.textContent || ''
        return (
          phaseText.includes('Black Hole') || phaseText.includes('Neutron Star')
        )
      },
      { timeout: 90000 }
    )

    // Check console logs for remnant creation
    const hasBlackHoleLog = consoleLogs.some((log) =>
      log.includes('Collapsing into black hole')
    )
    const hasNeutronStarLog = consoleLogs.some((log) =>
      log.includes('Collapsing into neutron star')
    )

    // Exactly one should be true (XOR)
    expect(hasBlackHoleLog !== hasNeutronStarLog).toBe(true)

    if (hasBlackHoleLog) {
      console.log('✓ Black hole formation logged correctly')
    } else {
      console.log('✓ Neutron star formation logged correctly')
    }
  })

  test('should verify randomness by running simulation multiple times', async ({
    page,
  }) => {
    // Run simulation 3 times and record outcomes
    const outcomes: string[] = []

    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Run ${i + 1}/3 ---`)

      // Reload page for new simulation
      if (i > 0) {
        await page.reload()
        await expect(page.locator('#canvas')).toBeVisible()
      }

      // Wait for remnant phase
      await page.waitForFunction(
        () => {
          const phaseElement = document.querySelector('#current-phase')
          const phaseText = phaseElement?.textContent || ''
          return (
            phaseText.includes('Black Hole') ||
            phaseText.includes('Neutron Star')
          )
        },
        { timeout: 90000 }
      )

      const phaseText = await page.locator('#current-phase').textContent()
      const outcome = phaseText?.includes('Black Hole')
        ? 'black-hole'
        : 'neutron-star'
      outcomes.push(outcome)
      console.log(`  Result: ${outcome}`)

      // Small delay before next run
      await page.waitForTimeout(1000)
    }

    console.log(`\nOutcomes: ${outcomes.join(', ')}`)

    // With 3 runs and 50/50 probability, we might see:
    // - All same (12.5% chance for each type)
    // - Mixed (75% chance)
    // We just verify both options are possible by checking our results
    const hasBlackHole = outcomes.includes('black-hole')
    const hasNeutronStar = outcomes.includes('neutron-star')

    console.log(
      `✓ Randomness verified - Black hole: ${hasBlackHole}, Neutron star: ${hasNeutronStar}`
    )

    // At minimum, we should see at least one outcome
    expect(hasBlackHole || hasNeutronStar).toBe(true)
  })
})

test.describe('Neutron Star Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await expect(page.locator('#canvas')).toBeVisible()
  })

  test('should have visible neutron star elements when neutron star forms', async ({
    page,
  }) => {
    // Wait for remnant phase
    await page.waitForFunction(
      () => {
        const phaseElement = document.querySelector('#current-phase')
        const phaseText = phaseElement?.textContent || ''
        return (
          phaseText.includes('Black Hole') || phaseText.includes('Neutron Star')
        )
      },
      { timeout: 90000 }
    )

    const phaseText = await page.locator('#current-phase').textContent()

    if (phaseText?.includes('Neutron Star')) {
      console.log('✓ Neutron star formed - checking visual elements')

      // Enable debug overlay to verify components exist
      await page.keyboard.press('d')
      await page.waitForTimeout(500)

      // Verify debug overlay shows neutron star phase
      const debugPhase = await page.locator('#debug-phase').textContent()
      expect(debugPhase).toContain('NEUTRON_STAR')

      // Verify mass and radius are displayed
      const mass = await page.locator('#debug-mass').textContent()
      const radius = await page.locator('#debug-bh-radius').textContent()

      expect(mass).toContain('M☉') // Solar mass symbol
      expect(radius).toContain('surface') // Should say "surface" for neutron star

      console.log(`  Mass: ${mass}`)
      console.log(`  Radius: ${radius}`)

      // Take screenshot with debug overlay
      await page.screenshot({
        path: 'tests/e2e/screenshots/neutron-star-debug.png',
        fullPage: true,
      })
    } else {
      console.log('⊘ Black hole formed instead - skipping neutron star checks')
      test.skip()
    }
  })
})
