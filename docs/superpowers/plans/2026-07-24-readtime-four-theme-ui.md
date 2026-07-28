# ReadTime Four-Theme UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic reader styling with four switchable themes whose appearance settings survive application restarts.

**Architecture:** Extend the existing `ThemeManager` as the single source of theme tokens and persist its current value with `localStorage`. Keep the React component tree unchanged except for semantic markup needed by the new CSS; use CSS variables for every theme-specific surface.

**Tech Stack:** Electron 28, React 18, TypeScript, CSS, Jest

## Global Constraints

- Do not add dependencies or a new state framework.
- Do not change file parsing, boss-key behavior, or reading-progress contracts.
- The transparent-white theme must draw no reading background.
- Existing uncommitted changes must be preserved.

---

### Task 1: Theme model and persistence

**Files:**
- Create: `src/renderer/utils/__tests__/themeManager.test.ts`
- Modify: `src/renderer/utils/themeManager.ts`

**Interfaces:**
- Consumes: browser `document.documentElement.style` and `localStorage`
- Produces: four `defaultThemes`; `ThemeManager.getTheme()`, `setTheme()`, `updateFontSize()`, `updateLineHeight()`, and `updateOpacity()`

- [ ] **Step 1: Write failing persistence tests**

Test that four named themes exist, a selected theme is restored by a new manager, corrupt storage falls back to the default, and applying the transparent theme sets `--reader-background` to `transparent`.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts`

Expected: FAIL because the four-theme model and persisted storage do not exist.

- [ ] **Step 3: Implement the minimal theme model**

Add CSS-token fields to `Theme`, replace the three old themes with `纸张阅读`, `静谧深色`, `macOS 玻璃`, and `纯透明白字`, then persist the complete current theme under one `localStorage` key after each update.

- [ ] **Step 4: Verify the focused tests pass**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts`

Expected: all theme-manager tests PASS.

### Task 2: Reader, controls, settings, and empty state

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/ReadingView.tsx`
- Modify: `src/renderer/components/ReadingView.css`
- Modify: `src/renderer/components/ControlBar.tsx`
- Modify: `src/renderer/components/ControlBar.css`
- Modify: `src/renderer/components/Settings.tsx`
- Modify: `src/renderer/components/Settings.css`

**Interfaces:**
- Consumes: CSS variables applied by `ThemeManager`
- Produces: one component layout shared by all four themes

- [ ] **Step 1: Add semantic theme previews and reader metadata**

Render four theme preview cards, a compact chapter header, icon-like navigation labels with accessible titles, and a themed application root.

- [ ] **Step 2: Replace the basic CSS**

Style the reader hierarchy, floating control bar, theme cards, sliders, empty-state drop target, focus rings, hover states, and responsive behavior entirely with existing CSS.

- [ ] **Step 3: Compile the renderer**

Run: `npx tsc -p tsconfig.json --noEmit`

Expected: exit 0.

### Task 3: Electron transparency and end-to-end verification

**Files:**
- Modify: `src/main/window.ts`
- Modify: `index.html`
- Modify: `fix-build.sh`

**Interfaces:**
- Consumes: Electron transparent `BrowserWindow`
- Produces: a renderer whose root background can become fully transparent

- [ ] **Step 1: Enable the native transparent window**

Set `transparent: true` and remove hard-coded document/root backgrounds while retaining the existing security and debugging changes outside this scope.

- [ ] **Step 2: Run full automated verification**

Run: `npm test -- --runInBand && npm run build`

Expected: all tests PASS and build exits 0.

- [ ] **Step 3: Launch and inspect the real Electron window**

Run: `./node_modules/.bin/electron . --enable-logging`

Expected: React renders without console exceptions; each theme switches from Settings; restarting restores the last selection; the transparent-white theme shows the desktop behind the text.
