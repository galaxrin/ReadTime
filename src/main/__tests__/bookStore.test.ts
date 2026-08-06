import { mkdir, mkdtemp, readFile, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { BookStore } from '../bookStore'

describe('BookStore', () => {
  test('copies, reads, orders and removes books without deleting originals', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'readtime-books-'))
    const sourceTxt = path.join(root, 'same.txt')
    const sourceEpub = path.join(root, 'same.epub')
    await writeFile(sourceTxt, 'hello')
    await writeFile(sourceEpub, 'epub')
    const store = new BookStore(path.join(root, 'userdata'))

    const first = await store.importBook(sourceTxt)
    const second = await store.importBook(sourceEpub)
    await store.touchBook(first.id)

    expect((await store.listBooks()).map(book => book.id)).toEqual([first.id, second.id])
    expect(Buffer.from((await store.readBook(first.id)).data).toString()).toBe('hello')

    await store.removeBook(first.id)
    await expect(store.readBook(first.id)).rejects.toThrow('书籍文件不存在')
    await expect(readFile(sourceTxt, 'utf8')).resolves.toBe('hello')
  })

  test('rejects unsupported file types', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'readtime-books-'))
    const source = path.join(root, 'notes.pdf')
    await writeFile(source, 'nope')

    await expect(new BookStore(path.join(root, 'userdata')).importBook(source))
      .rejects.toThrow('仅支持 TXT 和 EPUB 文件')
  })

  test('preserves corrupt metadata instead of replacing it', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'readtime-books-'))
    const userData = path.join(root, 'userdata')
    const booksDir = path.join(userData, 'books')
    const metadataPath = path.join(booksDir, 'books.json')
    const source = path.join(root, 'book.txt')
    await writeFile(source, 'hello')
    await mkdir(booksDir, { recursive: true })
    await writeFile(metadataPath, '{broken')

    await expect(new BookStore(userData).importBook(source))
      .rejects.toThrow('书架数据损坏')
    await expect(readFile(metadataPath, 'utf8')).resolves.toBe('{broken')
  })

  test('rejects stored paths outside the managed books directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'readtime-books-'))
    const userData = path.join(root, 'userdata')
    const booksDir = path.join(userData, 'books')
    const metadataPath = path.join(booksDir, 'books.json')
    const outsidePath = path.join(root, 'outside.txt')
    await mkdir(booksDir, { recursive: true })
    await writeFile(outsidePath, 'keep me')
    await writeFile(metadataPath, JSON.stringify([{
      id: 'unsafe',
      title: 'outside.txt',
      format: 'txt',
      storedPath: outsidePath,
      addedAt: 1,
      lastReadAt: 1
    }]))

    await expect(new BookStore(userData).removeBook('unsafe'))
      .rejects.toThrow('书架数据损坏')
    await expect(readFile(outsidePath, 'utf8')).resolves.toBe('keep me')
  })
})
