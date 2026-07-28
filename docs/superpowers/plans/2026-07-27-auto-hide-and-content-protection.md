# Auto-Hide and Content Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate mouse-leave concealment across every theme, tray-assisted recovery, and native screen-capture protection.

**Architecture:** Renderer settings own the persisted preference and renderer UI owns concealment. A minimal IPC bridge reports concealment to `TransparentWindow`, whose state drives the tray menu and whose recovery method tells the renderer to reveal. Screen-capture protection is enabled once when the native window is created.

**Tech Stack:** Electron 28, React 18, TypeScript, Jest, localStorage, Electron IPC.

## Global Constraints

- Auto-hide defaults to disabled and has no delay setting.
- Auto-hide must apply outside the theme layer so every theme behaves identically.
- Open settings, table of contents, or bookshelf must prevent concealment.
- Content protection is always enabled and has no setting.
- Preserve all existing uncommitted work and add no dependency.

---

### Task 1: Native window privacy and tray recovery

**Files:**
- Create: `src/main/__tests__/window.test.ts`
- Modify: `src/main/window.ts`
- Modify: `src/main/tray.ts`
- Modify: `src/main/__tests__/tray.test.ts`

**Interfaces:**
- Produces: `TransparentWindow.setAutoHidden(hidden: boolean): void`
- Produces: `TransparentWindow.isAutoHidden(): boolean`
- Produces: `TransparentWindow.reveal(): void`
- Produces: `ToggleableWindow.isAutoHidden(): boolean`
- Produces: `ToggleableWindow.reveal(): void`

- [ ] **Step 1: Write failing window tests**

Mock Electron `BrowserWindow` and assert that `create()` calls `setContentProtection(true)`. Set the window to auto-hidden, call `reveal()`, then assert that it sends `window:reveal`, calls `show()`, and calls `focus()`.

- [ ] **Step 2: Verify the window tests fail**

Run: `npm test -- --runInBand src/main/__tests__/window.test.ts`

Expected: FAIL because content protection and reveal state do not exist.

- [ ] **Step 3: Implement native privacy and recovery**

After creating `BrowserWindow`, call:

```ts
this.window.setContentProtection(true)
```

Store `autoHidden` in `TransparentWindow`; `setAutoHidden` updates it, and `reveal` clears it, sends `window:reveal`, then calls the existing `show()` plus `focus()`.

- [ ] **Step 4: Verify the window tests pass**

Run: `npm test -- --runInBand src/main/__tests__/window.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing tray tests**

Extend the tray window fake with `isAutoHidden` and `reveal`. Assert an auto-hidden window produces the label `显示阅读窗口`, and clicking that item calls `reveal()` instead of `toggle()`.

- [ ] **Step 6: Verify the tray tests fail**

Run: `npm test -- --runInBand src/main/__tests__/tray.test.ts`

Expected: FAIL because the menu only checks native visibility.

- [ ] **Step 7: Implement tray recovery**

Use `!window.isVisible() || window.isAutoHidden()` as the “show” state. Route the menu click to `reveal()` in that state and to `toggle()` otherwise.

- [ ] **Step 8: Verify native and tray tests pass**

Run: `npm test -- --runInBand src/main/__tests__/window.test.ts src/main/__tests__/tray.test.ts`

Expected: PASS.

### Task 2: IPC bridge and persisted setting

**Files:**
- Modify: `src/main/main.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/global.d.ts`
- Modify: `src/renderer/contexts/SettingsContext.tsx`
- Create: `src/renderer/utils/autoHideSetting.ts`
- Create: `src/renderer/utils/__tests__/autoHideSetting.test.ts`

**Interfaces:**
- Produces: `loadAutoHide(storage?: Storage): boolean`
- Produces: `saveAutoHide(enabled: boolean, storage?: Storage): void`
- Produces: `electronAPI.setWindowAutoHidden(hidden: boolean): void`
- Produces: `electronAPI.onWindowReveal(callback: () => void): () => void`
- Produces: `SettingsState.autoHideOnMouseLeave: boolean`
- Produces: `updateAutoHideOnMouseLeave(enabled: boolean): void`

- [ ] **Step 1: Write failing persistence tests**

Assert missing or malformed storage values load as `false`, `"true"` loads as `true`, and saving writes the literal string `"true"` or `"false"` to `readtime-auto-hide`.

- [ ] **Step 2: Verify persistence tests fail**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/autoHideSetting.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal persistence helper and setting state**

Use direct string comparison:

```ts
export const loadAutoHide = (storage = localStorage) =>
  storage.getItem('readtime-auto-hide') === 'true'
```

Add the setting to `SettingsContext`, persist on update, and expose its updater.

- [ ] **Step 4: Add the IPC bridge**

Register `window:auto-hidden` in `main.ts`, forward it with `ipcRenderer.send`, expose `window:reveal` subscription in preload, and add matching TypeScript declarations.

- [ ] **Step 5: Verify persistence tests and TypeScript pass**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/autoHideSetting.test.ts`

Expected: PASS.

Run: `npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.json --noEmit`

Expected: both exit 0.

### Task 3: Settings control and renderer concealment

**Files:**
- Create: `src/renderer/utils/autoHide.ts`
- Create: `src/renderer/utils/__tests__/autoHide.test.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Settings.tsx`
- Modify: `src/renderer/components/Settings.css`
- Modify: `src/renderer/components/ControlBar.tsx`
- Modify: `src/renderer/components/ReadingView.css`

**Interfaces:**
- Produces: `shouldAutoHide(enabled: boolean, hasOpenOverlay: boolean): boolean`
- Changes: `ControlBar` reports whether its table of contents or bookshelf is open.

- [ ] **Step 1: Write failing concealment-policy tests**

Assert concealment is allowed only when the preference is enabled and no settings, table of contents, or bookshelf overlay is open.

- [ ] **Step 2: Verify policy tests fail**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/autoHide.test.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the minimal policy**

```ts
export const shouldAutoHide = (enabled: boolean, hasOpenOverlay: boolean) =>
  enabled && !hasOpenOverlay
```

- [ ] **Step 4: Wire renderer behavior**

Track `autoHidden` and ControlBar overlay state in `AppContent`. On permitted mouse leave: pause scrolling, set hidden, and notify main. On mouse enter or `window:reveal`: clear hidden and notify main. Apply a single `auto-hidden` class to `app-shell`.

- [ ] **Step 5: Add the settings control**

Add one checkbox row labeled `鼠标移出自动隐藏` with help text `移出窗口立即隐藏，移回恢复`.

- [ ] **Step 6: Apply theme-independent concealment**

Use the outer class to hide all children visually while retaining the window hit area:

```css
.app-shell.auto-hidden > * {
  opacity: 0;
  pointer-events: none;
}
```

Keep the shell itself transparent and interactive.

- [ ] **Step 7: Run focused tests**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/autoHide.test.ts src/renderer/utils/__tests__/autoHideSetting.test.ts src/main/__tests__/window.test.ts src/main/__tests__/tray.test.ts`

Expected: PASS.

- [ ] **Step 8: Run full verification**

Run: `npm test -- --runInBand`

Expected: all suites pass.

Run: `npm run build`

Expected: exit 0 and renderer/main bundles generated successfully.
