# Adaptive Reading Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eight full-interface reading themes and show each user’s four most frequently selected themes in the primary settings view, with all twelve themes available in a secondary view.

**Architecture:** Extend the existing `defaultThemes` data and `ThemeManager`; no new theme abstraction is needed. `ThemeManager` owns a small validated `localStorage` usage map and exposes the ranked top four, while `SettingsContext` mirrors that result for the existing React settings component.

**Tech Stack:** TypeScript, React 18, CSS variables, Jest/ts-jest, Electron/Vite

## Global Constraints

- Preserve the existing themes: `纸张阅读`, `静谧深色`, `macOS 玻璃`, `透明白字`.
- Add exactly eight themes: `清爽白昼`, `青叶护眼`, `雾灰专注`, `晨雾蓝`, `纯黑夜读`, `深海蓝`, `琥珀夜灯`, `墨绿书房`.
- First use shows the existing four themes in the primary settings view.
- Primary ordering is selection count descending, then most recent selection descending.
- The secondary settings view shows all twelve themes.
- Theme changes affect the reader, controls, settings panel, and empty state through the existing CSS variables.
- Do not add dependencies, routing, a state library, or a custom color editor.
- Restoring a saved theme at startup must not increment its usage.
- Invalid usage data must fall back safely without changing the restored theme or typography.

---

## File Map

- `src/renderer/utils/themeManager.ts`: theme definitions, validated usage persistence, ranking, and CSS variable application.
- `src/renderer/utils/__tests__/themeManager.test.ts`: theme catalog, ranking, tie-break, and invalid-data regression checks.
- `src/renderer/contexts/SettingsContext.tsx`: expose the ranked primary themes and refresh them after a user selection.
- `src/renderer/components/Settings.tsx`: render the primary four-theme view and the secondary all-theme view.
- `src/renderer/components/Settings.css`: style the secondary-view entry, header, and twelve-theme grid.

---

### Task 1: Theme Catalog and Usage Ranking

**Files:**
- Modify: `src/renderer/utils/themeManager.ts:18-163`
- Test: `src/renderer/utils/__tests__/themeManager.test.ts:27-61`

**Interfaces:**
- Produces: `ThemeManager.getFrequentThemes(limit?: number): Theme[]`
- Produces: `ThemeManager.setTheme(theme: Theme): void`, extended so an explicit call records usage once.
- Persists: `readtime-theme-usage` as `Record<string, { count: number; lastUsedAt: number }>`
- Preserves: `defaultThemes: Theme[]` and all existing CSS variable names.

- [ ] **Step 1: Expand the catalog expectation to twelve themes**

Replace the existing catalog test with:

```ts
test('provides the approved reading themes', () => {
  expect(defaultThemes.map(theme => theme.name)).toEqual([
    '纸张阅读',
    '静谧深色',
    'macOS 玻璃',
    '透明白字',
    '清爽白昼',
    '青叶护眼',
    '雾灰专注',
    '晨雾蓝',
    '纯黑夜读',
    '深海蓝',
    '琥珀夜灯',
    '墨绿书房'
  ])
})
```

- [ ] **Step 2: Add failing ranking and corruption tests**

Add:

```ts
test('shows the original four themes before usage is recorded', () => {
  expect(new ThemeManager().getFrequentThemes().map(theme => theme.id)).toEqual([
    'paper', 'night', 'glass', 'transparent'
  ])
})

test('ranks themes by selection count and then recency', () => {
  const now = jest.spyOn(Date, 'now')
  const manager = new ThemeManager()

  now.mockReturnValueOnce(100)
  manager.setTheme(defaultThemes[5])
  now.mockReturnValueOnce(200)
  manager.setTheme(defaultThemes[4])
  now.mockReturnValueOnce(300)
  manager.setTheme(defaultThemes[5])

  expect(manager.getFrequentThemes().slice(0, 2).map(theme => theme.id)).toEqual([
    'sage', 'daylight'
  ])
  now.mockRestore()
})

test('ignores invalid usage records and fills from the default order', () => {
  values.set('readtime-theme-usage', JSON.stringify({
    night: { count: -1, lastUsedAt: 20 },
    unknown: { count: 9, lastUsedAt: 30 },
    paper: { count: 2, lastUsedAt: 'recent' }
  }))

  expect(new ThemeManager().getFrequentThemes().map(theme => theme.id)).toEqual([
    'paper', 'night', 'glass', 'transparent'
  ])
})

test('restoring a saved theme does not record a selection', () => {
  values.set('readtime-theme', JSON.stringify(defaultThemes[7]))

  const manager = new ThemeManager()

  expect(manager.getTheme().id).toBe('blue-mist')
  expect(values.get('readtime-theme-usage')).toBeUndefined()
})
```

- [ ] **Step 3: Run the focused tests and confirm they fail**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts
```

Expected: FAIL because the catalog still has four themes and `getFrequentThemes` does not exist.

- [ ] **Step 4: Add the eight theme objects**

Append these objects after `transparent` in `defaultThemes`:

```ts
{
  id: 'daylight',
  name: '清爽白昼',
  textColor: '#222831',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 1,
  appBackground: '#edf0f3',
  readerBackground: '#f7f8fa',
  surfaceBackground: 'rgba(255, 255, 255, 0.94)',
  controlBackground: 'rgba(255, 255, 255, 0.84)',
  borderColor: 'rgba(34, 40, 49, 0.12)',
  mutedColor: '#79808a',
  accentColor: '#356b8c'
},
{
  id: 'sage',
  name: '青叶护眼',
  textColor: '#29362d',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 1,
  appBackground: '#cfdccf',
  readerBackground: 'linear-gradient(145deg, #e7efe4, #dbe7d8)',
  surfaceBackground: 'rgba(239, 246, 237, 0.94)',
  controlBackground: 'rgba(235, 244, 232, 0.84)',
  borderColor: 'rgba(41, 54, 45, 0.13)',
  mutedColor: '#657267',
  accentColor: '#54745e'
},
{
  id: 'mist',
  name: '雾灰专注',
  textColor: '#303438',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 1,
  appBackground: '#d3d6d8',
  readerBackground: 'linear-gradient(145deg, #eceeef, #dfe2e4)',
  surfaceBackground: 'rgba(242, 243, 244, 0.94)',
  controlBackground: 'rgba(238, 240, 241, 0.84)',
  borderColor: 'rgba(48, 52, 56, 0.12)',
  mutedColor: '#73787d',
  accentColor: '#5e6870'
},
{
  id: 'blue-mist',
  name: '晨雾蓝',
  textColor: '#253741',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 1,
  appBackground: '#ccdbe3',
  readerBackground: 'linear-gradient(145deg, #e7f0f4, #d8e5ec)',
  surfaceBackground: 'rgba(238, 246, 249, 0.94)',
  controlBackground: 'rgba(232, 242, 247, 0.84)',
  borderColor: 'rgba(37, 55, 65, 0.13)',
  mutedColor: '#637984',
  accentColor: '#4d7488'
},
{
  id: 'oled',
  name: '纯黑夜读',
  textColor: '#e9e9e7',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 0.95,
  appBackground: '#000000',
  readerBackground: '#050505',
  surfaceBackground: 'rgba(15, 15, 15, 0.96)',
  controlBackground: 'rgba(20, 20, 20, 0.88)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  mutedColor: '#888888',
  accentColor: '#d0d0cc'
},
{
  id: 'navy',
  name: '深海蓝',
  textColor: '#dbe5ef',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 0.96,
  appBackground: '#0b1420',
  readerBackground: 'radial-gradient(circle at 60% -10%, #1d334b, #111d2c 48%, #0b1420)',
  surfaceBackground: 'rgba(19, 34, 50, 0.95)',
  controlBackground: 'rgba(25, 43, 61, 0.84)',
  borderColor: 'rgba(219, 229, 239, 0.1)',
  mutedColor: '#8194a8',
  accentColor: '#91b5d2'
},
{
  id: 'amber',
  name: '琥珀夜灯',
  textColor: '#ead8b8',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 0.96,
  appBackground: '#1e1711',
  readerBackground: 'radial-gradient(circle at 60% -10%, #493522, #2b2118 48%, #1e1711)',
  surfaceBackground: 'rgba(52, 39, 28, 0.95)',
  controlBackground: 'rgba(65, 48, 33, 0.84)',
  borderColor: 'rgba(234, 216, 184, 0.11)',
  mutedColor: '#ad9270',
  accentColor: '#d3aa72'
},
{
  id: 'forest',
  name: '墨绿书房',
  textColor: '#d8e5dc',
  textShadow: 'none',
  fontSize: 17,
  lineHeight: 1.9,
  opacity: 0.96,
  appBackground: '#101a16',
  readerBackground: 'radial-gradient(circle at 60% -10%, #2a4035, #17251f 48%, #101a16)',
  surfaceBackground: 'rgba(25, 40, 33, 0.95)',
  controlBackground: 'rgba(31, 49, 40, 0.84)',
  borderColor: 'rgba(216, 229, 220, 0.1)',
  mutedColor: '#82988a',
  accentColor: '#98b8a3'
}
```

- [ ] **Step 5: Implement validated usage loading and ranking**

Add beside `STORAGE_KEY`:

```ts
const USAGE_STORAGE_KEY = 'readtime-theme-usage'

interface ThemeUsage {
  count: number
  lastUsedAt: number
}

function loadThemeUsage(): Record<string, ThemeUsage> {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || '{}')
    return Object.fromEntries(Object.entries(saved).filter(([id, value]) => {
      const usage = value as Partial<ThemeUsage>
      return defaultThemes.some(theme => theme.id === id) &&
        Number.isFinite(usage.count) && usage.count! >= 0 &&
        Number.isFinite(usage.lastUsedAt) && usage.lastUsedAt! >= 0
    })) as Record<string, ThemeUsage>
  } catch {
    return {}
  }
}
```

Add a field and methods to `ThemeManager`:

```ts
private usage = loadThemeUsage()

getFrequentThemes(limit = 4): Theme[] {
  return [...defaultThemes]
    .sort((left, right) => {
      const leftUsage = this.usage[left.id]
      const rightUsage = this.usage[right.id]
      return (rightUsage?.count ?? 0) - (leftUsage?.count ?? 0) ||
        (rightUsage?.lastUsedAt ?? 0) - (leftUsage?.lastUsedAt ?? 0) ||
        defaultThemes.indexOf(left) - defaultThemes.indexOf(right)
    })
    .slice(0, limit)
}

private recordThemeUse(theme: Theme) {
  const previous = this.usage[theme.id]
  this.usage = {
    ...this.usage,
    [theme.id]: {
      count: (previous?.count ?? 0) + 1,
      lastUsedAt: Date.now()
    }
  }
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(this.usage))
}
```

Call `this.recordThemeUse(theme)` once at the end of `setTheme`, after saving the current theme. Do not call it from the constructor.

- [ ] **Step 6: Run the focused tests**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts
```

Expected: PASS for the full theme manager test file.

- [ ] **Step 7: Commit the catalog and ranking**

```bash
git add src/renderer/utils/themeManager.ts src/renderer/utils/__tests__/themeManager.test.ts
git commit -m "feat: add adaptive reading themes"
```

---

### Task 2: Primary and Secondary Theme Menus

**Files:**
- Modify: `src/renderer/contexts/SettingsContext.tsx:5-104`
- Modify: `src/renderer/components/Settings.tsx:1-171`
- Modify: `src/renderer/components/Settings.css:22-95`

**Interfaces:**
- Consumes: `ThemeManager.getFrequentThemes(limit?: number): Theme[]`
- Produces in `SettingsState`: `frequentThemes: Theme[]`
- Preserves: `themes: Theme[]` as the complete twelve-theme catalog.

- [ ] **Step 1: Expose frequent themes from the settings context**

Add `frequentThemes: Theme[]` to `SettingsState`, initialize it with `themeManager.getFrequentThemes()`, and update `setTheme` to refresh it:

```ts
const setTheme = useCallback((theme: Theme) => {
  themeManager.setTheme(theme)
  setState(prev => ({
    ...prev,
    currentTheme: theme,
    frequentThemes: themeManager.getFrequentThemes()
  }))
}, [themeManager])
```

- [ ] **Step 2: Add local secondary-view state and reset behavior**

In `Settings`, destructure `frequentThemes`, add:

```ts
const [showAllThemes, setShowAllThemes] = useState(false)

useEffect(() => {
  if (!showSettings) setShowAllThemes(false)
}, [showSettings])
```

Keep this state local because no other component consumes it.

- [ ] **Step 3: Replace the theme section with the two views**

Use this structure in the existing theme section:

```tsx
<div className="settings-section">
  <div className="theme-section-header">
    {showAllThemes ? (
      <button className="theme-back" onClick={() => setShowAllThemes(false)}>‹ 返回</button>
    ) : (
      <label className="settings-label">阅读主题</label>
    )}
    {showAllThemes && <span>全部主题</span>}
  </div>
  <div className={`theme-buttons ${showAllThemes ? 'all-themes' : ''}`}>
    {(showAllThemes ? themes : frequentThemes).map(theme => (
      <button
        key={theme.id}
        className={`theme-button ${currentTheme.id === theme.id ? 'active' : ''}`}
        onClick={() => setTheme(theme)}
      >
        <span
          className="theme-swatch"
          style={{ background: theme.id === 'transparent' ? '#889296' : theme.readerBackground }}
        >
          <span style={{ color: theme.textColor, textShadow: theme.textShadow }}>Aa</span>
        </span>
        <span className="theme-name">{theme.name}</span>
      </button>
    ))}
  </div>
  {!showAllThemes && (
    <button className="all-themes-button" onClick={() => setShowAllThemes(true)}>
      <span>全部主题</span><span>12 ›</span>
    </button>
  )}
</div>
```

Use IDs rather than names for React keys and active comparison.

- [ ] **Step 4: Style the two menu states**

Add:

```css
.theme-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 10px;
  color: var(--muted-color);
  font-size: 11px;
  font-weight: 650;
}

.theme-section-header .settings-label { margin: 0 }
.theme-back, .all-themes-button {
  color: var(--muted-color);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.theme-back { padding: 4px 0 }
.theme-back:hover, .theme-back:focus-visible,
.all-themes-button:hover, .all-themes-button:focus-visible {
  color: var(--text-color);
  outline: none;
}
.all-themes-button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
  padding: 10px 8px;
  border-radius: 10px;
}
.all-themes-button:hover, .all-themes-button:focus-visible {
  background: color-mix(in srgb, var(--text-color) 8%, transparent);
}
.theme-buttons.all-themes {
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.theme-buttons.all-themes .theme-button { padding: 6px }
.theme-buttons.all-themes .theme-swatch { height: 42px }
.theme-buttons.all-themes .theme-name { font-size: 10px }
```

- [ ] **Step 5: Run theme tests and the TypeScript/build check**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/themeManager.test.ts
npm run build
```

Expected: theme tests PASS and the production build exits 0.

- [ ] **Step 6: Commit the settings UI**

```bash
git add src/renderer/contexts/SettingsContext.tsx src/renderer/components/Settings.tsx src/renderer/components/Settings.css
git commit -m "feat: prioritize frequently used themes"
```

---

### Task 3: Regression and Visual Verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Verifies the twelve-theme catalog, ranking storage, settings navigation, and existing app behavior.

- [ ] **Step 1: Run the full automated test suite**

Run:

```bash
npm test -- --runInBand
```

Expected: all Jest suites PASS.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: both TypeScript projects compile, Vite completes, `fix-build.sh` exits 0, and the command returns exit code 0.

- [ ] **Step 3: Launch the Electron app**

Run:

```bash
npm run electron:dev
```

Expected: the ReadTime Electron window opens without a renderer error.

- [ ] **Step 4: Check the primary and secondary menus**

In the Electron window:

1. Open settings and confirm the primary theme cards are `纸张阅读`, `静谧深色`, `macOS 玻璃`, `透明白字` when `readtime-theme-usage` is absent.
2. Open `全部主题 · 12` and confirm all twelve named themes are visible.
3. Select `青叶护眼` twice and `深海蓝` once.
4. Close and reopen settings; confirm `青叶护眼` ranks before `深海蓝` in the primary four.
5. Restart the app; confirm the primary order and selected theme persist.

- [ ] **Step 5: Check every theme and protected behavior**

For each of the twelve themes, confirm the reading area, control bar, settings panel, and empty state use a coherent palette and readable text. Then confirm drag import, previous/next chapter, auto-hide, boss key, font size, line height, and text opacity still work.

- [ ] **Step 6: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended theme implementation files remain changed by this plan. Existing unrelated user changes must remain untouched.
