import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useReading } from '../../contexts/ReadingContext'
import { useSettings } from '../../contexts/SettingsContext'
import { defaultThemes } from '../../utils/themeManager'

jest.mock('../../contexts/ReadingContext', () => ({
  useReading: jest.fn()
}))
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: jest.fn()
}))
jest.mock('../ReadingView.css', () => ({}))
jest.mock('../ControlBar.css', () => ({}))
jest.mock('../Settings', () => ({ Settings: () => null }))

import { ReadingView } from '../ReadingView'
import { ControlBar, removeBookWithPlaybackStop } from '../ControlBar'
import { toggleAudiobookPlayback, toggleAutoScrollPlayback } from '../../App'

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
    state: {
      currentTheme: defaultThemes[0],
      themes: defaultThemes,
      frequentThemes: defaultThemes.slice(0, 4),
      showSettings: false,
      autoScrollSpeed: 60,
      audiobookRate: 1,
      readingFont: 'serif',
      customFonts: [],
      autoHideOnMouseLeave: false
    },
    setTheme: jest.fn(),
    updateFontSize: jest.fn(),
    updateLineHeight: jest.fn(),
    updateOpacity: jest.fn(),
    toggleSettings: jest.fn(),
    updateAutoScrollSpeed: jest.fn(),
    updateAudiobookRate: jest.fn(),
    updateReadingFont: jest.fn(),
    importFont: jest.fn(),
    updateAutoHideOnMouseLeave: jest.fn()
  })
})

test('renders every sentence piece and highlights only the active sentence', () => {
  const markup = renderToStaticMarkup(
    <ReadingView
      autoScrolling={false}
      speed={60}
      activeSentence={2}
      onPause={jest.fn()}
      onManualScroll={jest.fn()}
      onStopAudiobook={jest.fn()}
    />
  )

  expect(markup.match(/data-sentence=/g)).toHaveLength(3)
  expect(markup).toContain('<span data-sentence="0">第一句。</span>')
  expect(markup).toContain('<span data-sentence="1">\n</span>')
  expect(markup).toContain('<span data-sentence="2" class="spoken-sentence">第二句！</span>')
})

test('exposes an accessible audiobook toggle next to reader controls', () => {
  const markup = renderToStaticMarkup(
    <ControlBar
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

test('stops only the active book before removal', () => {
  const calls: string[] = []
  const stop = () => calls.push('stop')
  const remove = (id: string) => calls.push(`remove:${id}`)

  removeBookWithPlaybackStop('active', 'active', stop, remove)
  expect(calls).toEqual(['stop', 'remove:active'])

  calls.length = 0
  removeBookWithPlaybackStop('other', 'active', stop, remove)
  expect(calls).toEqual(['remove:other'])
})

test('stops speech before starting auto-scroll', () => {
  const calls: string[] = []

  toggleAutoScrollPlayback(
    false,
    () => calls.push('stop-speech'),
    () => calls.push('hide-controls'),
    value => calls.push(`auto-scroll:${value}`)
  )

  expect(calls).toEqual(['stop-speech', 'hide-controls', 'auto-scroll:true'])
})

test('stops auto-scroll before starting speech at the visible sentence', () => {
  const calls: string[] = []

  toggleAudiobookPlayback(
    false,
    null,
    () => {
      calls.push('visible')
      return 3
    },
    () => calls.push('pause-auto-scroll'),
    sentence => calls.push(`toggle:${sentence}`)
  )

  expect(calls).toEqual(['pause-auto-scroll', 'visible', 'toggle:3'])
})
