import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { useReading } from '../../contexts/ReadingContext'
import { useSettings } from '../../contexts/SettingsContext'

jest.mock('../../contexts/ReadingContext', () => ({ useReading: jest.fn() }))
jest.mock('../../contexts/SettingsContext', () => ({ useSettings: jest.fn() }))
jest.mock('../ReadingView.css', () => ({}))

import { ReadingView } from '../ReadingView'

const emptyState = {
  chapters: [],
  currentChapter: 0,
  currentLine: 0,
  bookTitle: null,
  books: [],
  activeBook: null,
  isLoading: false,
  error: null
}

const loadedState = {
  ...emptyState,
  chapters: [{ title: '第一章', content: '正文', startIndex: 0 }],
  bookTitle: '测试书',
  activeBook: { id: 'b1', title: '测试书', format: 'txt', storedPath: '', addedAt: 1, lastReadAt: 1 }
}

function stub(state: unknown) {
  jest.mocked(useReading).mockReturnValue({
    state,
    setCurrentLine: jest.fn(),
    nextChapter: jest.fn(),
    prevChapter: jest.fn()
  } as never)
  jest.mocked(useSettings).mockReturnValue({
    state: { currentTheme: { fontSize: 17, lineHeight: 1.9, opacity: 1 }, hideBookTitle: false },
    updateFontSize: jest.fn()
  } as never)
}

afterEach(cleanup)

test('空状态切到有书时不改变 hooks 数量', () => {
  stub(emptyState)
  const view = render(
    <ReadingView autoScrolling={false} speed={60} onPause={jest.fn()} onManualScroll={jest.fn()} />
  )
  expect(view.container.querySelector('.no-file-message')).toBeTruthy()

  stub(loadedState)
  // 若 hook 顺序/数量在两条渲染路径间不一致，React 会在这里抛出 #310
  expect(() =>
    view.rerender(
      <ReadingView autoScrolling={false} speed={60} onPause={jest.fn()} onManualScroll={jest.fn()} />
    )
  ).not.toThrow()
  expect(view.container.querySelector('.reading-view')).toBeTruthy()
})
