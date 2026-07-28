# Drag and Resize Auto-Hide Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent drag-region flicker and stop window resizing from triggering automatic hiding.

**Architecture:** Keep the fix in the renderer where the existing mouse events originate. Delay mouse-leave hiding by 200ms and cancel it when the pointer returns; track resize activity locally and suppress hiding until 300ms after the final resize event.

**Tech Stack:** React 18, TypeScript, Jest, Electron renderer

## Global Constraints

- Do not add dependencies or main-process IPC.
- Preserve the existing settings/control-overlay auto-hide guards.
- Preserve tray, shortcut, and window reveal behavior.
- Clear all new timers when the component unmounts.

---

### Task 1: Guard auto-hide while resizing

**Files:**
- Modify: `src/renderer/utils/autoHide.ts`
- Test: `src/renderer/utils/__tests__/autoHide.test.ts`

**Interfaces:**
- Consumes: `shouldAutoHide(enabled: boolean, hasOpenOverlay: boolean, isResizing?: boolean)`
- Produces: A boolean that is false while resizing, while an overlay is open, or while the preference is disabled.

- [ ] **Step 1: Write the failing test**

Add the resize assertion:

```ts
expect(shouldAutoHide(true, false, true)).toBe(false)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/autoHide.test.ts
```

Expected: FAIL because the current two-argument implementation ignores `isResizing`.

- [ ] **Step 3: Implement the minimal guard**

```ts
export const shouldAutoHide = (
  enabled: boolean,
  hasOpenOverlay: boolean,
  isResizing = false
) => enabled && !hasOpenOverlay && !isResizing
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/autoHide.test.ts
```

Expected: PASS.

### Task 2: Delay leave handling and suppress it during resize

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `shouldAutoHide(enabled, hasOpenOverlay, isResizing)`
- Produces: Mouse-leave hiding delayed by 200ms and resize suppression lasting 300ms after the final resize event.

- [ ] **Step 1: Add renderer-local timer state**

Alongside the existing control-bar timer, add:

```ts
const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const isResizingRef = useRef(false)

const cancelPendingAutoHide = useCallback(() => {
  if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current)
  autoHideTimeoutRef.current = null
}, [])
```

- [ ] **Step 2: Cancel delayed hiding when content is revealed**

Call `cancelPendingAutoHide()` first inside `revealContent`, and include it in the callback dependency list.

- [ ] **Step 3: Track active resizing**

Add a `resize` listener that marks `isResizingRef.current = true`, cancels pending auto-hide, and resets a 300ms timer that marks resizing false. Remove the listener and clear both timers during cleanup.

- [ ] **Step 4: Delay mouse-leave hiding**

Replace the immediate hide with:

```ts
if (!shouldAutoHide(
  settingsState.autoHideOnMouseLeave,
  settingsState.showSettings || controlOverlayOpen,
  isResizingRef.current
)) return

cancelPendingAutoHide()
autoHideTimeoutRef.current = setTimeout(() => {
  pauseAutoScroll()
  setAutoHidden(true)
  window.electronAPI.setWindowAutoHidden(true)
  autoHideTimeoutRef.current = null
}, 200)
```

The existing mouse-enter path calls `revealContent()`, so returning within 200ms cancels the hide.

- [ ] **Step 5: Cancel pending hiding when auto-hide becomes invalid**

When auto-hide is disabled, settings open, or the control overlay opens, call `cancelPendingAutoHide()` and reveal already-hidden content when required.

- [ ] **Step 6: Run verification**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: all Jest suites pass and the production build exits successfully.

- [ ] **Step 7: Commit only the fix files**

```bash
git add src/renderer/App.tsx src/renderer/utils/autoHide.ts src/renderer/utils/__tests__/autoHide.test.ts
git commit -m "fix: stabilize drag and resize auto-hide"
```
