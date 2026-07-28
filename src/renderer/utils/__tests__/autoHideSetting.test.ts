import { loadAutoHide, saveAutoHide } from '../autoHideSetting'

function storageWith(value?: string): Storage {
  const values = new Map<string, string>()
  if (value !== undefined) values.set('readtime-auto-hide', value)
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, next) => values.set(key, next)
  }
}

test('auto-hide defaults to disabled unless explicitly enabled', () => {
  expect(loadAutoHide(storageWith())).toBe(false)
  expect(loadAutoHide(storageWith('broken'))).toBe(false)
  expect(loadAutoHide(storageWith('true'))).toBe(true)
})

test('auto-hide preference persists as a boolean string', () => {
  const storage = storageWith()

  saveAutoHide(true, storage)
  expect(storage.getItem('readtime-auto-hide')).toBe('true')

  saveAutoHide(false, storage)
  expect(storage.getItem('readtime-auto-hide')).toBe('false')
})
