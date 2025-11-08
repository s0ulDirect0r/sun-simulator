# Sun Simulator Test Suite

Comprehensive testing for the Sun Simulator, covering unit tests and E2E visual verification.

## Test Structure

### 1. **Unit Tests** (Vitest)
Location: `tests/Star.test.ts`

Tests the Star class directly using Three.js scene graph inspection:
- Particle count verification (1800 particles)
- Color validation (bright yellow-white, not orange)
- Size ranges (0.8-1.5 units)
- Shader code verification (streak effect, brightness boost)
- Flickering animation behavior
- Snapshot consistency

### 2. **E2E Tests** (Playwright)
Location: `tests/e2e/phase2-visual.test.ts`

Tests the actual running application in a headless browser:
- Canvas rendering verification
- Phase transition (nebula → main sequence)
- Real-time particle state inspection via `window.__getStarSnapshot()`
- Animation over time
- Debug toggle functionality (key 8 for stellar wind)

## Running Tests

### Unit Tests (Fast)
```bash
# Run unit tests
npm test

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch
```

### E2E Tests (Slower, requires dev server)
```bash
# Run E2E tests (auto-starts dev server)
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- phase2-visual
```

### All Tests
```bash
npm run test:all
```

## Test Approaches

### Option 1: Scene Graph Inspection (Unit Tests)
Directly queries Three.js objects:
```typescript
const particleCount = star.surfaceParticles.geometry.attributes.position.count
expect(particleCount).toBe(1800)
```

**Pros:**
- Fast execution
- No browser required
- Precise control over state

**Cons:**
- Doesn't verify actual rendering
- Requires mocking WebGL context

### Option 2: Headless Browser (E2E Tests)
Runs actual application in Playwright:
```typescript
const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())
expect(snapshot.particleCount).toBe(1800)
```

**Pros:**
- Tests real application behavior
- Verifies actual WebGL rendering
- Tests user interactions (button clicks, keyboard)

**Cons:**
- Slower execution
- Requires dev server
- More complex setup

### Option 4: Debug Snapshots
Star class exposes `getDebugSnapshot()` method:
```typescript
const snapshot = star.getDebugSnapshot()
// Returns:
// {
//   particleCount: 1800,
//   colors: { average: {r, g, b}, sample: [...] },
//   sizes: { min, max, average, sample: [...] },
//   shader: { hasStreakCode: true, hasBrightnessBoost: true },
//   state: { isRedGiant: false, currentRadius: 4.0 }
// }
```

**Pros:**
- Serializable state for regression testing
- Works in both unit and E2E tests
- Human-readable output

**Cons:**
- Must maintain snapshot interface
- Doesn't capture visual appearance directly

## Debug Snapshot API

The `Star.getDebugSnapshot()` method returns a comprehensive snapshot of the stellar wind state:

```typescript
interface DebugSnapshot {
  particleCount: number
  colors: {
    sample: number[]        // First 3 particles RGB values
    average: { r: number, g: number, b: number }
    first: { r: number, g: number, b: number }
  }
  sizes: {
    min: number
    max: number
    average: number
    sample: number[]        // First 10 particles
  }
  positions: {
    sample: number[]        // First 3 particles XYZ
  }
  shader: {
    hasStreakCode: boolean
    hasBrightnessBoost: boolean
    fragmentShaderSnippet: string
  }
  state: {
    isRedGiant: boolean
    isSupernova: boolean
    currentRadius: number
    time: number
  }
}
```

## Test Globals (E2E Only)

For E2E testing, the simulator exposes test hooks on `window`:

```typescript
window.__simulator         // SunSimulator instance
window.__getStarSnapshot() // Returns Star.getDebugSnapshot() or null
```

**Usage in Playwright:**
```typescript
const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())
```

## CI/CD Integration

Tests are configured for CI with:
- Retries on failure (E2E only)
- HTML reports
- Screenshots on failure (E2E only)
- Parallel execution

## Troubleshooting

### Unit tests fail with WebGL errors
The `tests/setup.ts` file mocks WebGL context. If tests fail, verify:
1. `happy-dom` is installed
2. `vitest.config.ts` references setup file
3. Canvas mock returns valid WebGL methods

### E2E tests timeout
E2E tests wait 9 seconds for phase 2. If failing:
1. Check nebula collapse duration hasn't changed
2. Increase timeout in test: `await page.waitForTimeout(12000)`
3. Verify dev server is running on port 5173

### Snapshot values don't match
The flickering animation causes sizes to vary. Tests use:
- `toBeCloseTo(value, precision)` for floats
- `toBeGreaterThan()` / `toBeLessThan()` for ranges
- Average values instead of exact matches

## Adding New Tests

### Unit Test Template
```typescript
it('should verify new enhancement', () => {
  const snapshot = star.getDebugSnapshot()
  expect(snapshot.newProperty).toBe(expectedValue)
})
```

### E2E Test Template
```typescript
test('should verify new visual behavior', async ({ page }) => {
  await page.locator('button:has-text("Begin Simulation")').click()
  await page.waitForTimeout(9000)

  const result = await page.evaluate(() => {
    return window.__getStarSnapshot()?.newProperty
  })

  expect(result).toBe(expectedValue)
})
```

## Performance Benchmarks

- **Unit tests:** ~2-5 seconds (all tests)
- **E2E tests:** ~60-90 seconds (all tests, includes app startup)
- **Individual E2E test:** ~10-15 seconds

## Future Enhancements

Potential additions to test suite:
1. **Visual regression:** Screenshot comparison with baseline images
2. **Performance tests:** FPS tracking, particle system efficiency
3. **Canvas pixel sampling:** Verify actual rendered colors/brightness
4. **Snapshot testing:** Jest-style snapshot matching for `getDebugSnapshot()`
5. **Phase transitions:** Test all phase changes (nebula → main sequence → red giant)
6. **Integration tests:** Test full simulation lifecycle

## Related Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - WebGL mocking for unit tests
- `src/Star.ts` - Debug snapshot implementation
- `src/main.ts` - Test globals exposure
