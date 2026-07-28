# ReadTime Menu Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start ReadTime as a hidden macOS menu bar application with no Dock icon.

**Architecture:** Keep `TransparentWindow` as the only owner of window visibility. Add one native `MenuBarManager` that owns Electron `Tray`, forwards click actions to the window, and exposes the only explicit quit path.

**Tech Stack:** Electron 28, TypeScript, Jest

## Global Constraints

- Use Electron native `Tray`, `Menu`, and `nativeImage`.
- Reuse `assets/readtime-logo.png`.
- Add no dependencies.
- Preserve all existing reading, theme, boss-key, and progress behavior.
- Preserve unrelated working-tree changes.

---

### Task 1: Window lifecycle

**Files:**
- Modify: `src/main/window.ts`

**Interfaces:**
- Produces: `create(show?: boolean)`, `show()`, `hide()`, `toggle()`, `isVisible()`, and `prepareToQuit()`

- [ ] Add native hidden creation with `BrowserWindow.show`.
- [ ] Replace off-screen opacity hiding with `BrowserWindow.hide()` and `show()`.
- [ ] Intercept window close as hide until `prepareToQuit()` is called.
- [ ] Run `npx tsc -p tsconfig.main.json --noEmit`.

### Task 2: Native menu bar controller

**Files:**
- Create: `src/main/__tests__/tray.test.ts`
- Create: `src/main/tray.ts`
- Modify: `electron-builder.json`

**Interfaces:**
- Consumes: `TransparentWindow`; Electron application quit callback
- Produces: `MenuBarManager.create()` and `MenuBarManager.destroy()`

- [ ] Write failing tests for left-click toggle, dynamic right-click label, and quit.
- [ ] Run `npm test -- --runInBand src/main/__tests__/tray.test.ts` and confirm RED.
- [ ] Implement the smallest `Tray` controller using the existing logo resized to 18×18.
- [ ] Include `assets/**/*` in packaged files.
- [ ] Run the focused test and confirm GREEN.

### Task 3: macOS startup wiring and verification

**Files:**
- Modify: `src/main/main.ts`

**Interfaces:**
- Consumes: `TransparentWindow`, `MenuBarManager`, and `ShortcutManager`
- Produces: hidden macOS startup, hidden Dock icon, persistent tray process

- [ ] On macOS hide the Dock, create the window hidden, and create the menu bar icon.
- [ ] Keep non-macOS startup behavior unchanged.
- [ ] Prepare the window for close during application quit and destroy the tray.
- [ ] Run `npm test -- --runInBand && npm run build`.
- [ ] Launch Electron and verify Dock absence, menu bar presence, default-hidden window, left-click toggle, right-click menu, boss key, and quit.
