const setContentProtection = jest.fn()
const send = jest.fn()
const show = jest.fn()
const focus = jest.fn()
const getCursorScreenPoint = jest.fn()

const browserWindow = {
  loadFile: jest.fn(),
  on: jest.fn(),
  setContentProtection,
  webContents: { send },
  isVisible: jest.fn(() => true),
  getPosition: jest.fn(() => [10, 20]),
  getBounds: jest.fn(() => ({ x: 10, y: 20, width: 400, height: 600 })),
  setPosition: jest.fn(),
  hide: jest.fn(),
  show,
  focus
}

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(() => browserWindow),
  screen: {
    getPrimaryDisplay: () => ({ workAreaSize: { width: 1440, height: 900 } }),
    getCursorScreenPoint
  }
}))

import { BrowserWindow } from 'electron'
import { TransparentWindow } from '../window'

beforeEach(() => jest.clearAllMocks())

test('protects window content from screen capture when created', () => {
  new TransparentWindow().create()

  expect(setContentProtection).toHaveBeenCalledWith(true)
})

test('keeps the window wide enough for compact controls', () => {
  new TransparentWindow().create()

  expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ minWidth: 300 }))
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

test('treats the drag region and resize border as inside the window', () => {
  const window = new TransparentWindow()
  window.create()

  getCursorScreenPoint.mockReturnValueOnce({ x: 210, y: 20 })
  expect(window.containsCursor()).toBe(true)

  getCursorScreenPoint.mockReturnValueOnce({ x: 410, y: 320 })
  expect(window.containsCursor()).toBe(true)

  getCursorScreenPoint.mockReturnValueOnce({ x: 419, y: 320 })
  expect(window.containsCursor()).toBe(false)
})
