import { BookmarkManager } from '../bookmarkManager'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => void data.set(key, value)),
    data
  } as unknown as Storage
}

test('added bookmark survives a reload', () => {
  const storage = memoryStorage()
  const manager = new BookmarkManager(storage)
  const bookmark = manager.add('book-1', 3, 12, '第三章 落雨')

  expect(manager.list('book-1')).toHaveLength(1)
  expect(bookmark.chapter).toBe(3)

  const reloaded = new BookmarkManager(storage)
  expect(reloaded.list('book-1')[0]).toMatchObject({ chapter: 3, line: 12, title: '第三章 落雨' })
})

test('newest bookmark comes first and stays per book', () => {
  const storage = memoryStorage()
  const manager = new BookmarkManager(storage)
  manager.add('book-1', 1, 0, '第一章')
  const second = manager.add('book-1', 5, 40, '第五章')
  manager.add('book-2', 2, 8, '另一本的第二章')

  expect(manager.list('book-1')[0].id).toBe(second.id)
  expect(manager.list('book-1')).toHaveLength(2)
  expect(manager.list('book-2')).toHaveLength(1)
})

test('remove drops one bookmark, removeBook drops the whole book', () => {
  const storage = memoryStorage()
  const manager = new BookmarkManager(storage)
  const first = manager.add('book-1', 1, 0, '一')
  manager.add('book-1', 2, 5, '二')

  manager.remove('book-1', first.id)
  expect(manager.list('book-1')).toHaveLength(1)

  manager.removeBook('book-1')
  expect(manager.list('book-1')).toHaveLength(0)
})

test('works without any storage available', () => {
  const manager = new BookmarkManager(null)
  expect(manager.list('book-1')).toHaveLength(0)
  expect(() => manager.add('book-1', 1, 0, '一')).not.toThrow()
})
