import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SettingsProvider, useSettings } from '../SettingsContext'

const getItem = jest.fn<string | null, [string]>(() => null)
const setItem = jest.fn()
let updateAudiobookRate: (rate: number) => void
let audiobookRate: number

function RateControl() {
  const settings = useSettings()
  audiobookRate = settings.state.audiobookRate
  updateAudiobookRate = settings.updateAudiobookRate
  return null
}

beforeEach(() => {
  getItem.mockReset()
  getItem.mockReturnValue(null)
  setItem.mockClear()
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: { getItem, setItem }
  })
  Object.defineProperty(global, 'document', {
    configurable: true,
    value: {
      documentElement: { dataset: {}, style: { setProperty: jest.fn() } }
    }
  })
})

test('initializes the audiobook rate from valid storage or defaults to one', () => {
  getItem.mockImplementation(key => key === 'readtime-audiobook-rate' ? '1.25' : null)
  renderToStaticMarkup(<SettingsProvider><RateControl /></SettingsProvider>)
  expect(audiobookRate).toBe(1.25)

  getItem.mockImplementation(key => key === 'readtime-audiobook-rate' ? '1.75' : null)
  renderToStaticMarkup(<SettingsProvider><RateControl /></SettingsProvider>)
  expect(audiobookRate).toBe(1)

  getItem.mockReturnValue(null)
  renderToStaticMarkup(<SettingsProvider><RateControl /></SettingsProvider>)
  expect(audiobookRate).toBe(1)
})

test('persists an allowed audiobook rate and ignores an invalid one', () => {
  renderToStaticMarkup(<SettingsProvider><RateControl /></SettingsProvider>)

  updateAudiobookRate(1.25)
  updateAudiobookRate(3)

  expect(setItem).toHaveBeenCalledTimes(1)
  expect(setItem).toHaveBeenCalledWith('readtime-audiobook-rate', '1.25')
})
