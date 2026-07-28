import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'

export interface BookRecord {
  id: string
  title: string
  format: 'txt' | 'epub'
  storedPath: string
  addedAt: number
  lastReadAt: number
}

export interface StoredBookData {
  book: BookRecord
  data: Uint8Array
}

export class BookStore {
  private readonly booksDir: string
  private readonly metadataPath: string

  constructor(userDataPath: string) {
    this.booksDir = path.join(userDataPath, 'books')
    this.metadataPath = path.join(this.booksDir, 'books.json')
  }

  private async load(): Promise<BookRecord[]> {
    try {
      const books = JSON.parse(await readFile(this.metadataPath, 'utf8'))
      return Array.isArray(books) ? books : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw new Error('书架数据损坏，已保留原文件')
    }
  }

  private async save(books: BookRecord[]) {
    await mkdir(this.booksDir, { recursive: true })
    const temporaryPath = `${this.metadataPath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(books, null, 2))
    await rename(temporaryPath, this.metadataPath)
  }

  async importBook(sourcePath: string): Promise<BookRecord> {
    const extension = path.extname(sourcePath).toLowerCase()
    if (extension !== '.txt' && extension !== '.epub') {
      throw new Error('仅支持 TXT 和 EPUB 文件')
    }

    const books = await this.load()
    await mkdir(this.booksDir, { recursive: true })
    const id = randomUUID()
    const storedPath = path.join(this.booksDir, `${id}${extension}`)
    await copyFile(sourcePath, storedPath)
    const now = Date.now()
    const book: BookRecord = {
      id,
      title: path.basename(sourcePath),
      format: extension.slice(1) as BookRecord['format'],
      storedPath,
      addedAt: now,
      lastReadAt: now
    }
    await this.save([book, ...books])
    return book
  }

  async listBooks(): Promise<BookRecord[]> {
    return (await this.load()).sort((a, b) => b.lastReadAt - a.lastReadAt)
  }

  async readBook(id: string): Promise<StoredBookData> {
    const book = (await this.load()).find(item => item.id === id)
    if (!book) throw new Error('书籍文件不存在，请重新导入')
    try {
      return { book, data: await readFile(book.storedPath) }
    } catch {
      throw new Error('书籍文件不存在，请重新导入')
    }
  }

  async touchBook(id: string): Promise<void> {
    const books = await this.load()
    const book = books.find(item => item.id === id)
    if (!book) return
    book.lastReadAt = Math.max(Date.now(), ...books.map(item => item.lastReadAt + 1))
    await this.save(books)
  }

  async removeBook(id: string): Promise<void> {
    const books = await this.load()
    const book = books.find(item => item.id === id)
    if (!book) return
    await unlink(book.storedPath).catch(() => undefined)
    await this.save(books.filter(item => item.id !== id))
  }
}
