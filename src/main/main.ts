import { app, dialog, ipcMain } from 'electron'
import { copyFile, mkdir, readFile, readdir } from 'fs/promises'
import path from 'path'
import { TransparentWindow } from './window'
import { ShortcutManager } from './shortcuts'
import { MenuBarManager } from './tray'
import { BookStore } from './bookStore'

const transparentWindow = new TransparentWindow()
let shortcutManager: ShortcutManager
let menuBarManager: MenuBarManager | null = null

app.whenReady().then(() => {
  const isMac = process.platform === 'darwin'
  const bookStore = new BookStore(app.getPath('userData'))
  const fontsDir = path.join(app.getPath('userData'), 'fonts')
  if (isMac) {
    app.dock.hide()
  }

  transparentWindow.create(!isMac)
  shortcutManager = new ShortcutManager(transparentWindow)
  shortcutManager.registerBossKey()
  ipcMain.handle('shortcut:update', (_event, shortcut: string) => shortcutManager.updateBossKey(shortcut))
  ipcMain.on('window:auto-hidden', (_event, hidden: boolean) => transparentWindow.setAutoHidden(hidden))
  ipcMain.handle('books:import', async (_event, sourcePath?: string) => {
    const selectedPath = sourcePath || (await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '电子书', extensions: ['txt', 'epub'] }]
    })).filePaths[0]
    return selectedPath ? bookStore.importBook(selectedPath) : null
  })
  ipcMain.handle('books:list', () => bookStore.listBooks())
  ipcMain.handle('books:read', (_event, id: string) => bookStore.readBook(id))
  ipcMain.handle('books:touch', (_event, id: string) => bookStore.touchBook(id))
  ipcMain.handle('books:remove', (_event, id: string) => bookStore.removeBook(id))
  ipcMain.handle('fonts:list', async () => {
    await mkdir(fontsDir, { recursive: true })
    const files = (await readdir(fontsDir)).filter(file => /\.(otf|ttf|woff2?)$/i.test(file))
    return Promise.all(files.map(async file => ({
      name: path.parse(file).name,
      data: await readFile(path.join(fontsDir, file))
    })))
  })
  ipcMain.handle('fonts:import', async () => {
    const selectedPath = (await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '字体', extensions: ['otf', 'ttf', 'woff', 'woff2'] }]
    })).filePaths[0]
    if (!selectedPath) return null
    await mkdir(fontsDir, { recursive: true })
    await copyFile(selectedPath, path.join(fontsDir, path.basename(selectedPath)))
    return path.parse(selectedPath).name
  })

  if (isMac) {
    menuBarManager = new MenuBarManager(
      transparentWindow,
      () => app.quit(),
      path.join(app.getAppPath(), 'assets/tray/trayTemplate.png')
    )
    menuBarManager.create()
  }
})

app.on('before-quit', () => {
  transparentWindow.prepareToQuit()
})

app.on('will-quit', () => {
  shortcutManager?.unregisterAll()
  menuBarManager?.destroy()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!transparentWindow.getWindow()) {
    transparentWindow.create(process.platform !== 'darwin')
  }
})
