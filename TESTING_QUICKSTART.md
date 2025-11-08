# Testing Quick Start

## 🚀 Running Tests

### Unit Tests (Fast - 2 seconds)
```bash
npm test
```

Tests Star class properties without rendering:
- ✅ 1800 particles
- ✅ Bright yellow-white colors
- ✅ 0.8-1.5 size range
- ✅ Streak shader with brightness boost
- ✅ Flickering animation

### E2E Tests (Slow - 60-90 seconds)
```bash
npm run test:e2e
```

Tests actual running app in browser:
- ✅ Canvas rendering
- ✅ Phase transitions
- ✅ Real-time particle state
- ✅ User interactions (keyboard, buttons)

### All Tests
```bash
npm run test:all
```

## 📊 Test Results

Current status:
```
✓ tests/Star.test.ts (18 tests) 200ms
  Test Files  1 passed (1)
       Tests  18 passed (18)
```

## 🔍 What's Being Tested

### Option 1: Scene Graph Inspection (Unit Tests)
```typescript
// Direct property access
const count = star.surfaceParticles.geometry.attributes.position.count
expect(count).toBe(1800)
```

### Option 2: Headless Browser (E2E Tests)
```typescript
// Real browser execution
await page.locator('button:has-text("Begin Simulation")').click()
await page.waitForTimeout(9000) // Wait for phase 2

const snapshot = await page.evaluate(() => window.__getStarSnapshot?.())
expect(snapshot.particleCount).toBe(1800)
```

### Option 4: Debug Snapshots
```typescript
// Serializable state
const snapshot = star.getDebugSnapshot()
// {
//   particleCount: 1800,
//   colors: { average: {r: 1.0, g: 0.98, b: 0.85} },
//   sizes: { min: 0.8, max: 1.5 },
//   shader: { hasStreakCode: true, hasBrightnessBoost: true }
// }
```

## 🎯 Key Test Files

- `tests/Star.test.ts` - Unit tests for stellar wind
- `tests/e2e/phase2-visual.test.ts` - E2E visual verification
- `src/Star.ts` - `getDebugSnapshot()` method (line 913)
- `src/main.ts` - Test globals exposed to `window` (line 1089)

## 💡 How It Works

### Unit Tests
1. Mock WebGL context (`tests/setup.ts`)
2. Create Star instance with Three.js scene
3. Query geometry attributes directly
4. Use `getDebugSnapshot()` for state verification

### E2E Tests
1. Playwright starts dev server automatically
2. Opens browser in headless mode
3. Clicks "Begin Simulation"
4. Waits for phase 2 (9 seconds)
5. Calls `window.__getStarSnapshot()` via `page.evaluate()`
6. Verifies snapshot properties

## 🐛 Troubleshooting

**Unit tests fail:**
- Check `happy-dom` is installed
- Verify `vitest.config.ts` excludes `e2e` folder

**E2E tests timeout:**
- Increase wait time: `await page.waitForTimeout(12000)`
- Check dev server is on port 5173

**Build fails:**
- Run `npm install` to ensure dependencies are current
- Check TypeScript errors: `tsc --noEmit`

## 📚 Full Documentation

See `tests/README.md` for complete documentation.
