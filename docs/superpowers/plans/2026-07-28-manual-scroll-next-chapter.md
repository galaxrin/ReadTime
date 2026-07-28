# Manual Scroll Next Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance to the next chapter when the user scrolls downward again at the bottom of the current chapter.

**Architecture:** Add one pure boundary predicate beside the existing auto-scroll calculation, then reuse it from `ReadingView`'s wheel handler. A renderer-local 500ms timer prevents touchpad inertia from advancing multiple chapters.

**Tech Stack:** React 18, TypeScript, Jest

## Global Constraints

- Only `deltaY > 0` can advance a chapter.
- Treat the reading area as being at the bottom within a 1px layout tolerance.
- Never advance beyond the last chapter.
- Keep existing auto-scroll, progress persistence, and control-bar behavior.
- Do not add dependencies or change the reading context.

---

### Task 1: Define the manual chapter-advance boundary

**Files:**
- Modify: `src/renderer/utils/autoScroll.ts`
- Test: `src/renderer/utils/__tests__/autoScroll.test.ts`

**Interfaces:**
- Consumes: wheel direction, scroll metrics, current chapter index, and chapter count.
- Produces: `shouldAdvanceChapter(deltaY, scrollTop, clientHeight, scrollHeight, currentChapter, chapterCount): boolean`.

- [ ] **Step 1: Write the failing test**

Add:

```ts
import { nextScrollPosition, shouldAdvanceChapter } from '../autoScroll'

test('advances only when scrolling down at the bottom with a next chapter', () => {
  expect(shouldAdvanceChapter(20, 500, 500, 1000, 0, 2)).toBe(true)
  expect(shouldAdvanceChapter(20, 499, 500, 1000, 0, 2)).toBe(true)
  expect(shouldAdvanceChapter(20, 498, 500, 1000, 0, 2)).toBe(false)
  expect(shouldAdvanceChapter(-20, 500, 500, 1000, 0, 2)).toBe(false)
  expect(shouldAdvanceChapter(20, 500, 500, 1000, 1, 2)).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/autoScroll.test.ts
```

Expected: FAIL because `shouldAdvanceChapter` is not exported.

- [ ] **Step 3: Implement the minimal predicate**

Add:

```ts
export function shouldAdvanceChapter(
  deltaY: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  currentChapter: number,
  chapterCount: number
) {
  return deltaY > 0
    && scrollTop + clientHeight >= scrollHeight - 1
    && currentChapter < chapterCount - 1
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/renderer/utils/__tests__/autoScroll.test.ts
```

Expected: PASS.

### Task 2: Advance from the reading view

**Files:**
- Modify: `src/renderer/components/ReadingView.tsx`

**Interfaces:**
- Consumes: `shouldAdvanceChapter(...)` and the existing `nextChapter()`.
- Produces: One chapter advance per eligible downward wheel gesture, with a 500ms inertia lock.

- [ ] **Step 1: Add the lock timer**

Import `shouldAdvanceChapter` and add:

```ts
const chapterAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 2: Clear the timer on unmount**

Add:

```ts
useEffect(() => () => {
  if (chapterAdvanceTimerRef.current) clearTimeout(chapterAdvanceTimerRef.current)
}, [])
```

- [ ] **Step 3: Replace the inline wheel handler**

Add:

```ts
const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
  onPause()
  onManualScroll()

  const element = contentRef.current
  if (!element || chapterAdvanceTimerRef.current || !shouldAdvanceChapter(
    event.deltaY,
    element.scrollTop,
    element.clientHeight,
    element.scrollHeight,
    currentChapter,
    chapters.length
  )) return

  element.scrollTop = 0
  nextChapter()
  chapterAdvanceTimerRef.current = setTimeout(() => {
    chapterAdvanceTimerRef.current = null
  }, 500)
}
```

Set the reading container to `onWheel={handleWheel}`.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: all Jest suites pass and the production build exits successfully.

- [ ] **Step 5: Commit only the feature files**

```bash
git add src/renderer/components/ReadingView.tsx src/renderer/utils/autoScroll.ts src/renderer/utils/__tests__/autoScroll.test.ts
git commit -m "feat: advance chapters on manual scroll"
```
