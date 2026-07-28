# Settings Brand Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display `ReadTime by 脏咖喱 · Galaxrin` at the bottom of the settings panel and package the updated macOS app.

**Architecture:** Add one static semantic text element to the existing settings panel and style it with the current theme's muted color. Reuse the existing server-rendered settings test and `npm run pack` directory packaging command.

**Tech Stack:** React 18, TypeScript, CSS, Jest, Electron Builder

## Global Constraints

- Show the signature only at the bottom of the settings panel.
- Use the exact text `ReadTime by 脏咖喱 · Galaxrin`.
- Do not add a background, divider, link, logo, interaction, or dependency.
- Center the 10px text and let it scroll with the settings panel.
- Generate `.app` only, without DMG or ZIP.

---

### Task 1: Render and style the signature

**Files:**
- Modify: `src/renderer/components/Settings.tsx`
- Modify: `src/renderer/components/Settings.css`
- Test: `src/renderer/components/__tests__/Settings.test.tsx`

**Interfaces:**
- Consumes: Existing settings panel markup and `--muted-color`.
- Produces: `<p className="settings-signature">ReadTime by 脏咖喱 · Galaxrin</p>`.

- [ ] **Step 1: Write the failing test**

Add:

```ts
expect(markup).toContain('ReadTime by 脏咖喱 · Galaxrin')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/renderer/components/__tests__/Settings.test.tsx
```

Expected: FAIL because the settings markup does not contain the signature.

- [ ] **Step 3: Add the signature markup**

Immediately after `.settings-hint`, add:

```tsx
<p className="settings-signature">ReadTime by 脏咖喱 · Galaxrin</p>
```

- [ ] **Step 4: Add the minimal style**

```css
.settings-signature {
  margin: 12px 0 0;
  color: var(--muted-color);
  font-size: 10px;
  text-align: center;
  opacity: .65;
}
```

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
npm test -- --runInBand src/renderer/components/__tests__/Settings.test.tsx
npm test -- --runInBand
npm run build
```

Expected: the focused test, all Jest suites, and the production build pass.

### Task 2: Package the app

**Files:**
- Output: `release/mac-arm64/ReadTime.app`

**Interfaces:**
- Consumes: Verified production source.
- Produces: An arm64 macOS `.app` bundle without DMG or ZIP.

- [ ] **Step 1: Run directory packaging**

Run:

```bash
npm run pack
```

If the local certificate chain blocks Electron download, rerun the same command with the project's existing temporary Node TLS compatibility environment.

- [ ] **Step 2: Verify the bundle**

Run:

```bash
test -d release/mac-arm64/ReadTime.app
du -sh release/mac-arm64/ReadTime.app
codesign -dv --verbose=2 release/mac-arm64/ReadTime.app
```

Expected: the bundle exists, reports arm64, and exposes its signing status.
