const handlers: Record<string, () => void> = {}
const popUpContextMenu = jest.fn()
const destroy = jest.fn()
const buildFromTemplate = jest.fn((template) => template)
const setTemplateImage = jest.fn()
const resize = jest.fn(() => ({ setTemplateImage }))

jest.mock('electron', () => ({
  Tray: jest.fn().mockImplementation(() => ({
    on: (event: string, handler: () => void) => { handlers[event] = handler },
    setToolTip: jest.fn(),
    popUpContextMenu,
    destroy
  })),
  Menu: { buildFromTemplate },
  nativeImage: {
    createFromPath: jest.fn(() => ({ resize }))
  }
}))

import { MenuBarManager } from '../tray'

beforeEach(() => {
  Object.keys(handlers).forEach(key => delete handlers[key])
  jest.clearAllMocks()
})

test('left click toggles the reading window', () => {
  const window = { toggle: jest.fn(), reveal: jest.fn(), isVisible: () => false, isAutoHidden: () => false }
  new MenuBarManager(window, jest.fn(), '/logo.png').create()

  handlers.click()

  expect(window.toggle).toHaveBeenCalledTimes(1)
  expect(resize).toHaveBeenCalledWith({ width: 16, height: 16 })
  expect(setTemplateImage).toHaveBeenCalledWith(true)
})

test('right click builds a menu for the current window state', () => {
  const window = { toggle: jest.fn(), reveal: jest.fn(), isVisible: () => true, isAutoHidden: () => false }
  new MenuBarManager(window, jest.fn(), '/logo.png').create()

  handlers['right-click']()

  expect(buildFromTemplate.mock.calls[0][0][0].label).toBe('隐藏阅读窗口')
  expect(popUpContextMenu).toHaveBeenCalled()
})

test('quit menu item invokes the application quit callback', () => {
  const quit = jest.fn()
  const window = { toggle: jest.fn(), reveal: jest.fn(), isVisible: () => false, isAutoHidden: () => false }
  new MenuBarManager(window, quit, '/logo.png').create()

  handlers['right-click']()
  buildFromTemplate.mock.calls[0][0][2].click()

  expect(quit).toHaveBeenCalledTimes(1)
})

test('offers recovery when visible window content is auto-hidden', () => {
  const window = {
    toggle: jest.fn(),
    reveal: jest.fn(),
    isVisible: () => true,
    isAutoHidden: () => true
  }
  new MenuBarManager(window, jest.fn(), '/logo.png').create()

  handlers['right-click']()
  const firstItem = buildFromTemplate.mock.calls[0][0][0]
  firstItem.click()

  expect(firstItem.label).toBe('显示阅读窗口')
  expect(window.reveal).toHaveBeenCalled()
  expect(window.toggle).not.toHaveBeenCalled()
})
