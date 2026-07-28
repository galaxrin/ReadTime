# Transparent UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove jagged transparent-theme borders, unify the settings-panel radius at 18px, and remove text shadows.

**Architecture:** Reuse the existing theme CSS selectors and `--text-shadow` variable. Make only CSS and theme-data changes; add no components, state, fields, or dependencies.

**Tech Stack:** Electron, React, TypeScript, CSS, Jest

## Global Constraints

- Transparent white- and black-text themes must show no visible control-bar or settings-panel border.
- The settings panel and main reading window must both use an `18px` radius.
- Reading content, chapter titles, and reader headers must have no text shadow.
- Existing translucent backgrounds and shadows remain unchanged.

---

### Task 1: Transparent Borders and Radius

**Files:**
- Modify: `src/renderer/components/ControlBar.css`
- Modify: `src/renderer/components/Settings.css`

**Interfaces:**
- Consumes: the existing `[data-theme^="transparent"]` theme marker.
- Produces: borderless transparent-theme control and settings surfaces.

- [ ] **Step 1: Remove the transparent control-bar simulated border**

Change the transparent control rule to keep `border-color: transparent` and set `box-shadow: none`.

- [ ] **Step 2: Match the settings-panel radius**

Change `.settings-panel` from `border-radius: 22px` to `border-radius: 18px`.

- [ ] **Step 3: Remove the transparent settings-panel border**

Add:

```css
[data-theme^="transparent"] .settings-panel {
  border-color: transparent;
}
```

- [ ] **Step 4: Check the CSS diff**

Run: `git diff --check -- src/renderer/components/ControlBar.css src/renderer/components/Settings.css`

Expected: exit code 0.

### Task 2: Remove Text Shadows

**Files:**
- Modify: `src/renderer/utils/themeManager.ts`
- Test: `src/renderer/utils/__tests__/themeManager.test.ts`

**Interfaces:**
- Consumes: existing `Theme.textShadow` and `--text-shadow`.
- Produces: `none` for every built-in theme.

- [ ] **Step 1: Add a regression assertion**

Add a test that iterates over `defaultThemes` and expects every `textShadow` value to equal `none`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts`

Expected: FAIL because the night and glass themes still define shadows.

- [ ] **Step 3: Apply the minimal theme-data fix**

Set the night and glass `textShadow` values to `none`. The other built-in themes already use `none`.

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts
npm test -- --runInBand
npm run build
```

Expected: all tests pass and the build exits with code 0.
