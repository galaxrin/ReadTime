import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  importBook: (sourcePath?: string) => ipcRenderer.invoke('books:import', sourcePath),
  listBooks: () => ipcRenderer.invoke('books:list'),
  readBook: (id: string) => ipcRenderer.invoke('books:read', id),
  touchBook: (id: string) => ipcRenderer.invoke('books:touch', id),
  removeBook: (id: string) => ipcRenderer.invoke('books:remove', id),
  listFonts: () => ipcRenderer.invoke('fonts:list'),
  importFont: () => ipcRenderer.invoke('fonts:import'),
  updateBossKey: (shortcut: string) => ipcRenderer.invoke('shortcut:update', shortcut),
  setWindowAutoHidden: (hidden: boolean) => ipcRenderer.send('window:auto-hidden', hidden),
  onWindowReveal: (callback: () => void) => {
    ipcRenderer.on('window:reveal', callback)
    return () => ipcRenderer.removeListener('window:reveal', callback)
  },
  onWindowHidden: (callback: () => void) => {
    ipcRenderer.on('window:hidden', callback)
    return () => ipcRenderer.removeListener('window:hidden', callback)
  }
})
