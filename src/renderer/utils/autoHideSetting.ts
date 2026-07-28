const KEY = 'readtime-auto-hide'

export const loadAutoHide = (storage: Storage = localStorage) =>
  storage.getItem(KEY) === 'true'

export const saveAutoHide = (enabled: boolean, storage: Storage = localStorage) =>
  storage.setItem(KEY, String(enabled))
