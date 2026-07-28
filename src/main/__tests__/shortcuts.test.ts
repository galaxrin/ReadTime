const register = jest.fn()
const unregister = jest.fn()

jest.mock('electron', () => ({
  globalShortcut: { register, unregister }
}))

import { ShortcutManager } from '../shortcuts'

beforeEach(() => jest.clearAllMocks())

test('keeps the old shortcut when replacement registration fails', () => {
  register.mockReturnValueOnce(true).mockReturnValueOnce(false)
  const manager = new ShortcutManager({ toggle: jest.fn() } as any)
  manager.registerBossKey('CommandOrControl+Shift+H')

  expect(manager.updateBossKey('CommandOrControl+Shift+X')).toBe(false)
  expect(unregister).not.toHaveBeenCalled()
})

test('unregisters the old shortcut after replacement succeeds', () => {
  register.mockReturnValue(true)
  const manager = new ShortcutManager({ toggle: jest.fn() } as any)
  manager.registerBossKey('CommandOrControl+Shift+H')

  expect(manager.updateBossKey('CommandOrControl+Shift+X')).toBe(true)
  expect(unregister).toHaveBeenCalledWith('CommandOrControl+Shift+H')
})
