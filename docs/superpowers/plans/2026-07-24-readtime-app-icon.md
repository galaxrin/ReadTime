# ReadTime App Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the generated ReadTime logo as the packaged macOS application icon.

**Architecture:** Point electron-builder's mac configuration at the existing square PNG and let its native packaging pipeline create the application icon. Verify both the normal build and a packaged `.app`.

**Tech Stack:** Electron Builder

## Global Constraints

- Reuse `assets/readtime-logo.png`.
- Add no dependencies.
- Do not modify existing unrelated working-tree changes.

---

### Task 1: Package the macOS icon

**Files:**
- Modify: `electron-builder.json`

**Interfaces:**
- Consumes: `assets/readtime-logo.png`
- Produces: a macOS application bundle whose `CFBundleIconFile` resolves to the packaged icon

- [ ] **Step 1: Configure Electron Builder**

Add the icon to the existing `mac` object:

```json
"icon": "assets/readtime-logo.png"
```

- [ ] **Step 2: Verify**

Run:

```bash
npm run build
npx electron-builder --mac dir
plutil -p "release/mac-arm64/ReadTime.app/Contents/Info.plist"
```

Expected: both builds exit successfully and `CFBundleIconFile` names the packaged icon.
