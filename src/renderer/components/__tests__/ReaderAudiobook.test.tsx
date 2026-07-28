import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useReading } from '../../contexts/ReadingContext'
import { useSettings } from '../../contexts/SettingsContext'

jest.mock('../../contexts/ReadingContext', () => ({
  useReading: jest.fn()
}))
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: jest.fn()
}))
jest.mock('../ReadingView.css', () => ({}))
jest.mock('../ControlBar.css', () => ({}))

import { ReadingView } from '../ReadingView'
import { ControlBar } from '../ControlBar'

const readingState = {
  chapters: [{ title: '第一章', content: '第一句。\n第二句！', startIndex: 0 }],
  currentChapter: 0,
  currentLine: 0,
  filePath: '测试.txt',
  books: [],
  activeBook: null,
  isLoading: false,
  error: null
}

beforeEach(() => {
  jest.mocked(useReading).mockReturnValue({
    state: readingState,
    dispatch: jest.fn(),
    importBook: jest.fn(),
    openBook: jest.fn(),
    removeBook: jest.fn(),
    nextChapter: jest.fn(),
    prevChapter: jest.fn(),
    setCurrentChapter: jest.fn(),
    setCurrentLine: jest.fn()
  })
  jest.mocked(useSettings).mockReturnValue({
    toggleSettings: jest.fn()
  } as unknown as ReturnType<typeof useSettings>)
})

test('renders every sentence piece and highlights only the active sentence', () => {
  const TestReadingView = ReadingView as unknown as React.ComponentType<Record<string, unknown>>
  const markup = renderToStaticMarkup(
    <TestReadingView
      autoScrolling={false}
      speed={60}
      activeSentence={2}
      onPause={jest.fn()}
      onManualScroll={jest.fn()}
    />
  )

  expect(markup.match(/data-sentence=/g)).toHaveLength(3)
  expect(markup).toContain('<span data-sentence="0">第一句。</span>')
  expect(markup).toContain('<span data-sentence="1">\n</span>')
  expect(markup).toContain('<span data-sentence="2" class="spoken-sentence">第二句！</span>')
})

test('exposes an accessible audiobook toggle next to reader controls', () => {
  const TestControlBar = ControlBar as unknown as React.ComponentType<Record<string, unknown>>
  const markup = renderToStaticMarkup(
    <TestControlBar
      visible
      autoScrolling={false}
      audiobookPlaying
      onToggleAutoScroll={jest.fn()}
      onToggleAudiobook={jest.fn()}
      onStopAudiobook={jest.fn()}
      onPause={jest.fn()}
      onOverlayChange={jest.fn()}
    />
  )

  expect(markup).toContain('class="control-button audiobook-button active"')
  expect(markup).toContain('title="暂停听书"')
  expect(markup).toContain('aria-label="暂停听书"')
  expect(markup).toContain('>Ⅱ</button>')
})
