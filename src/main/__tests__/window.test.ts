const setContentProtection = jest.fn()
const send = jest.fn()
const show = jest.fn()
const focus = jest.fn()

const browserWindow = {
  loadFile: jest.fn(),
  on: jest.fn(),
  setContentProtection,
  webContents: { send },
  isVisible: jest.fn(() => true),
  getPosition: jest.fn(() => [10, 20]),
  setPosition: jest.fn(),
  hide: jest.fn(),
  show,
  focus
}

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(() => browserWindow),
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1440, height: 900 } }) }
}))

import { TransparentWindow } from '../window'

beforeEach(() => jest.clearAllMocks())

test('protects window content from screen capture when created', () => {
  new TransparentWindow().create()

  expect(setContentProtection).toHaveBeenCalledWith(true)
})

test('reveals auto-hidden content and focuses its window', () => {
  const window = new TransparentWindow()
  window.create()
  window.setAutoHidden(true)

  window.reveal()

  expect(send).toHaveBeenCalledWith('window:reveal')
  expect(show).toHaveBeenCalled()
  expect(focus).toHaveBeenCalled()
  expect(window.isAutoHidden()).toBe(false)
})
