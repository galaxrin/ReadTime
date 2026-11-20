import { ProgressManager } from '../progressManager'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  }
}

describe('ProgressManager', () => {
  let storage: Storage
  let manager: ProgressManager

  beforeEach(() => {
    storage = createStorage()
    manager = new ProgressManager(storage)
  })

  test('saves and loads progress', () => {
    manager.saveProgress('book.txt', 2, 150)

    expect(manager.loadProgress('book.txt')).toEqual({
      filePath: 'book.txt',
      chapter: 2,
      line: 150,
      timestamp: expect.any(Number)
    })
  })

  test('persists progress for a new manager instance', () => {
    manager.saveProgress('book.txt', 1, 10)

    expect(new ProgressManager(storage).loadProgress('book.txt')).toMatchObject({
      chapter: 1,
      line: 10
    })
  })

  test('returns null for an unknown file', () => {
    expect(manager.loadProgress('missing.txt')).toBeNull()
  })

  test('lists every saved progress record', () => {
    manager.saveProgress('book-1.txt', 1, 10)
    manager.saveProgress('book-2.txt', 2, 20)

    expect(manager.getAllProgress()).toHaveLength(2)
  })

  test('a second manager sees writes made by another instance', () => {
    const first = new ProgressManager(storage)
    first.saveProgress('shared.txt', 3, 30)

    const second = new ProgressManager(storage)
    expect(second.loadProgress('shared.txt')).toMatchObject({ chapter: 3, line: 30 })

    // 第二个实例的写入不能被第一个实例的旧快照覆盖
    second.saveProgress('shared.txt', 5, 50)
    expect(first.loadProgress('shared.txt')).toMatchObject({ chapter: 5, line: 50 })
  })

  test('ignores corrupt saved progress', () => {
    storage.setItem('readtime-progress', '{broken')

    expect(() => new ProgressManager(storage)).not.toThrow()
    expect(new ProgressManager(storage).getAllProgress()).toEqual([])
  })

  test('keeps progress isolated for books with the same title', () => {
    manager.saveProgress('book-id-1', 1, 10)
    manager.saveProgress('book-id-2', 3, 30)

    expect(manager.loadProgress('book-id-1')).toMatchObject({ chapter: 1, line: 10 })
    expect(manager.loadProgress('book-id-2')).toMatchObject({ chapter: 3, line: 30 })

    manager.removeProgress('book-id-1')
    expect(manager.loadProgress('book-id-1')).toBeNull()
    expect(manager.loadProgress('book-id-2')).not.toBeNull()
  })
})
