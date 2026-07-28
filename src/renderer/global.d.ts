declare module '*.css' {
  const content: Record<string, string>
  export default content
}

interface ElectronAPI {
  importBook: (sourcePath?: string) => Promise<BookRecord | null>
  listBooks: () => Promise<BookRecord[]>
  readBook: (id: string) => Promise<StoredBookData>
  touchBook: (id: string) => Promise<void>
  removeBook: (id: string) => Promise<void>
  listFonts: () => Promise<Array<{ name: string; data: Uint8Array }>>
  importFont: () => Promise<string | null>
  updateBossKey: (shortcut: string) => Promise<boolean>
  setWindowAutoHidden: (hidden: boolean) => void
  onWindowReveal: (callback: () => void) => () => void
  onWindowHidden: (callback: () => void) => () => void
}

interface BookRecord {
  id: string
  title: string
  format: 'txt' | 'epub'
  storedPath: string
  addedAt: number
  lastReadAt: number
}

interface StoredBookData {
  book: BookRecord
  data: Uint8Array
}

interface Window {
  electronAPI: ElectronAPI
}
