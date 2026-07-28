# Transparent Controls and Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make transparent-theme controls fully opaque and restyle the auto-hide checkbox as an accessible ON/OFF capsule.

**Architecture:** Reuse the existing transparent theme variables and native checkbox. No new component, state, or dependency is needed.

**Tech Stack:** TypeScript, React, CSS, Jest

## Global Constraints

- Transparent reading background remains transparent.
- Transparent control bar and settings panel use opaque `#181b1f`.
- Auto-hide switch displays `OFF` when unchecked and `ON` when checked.
- Other themes and auto-hide behavior remain unchanged.

---

### Task 1: Transparent Surfaces and Capsule Toggle

**Files:**
- Modify: `src/renderer/utils/themeManager.ts`
- Modify: `src/renderer/components/Settings.css`
- Test: `src/renderer/utils/__tests__/themeManager.test.ts`
- Test: `src/renderer/components/__tests__/Settings.test.tsx`

**Interfaces:**
- Preserve: native `<input type="checkbox">`
- Preserve: `--reader-background`, `--surface-background`, and `--control-background`

- [ ] **Step 1: Add failing theme assertions**

```ts
test('keeps transparent reading clear while controls are opaque', () => {
  new ThemeManager().setTheme(defaultThemes[3])

  expect(styles.get('--reader-background')).toBe('transparent')
  expect(styles.get('--surface-background')).toBe('#181b1f')
  expect(styles.get('--control-background')).toBe('#181b1f')
})
```

- [ ] **Step 2: Run the focused theme test**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts
```

Expected: FAIL because transparent control surfaces still use RGBA values.

- [ ] **Step 3: Update the transparent theme**

In the `transparent` theme object:

```ts
surfaceBackground: '#181b1f',
controlBackground: '#181b1f',
```

Keep both `appBackground` and `readerBackground` as `transparent`.

- [ ] **Step 4: Style the native checkbox as an ON/OFF capsule**

Replace the current `.toggle-row input` rule with native-checkbox appearance removal, a `52px × 26px` capsule, `OFF`/`ON` pseudo-elements, an animated thumb, `accent-color`-based checked state, and a visible `:focus-visible` outline. Keep the input inside its existing `<label>` so the full row remains clickable.

- [ ] **Step 5: Extend the component markup test**

Assert that the rendered auto-hide checkbox remains a real checkbox:

```ts
expect(markup).toContain('type="checkbox"')
```

- [ ] **Step 6: Run all verification**

```bash
npm test -- --runInBand
npm run build
git diff --check
```

Expected: all tests and the production build pass.
