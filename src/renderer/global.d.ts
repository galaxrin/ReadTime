declare module "*.svg?raw" {
  const content: string
  export default content
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

interface DesktopAPI {
  importBook: (sourcePath?: string) => Promise<BookRecord | null>
  listBooks: () => Promise<BookRecord[]>
  readBook: (id: string) => Promise<StoredBookData>
  touchBook: (id: string) => Promise<void>
  removeBook: (id: string) => Promise<void>
  listFonts: () => Promise<string[]>
  readFont: (name: string) => Promise<Uint8Array>
  importFont: () => Promise<string | null>
  updateBossKey: (shortcut: string) => Promise<boolean>
  setWindowSize: (width: number, height: number) => Promise<boolean>
  setWindowSizeAnimated: (width: number, height: number) => Promise<boolean>
  isAutostartEnabled: () => Promise<boolean>
  setAutostart: (enabled: boolean) => Promise<boolean>
  windowContainsCursor: () => Promise<boolean>
  onOpenSettings: (callback: () => void) => () => void
  onWindowReveal: (callback: () => void) => () => void
  onWindowHidden: (callback: () => void) => () => void
  onFileDrop: (callback: (path: string) => void) => () => void
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
  data: Uint8Array<ArrayBuffer>
}

interface Window {
  desktop: DesktopAPI
}
