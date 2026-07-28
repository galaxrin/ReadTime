# Bookshelf and Reading Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist imported books inside the app, restore the most recently read book at launch, expose a bookshelf in the bottom control bar, and keep progress isolated by book ID.

**Architecture:** A small main-process `BookStore` owns copied files and JSON metadata under Electron `userData`. IPC exposes import/list/read/remove operations; `ReadingContext` owns bookshelf and active-book state, while the existing `ProgressManager` stores progress keyed by stable book ID.

**Tech Stack:** Electron 28, Node.js `fs/promises` and `crypto`, React 18, TypeScript, Jest.

## Global Constraints

- TXT and EPUB files are copied into `app.getPath('userData')/books`.
- Removing a book deletes only the internal copy and its app data, never the original file.
- Existing dependencies and the current bottom floating control bar are reused.
- Missing or corrupt internal copies produce a recoverable UI error instead of a blank window.

---

### Task 1: Persistent Book Store and IPC

**Files:**
- Create: `src/main/bookStore.ts`
- Create: `src/main/__tests__/bookStore.test.ts`
- Modify: `src/main/main.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/global.d.ts`

**Interfaces:**
- Produces: `BookRecord`, `BookStore.importBook(sourcePath)`, `listBooks()`, `readBook(id)`, `touchBook(id)`, and `removeBook(id)`.
- Produces renderer APIs: `importBook(path?)`, `listBooks()`, `readBook(id)`, `touchBook(id)`, and `removeBook(id)`.

- [ ] **Step 1: Write the failing storage test**

```ts
test('copies books, orders by last read, reads bytes, and removes only the copy', async () => {
  const store = new BookStore(tempUserData)
  const first = await store.importBook(sourceTxt)
  const second = await store.importBook(sourceEpub)
  await store.touchBook(first.id)

  expect((await store.listBooks()).map(book => book.id)).toEqual([first.id, second.id])
  expect(Buffer.from((await store.readBook(first.id)).data).toString()).toBe('hello')
  await store.removeBook(first.id)
  await expect(store.readBook(first.id)).rejects.toThrow('书籍文件不存在')
  await expect(readFile(sourceTxt, 'utf8')).resolves.toBe('hello')
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/main/__tests__/bookStore.test.ts`

Expected: FAIL because `../bookStore` does not exist.

- [ ] **Step 3: Implement the minimum store**

Use `mkdir`, `copyFile`, `readFile`, `writeFile`, `unlink`, `randomUUID`, and `extname`. Reject extensions other than `.txt` and `.epub`; write metadata atomically through a temporary JSON file and rename; sort by `lastReadAt` descending.

- [ ] **Step 4: Wire IPC**

Register:

```ts
ipcMain.handle('books:import', async (_event, sourcePath?: string) => {
  const selected = sourcePath || (await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: '电子书', extensions: ['txt', 'epub'] }]
  })).filePaths[0]
  return selected ? bookStore.importBook(selected) : null
})
ipcMain.handle('books:list', () => bookStore.listBooks())
ipcMain.handle('books:read', (_event, id: string) => bookStore.readBook(id))
ipcMain.handle('books:touch', (_event, id: string) => bookStore.touchBook(id))
ipcMain.handle('books:remove', (_event, id: string) => bookStore.removeBook(id))
```

Expose matching preload methods with explicit `BookRecord` and `StoredBookData` renderer types.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --runInBand src/main/__tests__/bookStore.test.ts`

Expected: PASS.

### Task 2: Active Book, Startup Restore, and Independent Progress

**Files:**
- Modify: `src/renderer/contexts/ReadingContext.tsx`
- Modify: `src/renderer/components/ReadingView.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/utils/progressManager.ts`
- Modify: `src/renderer/utils/__tests__/progressManager.test.ts`

**Interfaces:**
- Consumes: Task 1 `BookRecord` and Electron book APIs.
- Produces: context state `books`, `activeBook`; actions `importBook(file?)`, `openBook(id)`, and `removeBook(id)`.

- [ ] **Step 1: Write the failing independent-progress test**

```ts
test('keeps progress isolated for books with the same title', () => {
  manager.saveProgress('book-id-1', 1, 10)
  manager.saveProgress('book-id-2', 3, 30)
  expect(manager.loadProgress('book-id-1')).toMatchObject({ chapter: 1, line: 10 })
  expect(manager.loadProgress('book-id-2')).toMatchObject({ chapter: 3, line: 30 })
  manager.removeProgress('book-id-1')
  expect(manager.loadProgress('book-id-1')).toBeNull()
  expect(manager.loadProgress('book-id-2')).not.toBeNull()
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/progressManager.test.ts`

Expected: FAIL because `removeProgress` is missing.

- [ ] **Step 3: Add progress removal and switch callers to book IDs**

Add:

```ts
removeProgress(bookId: string) {
  this.progress.delete(bookId)
  this.save()
}
```

`ReadingView` saves with `activeBook.id`; `ReadingContext.openBook()` reconstructs a browser `File` from returned bytes, parses it with existing `loadFile()`, bounds-checks saved chapter/line, and touches the book after successful opening.

- [ ] **Step 4: Restore the most recent book**

On provider mount:

```ts
useEffect(() => {
  void refreshBooks().then(items => {
    if (items[0]) return openBook(items[0].id)
  }).catch(() => dispatch({ type: 'SET_ERROR', payload: '无法恢复上次阅读的书籍' }))
}, [])
```

Drag-and-drop passes Electron's file path to the IPC import call. A normal import button calls the native open dialog by omitting the path.

- [ ] **Step 5: Verify progress and renderer tests**

Run: `npm test -- --runInBand src/renderer/utils/__tests__/progressManager.test.ts`

Expected: PASS.

### Task 3: Bookshelf Popover

**Files:**
- Modify: `src/renderer/components/ControlBar.tsx`
- Modify: `src/renderer/components/ControlBar.css`

**Interfaces:**
- Consumes: Task 2 context `books`, `activeBook`, `importBook`, `openBook`, and `removeBook`.
- Produces: keyboard-accessible bookshelf popover in the existing floating control bar.

- [ ] **Step 1: Add bookshelf behavior**

Add a `▤` control button beside the table-of-contents button. The popover lists recent books, marks the active book, opens on title click, offers “导入书籍”, and uses a separate remove button with `window.confirm('从书架移除？原文件不会被删除。')`.

- [ ] **Step 2: Reuse existing popover styles**

Share the existing popover surface, header, scroll, focus, and active-state rules; add only the grid rows needed for title, format, and remove action.

- [ ] **Step 3: Run complete verification**

Run:

```bash
npm test -- --runInBand
npm run build
git diff --check
```

Expected: all Jest suites pass, TypeScript/Vite build succeeds, and `git diff --check` prints nothing.

- [ ] **Step 4: Runtime smoke test**

Restart Electron, import two files, switch between them, restart again, and confirm the last book and its independent position are restored.
