import { BrowserWindow, screen } from 'electron'
import path from 'path'

export class TransparentWindow {
  private window: BrowserWindow | null = null
  private lastPosition: [number, number] | null = null
  private isQuitting = false
  private autoHidden = false

  create(show = true) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    this.window = new BrowserWindow({
      width: 400,
      height: 600,
      x: width - 420,
      y: 20,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: true,
      show,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    this.window.setContentProtection(true)

    const indexPath = path.join(__dirname, '../renderer/index.html')
    console.log('Loading:', indexPath)
    this.window.loadFile(indexPath)

    this.window.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.hide()
      }
    })

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  hide() {
    if (!this.window || !this.window.isVisible()) return

    const pos = this.window.getPosition()
    this.lastPosition = [pos[0], pos[1]]
    this.window.webContents.send('window:hidden')
    this.window.hide()
  }

  show() {
    if (!this.window || this.window.isVisible()) return

    if (this.lastPosition) {
      this.window.setPosition(this.lastPosition[0], this.lastPosition[1])
    }
    this.window.show()
    this.window.focus()
  }

  toggle() {
    this.isVisible() ? this.hide() : this.show()
  }

  setAutoHidden(hidden: boolean) {
    this.autoHidden = hidden
  }

  isAutoHidden() {
    return this.autoHidden
  }

  reveal() {
    if (!this.window) return
    this.autoHidden = false
    this.window.webContents.send('window:reveal')
    this.window.show()
    this.window.focus()
  }

  isVisible() {
    return this.window?.isVisible() ?? false
  }

  prepareToQuit() {
    this.isQuitting = true
  }

  getWindow() {
    return this.window
  }
}
