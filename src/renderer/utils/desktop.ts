import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

// Rust 侧用 tauri::ipc::Response 直传字节，这里拿到 ArrayBuffer 直接建视图，不复制
const bytesOf = async (
  command: string,
  args: Record<string, unknown>
): Promise<Uint8Array<ArrayBuffer>> => {
  const data = await invoke<ArrayBuffer | Uint8Array<ArrayBuffer>>(command, args)
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

const track = (start: () => Promise<() => void>) => {
  let unlisten: (() => void) | null = null
  let cancelled = false
  void start().then(off => (cancelled ? off() : (unlisten = off)))
  return () => {
    cancelled = true
    unlisten?.()
  }
}

const subscribe = (event: string, callback: (payload: unknown) => void) =>
  track(() => listen(event, detail => callback(detail.payload)))

const pickFile = async (name: string, extensions: string[]) => {
  const picked = await open({ multiple: false, filters: [{ name, extensions }] })
  return typeof picked === 'string' ? picked : null
}

export const desktop: DesktopAPI = {
  importBook: async sourcePath => {
    const path = sourcePath ?? (await pickFile('电子书', ['txt', 'epub']))
    return path ? await invoke<BookRecord>('book_import', { sourcePath: path }) : null
  },
  listBooks: () => invoke<BookRecord[]>('book_list'),
  readBook: async id => ({
    book: await invoke<BookRecord>('book_meta', { id }),
    data: await bytesOf('book_data', { id })
  }),
  touchBook: id => invoke<void>('book_touch', { id }),
  removeBook: id => invoke<void>('book_remove', { id }),
  listFonts: () => invoke<string[]>('font_list'),
  readFont: name => bytesOf('font_read', { name }),
  importFont: async () => {
    const path = await pickFile('字体', ['otf', 'ttf', 'woff', 'woff2'])
    return path ? await invoke<string>('font_import', { sourcePath: path }) : null
  },
  updateBossKey: shortcut => invoke<boolean>('update_boss_key', { shortcut }),
  isAutostartEnabled: () => invoke<boolean>('autostart_enabled'),
  setAutostart: enabled => invoke<boolean>('set_autostart', { enabled }),
  windowContainsCursor: () => invoke<boolean>('window_contains_cursor'),
  setWindowSize: (width, height) => invoke<boolean>('set_window_size', { width, height }),
  setWindowSizeAnimated: (width, height) => invoke<boolean>('set_window_size_animated', { width, height }),
  onOpenSettings: callback => subscribe('open-settings', () => callback()),
  onWindowReveal: callback => subscribe('window:reveal', () => callback()),
  onWindowHidden: callback => subscribe('window:hidden', () => callback()),
  onFileDrop: callback =>
    track(() =>
      getCurrentWebview().onDragDropEvent(event => {
        if (event.payload.type === 'drop' && event.payload.paths[0]) callback(event.payload.paths[0])
      })
    )
}
