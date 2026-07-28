# ReadTime Immersive Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore clean manual scrolling and add TOC navigation, custom boss keys, and continuous auto-scroll.

**Architecture:** Extend existing parser/context/settings boundaries. Keep animation in one hook, global shortcut ownership in the main process, and UI state local to existing components.

**Tech Stack:** Electron 28, React 18, TypeScript, Jest, CSS

## Global Constraints

- TXT and EPUB only.
- No dependencies or new state framework.
- Reading text must have no shadow or glow.
- Preserve menu bar startup, themes, import, and progress.

---

### Task 1: Scroll and clean text

**Files:** `src/renderer/App.tsx`, `src/renderer/components/ReadingView.css`

- [ ] Restrict drag to a fixed top strip and mark reading content interactive.
- [ ] Remove all reading text shadows.
- [ ] Compile renderer.

### Task 2: TOC parsing and navigation

**Files:** `src/renderer/utils/fileParser.ts`, parser tests, `ControlBar.tsx`, `ControlBar.css`

- [ ] Add failing TXT preface/mixed-heading and EPUB title tests.
- [ ] Implement one shared heading matcher and EPUB navigation-title lookup.
- [ ] Add bottom-bar TOC popover with current chapter highlight and selection.
- [ ] Run focused and renderer tests.

### Task 3: Custom boss key

**Files:** `src/main/shortcuts.ts`, `src/main/main.ts`, `src/preload/preload.ts`, `src/renderer/global.d.ts`, `Settings.tsx`, `Settings.css`, `SettingsContext.tsx`

- [ ] Add failing shortcut replacement/conflict tests.
- [ ] Add IPC registration that replaces the old shortcut only after success.
- [ ] Add settings capture, persistence, conflict message, and reset.
- [ ] Run focused tests and both TypeScript compilers.

### Task 4: Continuous auto-scroll

**Files:** `src/renderer/hooks/useAutoScroll.ts`, hook tests, `ReadingView.tsx`, `ControlBar.tsx`, settings files

- [ ] Add failing tests for time-based movement, pause, and next-chapter continuation.
- [ ] Implement requestAnimationFrame scrolling with speed `10–120`, default `30`.
- [ ] Pause on wheel, content click, Space, settings/TOC open, and window hidden event.
- [ ] Run all tests, production build, and actual Electron verification.
