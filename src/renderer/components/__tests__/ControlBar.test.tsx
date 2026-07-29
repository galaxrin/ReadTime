import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'fs'
import path from 'path'
import { useReading } from '../../contexts/ReadingContext'
import { useSettings } from '../../contexts/SettingsContext'
import { defaultThemes } from '../../utils/themeManager'

jest.mock('../../contexts/ReadingContext', () => ({
  useReading: jest.fn()
}))
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: jest.fn()
}))
jest.mock('../ControlBar.css', () => ({}))

import { ControlBar } from '../ControlBar'

beforeEach(() => {
  jest.mocked(useReading).mockReturnValue({
    state: {
      chapters: [{ title: '第一章', content: '正文', startIndex: 0 }],
      currentChapter: 0,
      currentLine: 0,
      filePath: '测试.txt',
      books: [],
      activeBook: null,
      isLoading: false,
      error: null
    },
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
    updateReadingFont: jest.fn(),
    importFont: jest.fn(),
    updateAutoHideOnMouseLeave: jest.fn()
  })
})

test('keeps the auto-scroll button available as the compact control', () => {
  const markup = renderToStaticMarkup(
    <ControlBar
      visible
      autoScrolling={false}
      onToggleAutoScroll={jest.fn()}
      onPause={jest.fn()}
      onOverlayChange={jest.fn()}
    />
  )

  expect(markup).toContain('class="control-button auto-scroll-button ')
  expect(markup).not.toContain('external-controls-button')
})

test('places only the auto-scroll control at bottom left below 380 pixels', () => {
  const css = fs.readFileSync(path.join(__dirname, '../ControlBar.css'), 'utf8')

  expect(css).toContain('@media (max-width: 379px)')
  expect(css).toMatch(/right: auto;\s*left: 10px;/)
  expect(css).toMatch(/\.wide-control-button,\s*\.progress-bar,\s*\.progress-info \{ display: none \}/)
})
