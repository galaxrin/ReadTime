import fs from 'fs'
import path from 'path'
import React from 'react'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { useReading } from '../../contexts/ReadingContext'
import { useSettings } from '../../contexts/SettingsContext'

jest.mock('../../contexts/ReadingContext', () => ({
  useReading: jest.fn()
}))
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: jest.fn()
}))
jest.mock('../ControlBar.css', () => ({}))

import { ControlBar } from '../ControlBar'
import { BookmarkManager } from '../../utils/bookmarkManager'

const BOOK_ID = 'book-1'

const baseReading = {
  state: {
    books: [],
    activeBook: { id: BOOK_ID, title: '书签验证书', format: 'txt', storedPath: '', addedAt: 1, lastReadAt: 1 },
    chapters: [
      { title: '第一章 起风', content: '正文', startIndex: 0 },
      { title: '第二章 落雨', content: '正文', startIndex: 1 }
    ],
    currentChapter: 0,
    currentLine: 7,
    bookTitle: '书签验证书',
    isLoading: false,
    error: null
  },
  importBook: jest.fn(),
  openBook: jest.fn(),
  removeBook: jest.fn(),
  nextChapter: jest.fn(),
  prevChapter: jest.fn(),
  setCurrentChapter: jest.fn(),
  setCurrentLine: jest.fn()
}

function renderBar() {
  jest.mocked(useReading).mockReturnValue(baseReading as never)
  jest.mocked(useSettings).mockReturnValue({ toggleSettings: jest.fn() } as never)
  return render(
    <ControlBar
      visible
      autoScrolling={false}
      onToggleAutoScroll={jest.fn()}
      onPause={jest.fn()}
      onOverlayChange={jest.fn()}
      onKeepAlive={jest.fn()}
    />
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})

afterEach(cleanup)

test('目录弹层默认展示章节，可切到书签视图', () => {
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  expect(screen.getByText('目录 · 2 章')).toBeTruthy()

  fireEvent.click(screen.getByText(/书签 · 0/))
  expect(screen.getByText('＋ 收藏当前位置')).toBeTruthy()
  expect(screen.getByText('还没有书签')).toBeTruthy()
})

test('收藏当前位置后写进书签并渲染出来', () => {
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  fireEvent.click(screen.getByText(/书签 · 0/))
  fireEvent.click(screen.getByText('＋ 收藏当前位置'))

  const saved = JSON.parse(localStorage.getItem('readtime-bookmarks') || '{}')
  expect(saved[BOOK_ID]).toHaveLength(1)
  expect(saved[BOOK_ID][0]).toMatchObject({ chapter: 0, line: 7, title: '第一章 起风' })
  expect(screen.getByText('书签 · 1')).toBeTruthy()
  expect(screen.getByText('第一章 起风')).toBeTruthy()
})

test('点书签跳到对应章节与行', () => {
  const manager = new BookmarkManager(localStorage)
  manager.add(BOOK_ID, 1, 33, '第二章 落雨')
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  fireEvent.click(screen.getByText(/书签 · 1/))
  fireEvent.click(screen.getByText('第二章 落雨'))

  expect(baseReading.setCurrentChapter).toHaveBeenCalledWith(1)
  expect(baseReading.setCurrentLine).toHaveBeenCalledWith(33)
})

test('删除书签后列表与存储同步', () => {
  const manager = new BookmarkManager(localStorage)
  const bookmark = manager.add(BOOK_ID, 0, 3, '第一章 起风')
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  fireEvent.click(screen.getByText(/书签 · 1/))
  fireEvent.click(screen.getByLabelText('删除书签 第一章 起风'))

  expect(new BookmarkManager(localStorage).list(BOOK_ID)).toHaveLength(0)
  expect(bookmark.id).toBeTruthy()
  expect(screen.getByText(/书签 · 0/)).toBeTruthy()
})

test('鼠标停在控制栏上会持续请求续期', () => {
  const onKeepAlive = jest.fn()
  jest.mocked(useReading).mockReturnValue(baseReading as never)
  jest.mocked(useSettings).mockReturnValue({ toggleSettings: jest.fn() } as never)
  const { container } = render(
    <ControlBar
      visible
      autoScrolling={false}
      onToggleAutoScroll={jest.fn()}
      onPause={jest.fn()}
      onOverlayChange={jest.fn()}
      onKeepAlive={onKeepAlive}
    />
  )

  const bar = container.querySelector('.control-bar') as HTMLElement
  fireEvent.mouseEnter(bar)
  fireEvent.mouseMove(bar)
  expect(onKeepAlive).toHaveBeenCalledTimes(2)
})

test('点弹层以外的空白处即返回', () => {
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  expect(screen.getByText(/目录 · 2 章/)).toBeTruthy()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByText(/目录 · 2 章/)).toBeNull()

  fireEvent.click(screen.getByLabelText('书架'))
  expect(screen.getByText('＋ 导入书籍')).toBeTruthy()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByText('＋ 导入书籍')).toBeNull()
})

test('点弹层内部的空白不会关闭', () => {
  renderBar()

  fireEvent.click(screen.getByLabelText('目录'))
  const popover = document.querySelector('.toc-popover') as HTMLElement
  fireEvent.pointerDown(popover)
  expect(screen.getByText(/目录 · 2 章/)).toBeTruthy()
})

test('弹层列表不显示滚动条', () => {
  const css = fs.readFileSync(path.join(__dirname, '../ControlBar.css'), 'utf8')
  expect(css).toMatch(/\.toc-list[^}]*scrollbar-width: none/)
  expect(css).toContain('.toc-list::-webkit-scrollbar { display: none }')
})
