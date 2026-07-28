# Borderless UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove visible borders throughout all five themes and replace control-state borders with background highlights.

**Architecture:** Edit the three existing component stylesheets. Reuse `--text-color` and `--accent-color` with `color-mix()`; add no components, state, theme variables, or dependencies.

**Tech Stack:** Electron, React, CSS

## Global Constraints

- Remove visible container, control, separator, slider-thumb, and focus-outline borders.
- Preserve border radii, panel shadows, backdrop blur, SVG icon strokes, and disabled opacity.
- Express hover, focus, and active states with background and text-color highlights.

---

### Task 1: Reading Surfaces

**Files:**
- Modify: `src/renderer/components/ReadingView.css`

- [ ] Remove borders from `.reading-view`, `.reader-header`, `.no-file-message`, and `.no-file-message::before`.
- [ ] Remove transparent-theme border overrides that are no longer needed.
- [ ] Run `git diff --check -- src/renderer/components/ReadingView.css`.

### Task 2: Control Bar and Popovers

**Files:**
- Modify: `src/renderer/components/ControlBar.css`

- [ ] Remove visible borders and the transparent-theme inset border from the control bar and popovers.
- [ ] Replace `.control-button:focus-visible` outline with the same background highlight family used by hover and active states.
- [ ] Keep SVG strokes and panel shadows unchanged.
- [ ] Run `git diff --check -- src/renderer/components/ControlBar.css`.

### Task 3: Settings Controls

**Files:**
- Modify: `src/renderer/components/Settings.css`

- [ ] Remove visible borders from the panel, theme controls, slider thumb, hint, shortcut controls, font controls, and speed controls.
- [ ] Replace theme-card, input, select, and button focus/active borders or outlines with background highlights.
- [ ] Preserve panel shadow, radii, and disabled/error styling.
- [ ] Run `git diff --check -- src/renderer/components/Settings.css`.

### Task 4: Verification

**Files:**
- Verify: all three modified CSS files.

- [ ] Search the three files and confirm remaining `border` declarations are only `border: 0` resets or `border-radius`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run build`.
- [ ] Inspect the final scoped diff for unrelated changes.
