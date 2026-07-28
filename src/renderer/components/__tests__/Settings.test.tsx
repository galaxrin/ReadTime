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
  AUDIOBOOK_RATES: [0.75, 1, 1.25, 1.5, 2],
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

test('exposes selected theme and audiobook rate through aria-pressed', () => {
  jest.mocked(useSettings).mockReturnValue({
    state: {
      currentTheme: defaultThemes[0],
      themes: defaultThemes,
      frequentThemes: defaultThemes.slice(0, 4),
      showSettings: true,
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

  const markup = renderToStaticMarkup(<Settings />)

  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2)
  expect(markup.match(/aria-pressed="false"/g)).toHaveLength(7)
  expect(markup).toContain('<button class="active" aria-pressed="true">1×</button>')
  expect(markup).toContain('<button class="" aria-pressed="false">2×</button>')
  expect(markup).toContain('type="checkbox"')
  expect(markup).toContain('听书语速')
  expect(markup).toContain('>1×</button>')
  expect(markup).toContain('>2×</button>')
  expect(markup).toContain('ReadTime by 脏咖喱 · Galaxrin')
})
