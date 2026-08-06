import { globalShortcut } from 'electron'
import { TransparentWindow } from './window'

export class ShortcutManager {
  private window: TransparentWindow
  private currentShortcut: string | null = null

  constructor(window: TransparentWindow) {
    this.window = window
  }

  registerBossKey(shortcut: string = 'CommandOrControl+Shift+H') {
    if (this.currentShortcut === shortcut) return true

    const success = globalShortcut.register(shortcut, () => this.window.toggle())

    if (success) {
      this.currentShortcut = shortcut
    } else {
      console.error(`Failed to register boss key: ${shortcut}`)
    }
    return success
  }

  updateBossKey(shortcut: string) {
    if (shortcut === this.currentShortcut) return true
    const previous = this.currentShortcut
    if (!globalShortcut.register(shortcut, () => this.window.toggle())) return false
    if (previous) globalShortcut.unregister(previous)
    this.currentShortcut = shortcut
    return true
  }

  unregisterAll() {
    if (this.currentShortcut) globalShortcut.unregister(this.currentShortcut)
    this.currentShortcut = null
  }
}
