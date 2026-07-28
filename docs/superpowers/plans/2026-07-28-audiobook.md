# ReadTime System Audiobook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline macOS system speech that starts at the current viewport, highlights and follows the spoken sentence, and continues across chapters.

**Architecture:** Keep speech in the renderer and use the native Web Speech API one sentence at a time. Pure helpers own sentence splitting and visible-position selection; a focused hook owns speech lifecycle; existing reader, controls, and settings only pass state and render it.

**Tech Stack:** Electron 28, React 18, TypeScript, Web Speech API, Jest/ts-jest, existing CSS.

## Global Constraints

- Add no dependency and no main-process or preload IPC.
- Use the macOS default system voice; do not add a voice selector.
- Rates are exactly 0.75×, 1×, 1.25×, 1.5×, and 2×; default is 1×.
- Start at the first visible sentence, highlight it, and follow it without scrolling on every sentence.
- Natural chapter completion continues to the next chapter; manual book/chapter navigation stops speech.
- Speech and auto-scroll are mutually exclusive.
- Preserve the existing `currentLine` progress format.
- Do not add AI voices, cloud speech, generated audio, background playback, media keys, or sync.

---

### Task 1: Sentence and viewport helpers

**Files:**
- Create: `src/renderer/utils/audiobook.ts`
- Test: `src/renderer/utils/__tests__/audiobook.test.ts`

**Interfaces:**
- Produces: `splitSentences(text: string): string[]`
- Produces: `firstVisibleSentence(rects: Array<{ top: number; bottom: number }>, viewportTop: number, viewportBottom: number): number`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { firstVisibleSentence, splitSentences } from '../audiobook'

test('preserves Chinese, English, and newline sentence text', () => {
  expect(splitSentences('你好。How are you?\n下一行！')).toEqual([
    '你好。',
    'How are you?',
    '\n',
    '下一行！'
  ])
})

test('drops no text and ignores empty input', () => {
  const text = '无标点结尾'
  expect(splitSentences(text).join('')).toBe(text)
  expect(splitSentences('')).toEqual([])
})

test('chooses the first intersecting sentence', () => {
  expect(firstVisibleSentence([
    { top: -40, bottom: -10 },
    { top: -5, bottom: 20 },
    { top: 20, bottom: 50 }
  ], 0, 40)).toBe(1)
})

test('falls back to the sentence nearest the viewport top', () => {
  expect(firstVisibleSentence([
    { top: -80, bottom: -40 },
    { top: 70, bottom: 90 }
  ], 0, 40)).toBe(1)
  expect(firstVisibleSentence([], 0, 40)).toBe(0)
})
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/audiobook.test.ts`

Expected: FAIL because `../audiobook` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

```ts
export function splitSentences(text: string): string[] {
  return text.match(/[^。！？.!?\n]+[。！？.!?]+|[^\n。！？.!?]+(?=\n|$)|\n/g) || []
}

export function firstVisibleSentence(
  rects: Array<{ top: number; bottom: number }>,
  viewportTop: number,
  viewportBottom: number
): number {
  const visible = rects.findIndex(rect => rect.bottom > viewportTop && rect.top < viewportBottom)
  if (visible >= 0) return visible
  if (!rects.length) return 0
  return rects.reduce((nearest, rect, index) =>
    Math.abs(rect.top - viewportTop) < Math.abs(rects[nearest].top - viewportTop) ? index : nearest
  , 0)
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/audiobook.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the helper**

```sh
git add src/renderer/utils/audiobook.ts src/renderer/utils/__tests__/audiobook.test.ts
git commit -m "feat: add audiobook text helpers"
```

### Task 2: Persist audiobook rate

**Files:**
- Modify: `src/renderer/contexts/SettingsContext.tsx`
- Modify: `src/renderer/components/Settings.tsx`
- Modify: `src/renderer/components/__tests__/Settings.test.tsx`

**Interfaces:**
- Produces: `AUDIOBOOK_RATES` with numeric values `0.75 | 1 | 1.25 | 1.5 | 2`
- Produces: `state.audiobookRate: number`
- Produces: `updateAudiobookRate(rate: number): void`
- Persists: localStorage key `readtime-audiobook-rate`

- [ ] **Step 1: Extend the settings render test first**

Add `AUDIOBOOK_RATES` to the context mock, add `audiobookRate: 1` and `updateAudiobookRate: jest.fn()` to the mocked value, then assert:

```ts
expect(markup).toContain('听书语速')
expect(markup).toContain('>1×</button>')
expect(markup).toContain('>2×</button>')
```

- [ ] **Step 2: Run the focused settings test**

Run: `npm test -- --runInBand src/renderer/components/__tests__/Settings.test.tsx`

Expected: FAIL because the component does not render “听书语速”.

- [ ] **Step 3: Add state, validation, and persistence**

In `SettingsContext.tsx`, export:

```ts
export const AUDIOBOOK_RATES = [0.75, 1, 1.25, 1.5, 2] as const
```

Add `audiobookRate` to `SettingsState`, initialize it only when the stored number is included in `AUDIOBOOK_RATES`, otherwise use `1`, and expose:

```ts
const updateAudiobookRate = useCallback((rate: number) => {
  if (!AUDIOBOOK_RATES.some(value => value === rate)) return
  localStorage.setItem('readtime-audiobook-rate', String(rate))
  setState(prev => ({ ...prev, audiobookRate: rate }))
}, [])
```

- [ ] **Step 4: Render the existing-style setting**

Import `AUDIOBOOK_RATES` in `Settings.tsx` and place this section after automatic-scroll speed:

```tsx
<div className="settings-section">
  <label className="settings-label">听书语速</label>
  <div className="speed-options">
    {AUDIOBOOK_RATES.map(rate => (
      <button
        key={rate}
        className={rate === audiobookRate ? 'active' : ''}
        onClick={() => updateAudiobookRate(rate)}
      >
        {rate}×
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Run the settings test and typecheck build**

Run: `npm test -- --runInBand src/renderer/components/__tests__/Settings.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS with the context mock matching the new interface.

- [ ] **Step 6: Commit the setting**

```sh
git add src/renderer/contexts/SettingsContext.tsx src/renderer/components/Settings.tsx src/renderer/components/__tests__/Settings.test.tsx
git commit -m "feat: add audiobook speed setting"
```

### Task 3: Speech lifecycle hook

**Files:**
- Create: `src/renderer/hooks/useAudiobook.ts`
- Modify: `src/renderer/utils/audiobook.ts`
- Modify: `src/renderer/utils/__tests__/audiobook.test.ts`

**Interfaces:**
- Consumes: `splitSentences(text: string): string[]`
- Consumes: current chapter content, chapter index/count, rate, and existing `nextChapter()`
- Produces:

```ts
interface AudiobookState {
  playing: boolean
  activeSentence: number | null
  error: string | null
  startAt: (sentence: number) => void
  toggle: (sentence: number) => void
  stop: () => void
}
```

- [ ] **Step 1: Add a failing transition test**

Extend `audiobook.test.ts` with a pure chapter-end decision:

```ts
import { chapterEndAction } from '../audiobook'

test('continues only when a next chapter exists', () => {
  expect(chapterEndAction(0, 2)).toBe('next')
  expect(chapterEndAction(1, 2)).toBe('stop')
})
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/audiobook.test.ts`

Expected: FAIL because `chapterEndAction` is missing.

- [ ] **Step 3: Add the pure decision**

```ts
export function chapterEndAction(currentChapter: number, chapterCount: number): 'next' | 'stop' {
  return currentChapter < chapterCount - 1 ? 'next' : 'stop'
}
```

- [ ] **Step 4: Implement `useAudiobook`**

The hook must:

- Return a no-op error state when `window.speechSynthesis` or `SpeechSynthesisUtterance` is unavailable.
- Store one monotonically increasing session id in a ref; increment it before every `cancel()` and ignore callbacks from older ids.
- Split the current chapter once with `useMemo`.
- Speak exactly one sentence per utterance with `utterance.lang = 'zh-CN'` and `utterance.rate = rate`.
- On `utterance.onend`, speak the next sentence, or call `nextChapter()` and mark a pending continuation when `chapterEndAction()` is `next`.
- On the next chapter render, consume pending continuation and start at sentence `0`; skip empty chapters with the same decision.
- On `utterance.onerror`, ignore the native `canceled` and `interrupted` errors; otherwise stop and set `系统朗读失败`.
- Use `pause()`/`resume()` for the same sentence; changing `rate` cancels and restarts the active sentence.
- Expose `stop()` and call it on unmount.

- [ ] **Step 5: Run helper tests and build**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/audiobook.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS with DOM Web Speech types.

- [ ] **Step 6: Commit the lifecycle**

```sh
git add src/renderer/hooks/useAudiobook.ts src/renderer/utils/audiobook.ts src/renderer/utils/__tests__/audiobook.test.ts
git commit -m "feat: add system speech lifecycle"
```

### Task 4: Reader highlighting, controls, and mutual exclusion

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/ReadingView.tsx`
- Modify: `src/renderer/components/ReadingView.css`
- Modify: `src/renderer/components/ControlBar.tsx`
- Modify: `src/renderer/components/ControlBar.css`

**Interfaces:**
- Consumes: `useAudiobook`, `splitSentences`, and `firstVisibleSentence`
- `ReadingView` adds props:

```ts
activeSentence: number | null
```

- `ControlBar` adds props:

```ts
audiobookPlaying: boolean
onToggleAudiobook: () => void
onStopAudiobook: () => void
```

- [ ] **Step 1: Render sentence spans and expose the visible starting index**

In `ReadingView`, memoize `splitSentences(chapter.content)`, render each piece as:

```tsx
<span
  key={index}
  data-sentence={index}
  className={index === activeSentence ? 'spoken-sentence' : undefined}
>
  {sentence}
</span>
```

Keep newline pieces in the DOM so `sentences.join('')` remains the original chapter.

- [ ] **Step 2: Follow only when the active sentence leaves the viewport**

On `activeSentence` change, find `[data-sentence="${activeSentence}"]`. If its rect does not intersect the reading view rect, call:

```ts
element.scrollIntoView({ behavior: 'smooth', block: 'center' })
```

Add theme-safe highlighting:

```css
.spoken-sentence {
  background: color-mix(in srgb, var(--accent-color) 24%, transparent);
  border-radius: 4px;
}
```

- [ ] **Step 3: Wire audiobook state in `App.tsx`**

Instantiate `useAudiobook` with the active chapter content, current chapter/count, `settingsState.audiobookRate`, and `nextChapter`.

Add one `getVisibleSentenceIndex()` callback in `App.tsx`: query `.reading-view` and its `[data-sentence]` children, collect their `getBoundingClientRect()` values, then call `firstVisibleSentence()` with the reading view rect. Use its result when calling `audiobook.toggle()`.

Make `toggleAutoScroll` call `audiobook.stop()` before starting auto-scroll. Make audiobook start set `autoScrolling` to false. Pass the active sentence to `ReadingView`.

Stop speech from the same manual navigation paths that already pause auto-scroll: previous/next buttons, table-of-contents selection, book selection, imported book, mouse wheel chapter advance, and Cmd+Arrow chapter shortcuts. Do not stop speech when settings opens.

On window hidden and automatic mouse-leave hiding, pause audiobook as well as auto-scroll so the app does not continue speaking while concealed.

- [ ] **Step 4: Add the dedicated control button**

Place it next to auto-scroll:

```tsx
<button
  className={`control-button audiobook-button ${audiobookPlaying ? 'active' : ''}`}
  disabled={!hasBook}
  onClick={onToggleAudiobook}
  title={audiobookPlaying ? '暂停听书' : '开始听书'}
  aria-label={audiobookPlaying ? '暂停听书' : '开始听书'}
>
  {audiobookPlaying ? 'Ⅱ' : '🔊'}
</button>
```

Use the existing button sizing; only add `.audiobook-button { font-size: 15px }` if the icon renders larger than adjacent controls.

- [ ] **Step 5: Surface speech errors without replacing the reader**

Render the hook error as a short, dismiss-on-next-start inline status near the control bar:

```tsx
{audiobook.error && <div className="audiobook-error" role="status">{audiobook.error}</div>}
```

Style it with existing theme variables and no fixed foreground color.

- [ ] **Step 6: Run the complete automated verification**

Run: `npm test -- --runInBand`

Expected: all suites pass.

Run: `npm run build`

Expected: TypeScript and Vite build pass.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 7: Manually verify the acceptance paths**

Run: `npm run electron:dev`

Verify:

1. TXT and EPUB start at the first visible sentence.
2. Pause/resume continues the same sentence; each configured rate takes effect.
3. The current sentence is highlighted and scrolls only after leaving view.
4. Natural completion crosses chapters and stops at the end of the book.
5. Manual book/chapter navigation stops speech.
6. Starting auto-scroll stops speech and starting speech stops auto-scroll.
7. Window concealment pauses speech.
8. Highlight and error text remain readable in every theme.

- [ ] **Step 8: Commit the integrated feature**

```sh
git add src/renderer/App.tsx src/renderer/components/ReadingView.tsx src/renderer/components/ReadingView.css src/renderer/components/ControlBar.tsx src/renderer/components/ControlBar.css
git commit -m "feat: add system audiobook controls"
```
