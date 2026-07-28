import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SettingsProvider, useSettings } from '../SettingsContext'

const getItem = jest.fn(() => null)
const setItem = jest.fn()
let updateAudiobookRate: (rate: number) => void

function RateControl() {
  updateAudiobookRate = useSettings().updateAudiobookRate
  return null
}

beforeEach(() => {
  getItem.mockClear()
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

test('persists an allowed audiobook rate and ignores an invalid one', () => {
  renderToStaticMarkup(<SettingsProvider><RateControl /></SettingsProvider>)

  updateAudiobookRate(1.25)
  updateAudiobookRate(3)

  expect(setItem).toHaveBeenCalledTimes(1)
  expect(setItem).toHaveBeenCalledWith('readtime-audiobook-rate', '1.25')
})
