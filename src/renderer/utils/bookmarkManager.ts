export interface Bookmark {
  id: string
  bookId: string
  chapter: number
  line: number
  title: string
  createdAt: number
}

const STORAGE_KEY = 'readtime-bookmarks'

type BookmarkMap = Record<string, Bookmark[]>

export class BookmarkManager {
  constructor(private storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  // 每次都从存储读，避免多个实例各自缓存一份而互相看不见
  private read(): BookmarkMap {
    try {
      const data = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}')
      if (data && typeof data === 'object' && !Array.isArray(data)) return data as BookmarkMap
    } catch {
      // 数据损坏时按空书架处理
    }
    return {}
  }

  private write(data: BookmarkMap) {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  list(bookId: string): Bookmark[] {
    return this.read()[bookId] || []
  }

  add(bookId: string, chapter: number, line: number, title: string): Bookmark {
    const data = this.read()
    const bookmark: Bookmark = {
      id: `${Date.now()}-${(data[bookId] || []).length}-${Math.round(line)}`,
      bookId,
      chapter,
      line,
      title,
      createdAt: Date.now()
    }
    data[bookId] = [bookmark, ...(data[bookId] || [])]
    this.write(data)
    return bookmark
  }

  remove(bookId: string, id: string) {
    const data = this.read()
    data[bookId] = (data[bookId] || []).filter(bookmark => bookmark.id !== id)
    this.write(data)
  }

  removeBook(bookId: string) {
    const data = this.read()
    delete data[bookId]
    this.write(data)
  }
}
