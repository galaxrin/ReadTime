import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { defaultThemes } from '../../utils/themeManager'
import { useSettings } from '../../contexts/SettingsContext'

jest.mock('../../contexts/SettingsContext', () => ({
  AUTO_SCROLL_SPEEDS: [
    { label: '低速', value: 30 },
    { label: '中速', value: 60 },
    { label: '高速', value: 100 }
  ],
  useSettings: jest.fn()
}))
jest.mock('../Settings.css', () => ({}))

import { Settings } from '../Settings'

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: { getItem: jest.fn(() => null) }
  })
})

test('exposes the selected theme through aria-pressed', () => {
  jest.mocked(useSettings).mockReturnValue({
    state: {
      currentTheme: defaultThemes[0],
      themes: defaultThemes,
      frequentThemes: defaultThemes.slice(0, 4),
      showSettings: true,
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

  const markup = renderToStaticMarkup(<Settings />)

  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(markup.match(/aria-pressed="false"/g)).toHaveLength(3)
  expect(markup).toContain('type="checkbox"')
  expect(markup).toContain('ReadTime by 脏咖喱 · Galaxrin')
})
