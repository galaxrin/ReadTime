# Transparent Theme and Control Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve transparent-mode readability and replace the bookshelf/catalog text glyphs with a coherent icon pair.

**Architecture:** Keep the reading surface transparent and apply the existing theme shadow token to reader text. Add transparent-theme-only header/control treatments and use two dependency-free inline SVGs in the existing buttons.

**Tech Stack:** React, CSS, inline SVG

## Global Constraints

- Do not add an icon dependency.
- Do not change reading, bookshelf, or navigation behavior.
- Preserve the fully transparent reading surface.

---

### Task 1: Transparent mode polish and icons

**Files:**
- Modify: `src/renderer/components/ReadingView.css`
- Modify: `src/renderer/components/ControlBar.css`
- Modify: `src/renderer/components/ControlBar.tsx`

- [ ] Replace the bookshelf and catalog text glyphs with 18px `currentColor` outline SVGs.
- [ ] Apply the existing text-shadow token and add transparent-only header/control contrast.
- [ ] Run `npm test -- --runInBand` and `npm run build`.
