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
      bookTitle: '测试.txt',
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
      autoHideOnMouseLeave: false,
      hideBookTitle: false,
    },
    setTheme: jest.fn(),
    updateFontSize: jest.fn(),
    updateLineHeight: jest.fn(),
    updateOpacity: jest.fn(),
    toggleSettings: jest.fn(),
    updateAutoScrollSpeed: jest.fn(),
    updateReadingFont: jest.fn(),
    importFont: jest.fn(),
    updateAutoHideOnMouseLeave: jest.fn(),
    updateHideBookTitle: jest.fn()
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
      onKeepAlive={jest.fn()}
    />
  )

  expect(markup).toContain('class="control-button auto-scroll-button ')
  expect(markup).not.toContain('external-controls-button')
})

test('窄窗口不再收缩控制栏，改由浮动播放按钮接管', () => {
  const controlCss = fs.readFileSync(path.join(__dirname, '../ControlBar.css'), 'utf8')
  const viewCss = fs.readFileSync(path.join(__dirname, '../ReadingView.css'), 'utf8')

  // 控制栏里不该再保留按宽度收缩的规则
  expect(controlCss).not.toContain('@media (max-width: 379px)')

  // 窄窗口隐藏控制栏，浮动播放按钮固定在左下角
  expect(viewCss).toMatch(/\.app-shell\.narrow-mode \.control-bar[^}]*display: none/)
  expect(viewCss).toMatch(/\.floating-controls[^}]*left: 10px/)
  expect(viewCss).toMatch(/\.floating-controls[^}]*bottom: 10px/)
  expect(viewCss).toMatch(/\.floating-controls\.expanded[^}]*width/)
  // 胶囊要比内部按钮高，四周内边距才对称
  expect(viewCss).toMatch(/\.floating-controls[^}]*height: 34px/)
  expect(viewCss).toMatch(/\.floating-controls[^}]*padding: 3px/)
  // 单行模式已移除
  expect(viewCss).not.toContain('mini-mode')
})