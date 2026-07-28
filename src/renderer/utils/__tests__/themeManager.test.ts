import { defaultThemes, ThemeManager } from '../themeManager'

const values = new Map<string, string>()
const styles = new Map<string, string>()

beforeEach(() => {
  values.clear()
  styles.clear()
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }
  })
  Object.defineProperty(global, 'document', {
    configurable: true,
    value: {
      documentElement: {
        dataset: {},
        style: { setProperty: (key: string, value: string) => styles.set(key, value) }
      }
    }
  })
})

test('provides the approved reading themes', () => {
  expect(defaultThemes.map(theme => theme.name)).toEqual([
    '纸张阅读',
    '静谧深色',
    'macOS 玻璃',
    '透明白字',
    '清爽白昼',
    '青叶护眼',
    '雾灰专注',
    '晨雾蓝',
    '纯黑夜读',
    '深海蓝',
    '琥珀夜灯',
    '墨绿书房'
  ])
})

test('disables text shadows for every theme', () => {
  expect(defaultThemes.every(theme => theme.textShadow === 'none')).toBe(true)
})

test('restores the selected theme and typography', () => {
  const manager = new ThemeManager()
  manager.setTheme(defaultThemes[2])
  manager.updateFontSize(20)

  expect(new ThemeManager().getTheme()).toMatchObject({
    name: 'macOS 玻璃',
    fontSize: 20
  })
})

test('falls back to the default theme when saved data is invalid', () => {
  values.set('readtime-theme', '{broken')

  expect(new ThemeManager().getTheme().name).toBe('纸张阅读')
})

test('applies a background-free transparent theme', () => {
  new ThemeManager().setTheme(defaultThemes[3])

  expect(styles.get('--reader-background')).toBe('transparent')
})

test('keeps transparent reading clear while controls are opaque', () => {
  new ThemeManager().setTheme(defaultThemes[3])

  expect(styles.get('--reader-background')).toBe('transparent')
  expect(styles.get('--surface-background')).toBe('#181b1f')
  expect(styles.get('--control-background')).toBe('#181b1f')
})

test('shows the original four themes before usage is recorded', () => {
  expect(new ThemeManager().getFrequentThemes().map(theme => theme.id)).toEqual([
    'paper', 'night', 'glass', 'transparent'
  ])
})

test('ranks themes by selection count and then recency', () => {
  const now = jest.spyOn(Date, 'now')
  const manager = new ThemeManager()

  now.mockReturnValueOnce(100)
  manager.setTheme(defaultThemes[5])
  now.mockReturnValueOnce(200)
  manager.setTheme(defaultThemes[4])

  expect(manager.getFrequentThemes().slice(0, 2).map(theme => theme.id)).toEqual([
    'daylight', 'sage'
  ])
  now.mockRestore()
})

test('ignores invalid usage records and keeps valid siblings', () => {
  values.set('readtime-theme-usage', JSON.stringify({
    sage: { count: 2, lastUsedAt: 30 },
    night: null,
    unknown: { count: 9, lastUsedAt: 40 }
  }))

  expect(new ThemeManager().getFrequentThemes().map(theme => theme.id)).toEqual([
    'sage', 'paper', 'night', 'glass'
  ])
})

test('restoring a saved theme does not record a selection', () => {
  values.set('readtime-theme', JSON.stringify(defaultThemes[7]))

  const manager = new ThemeManager()

  expect(manager.getTheme().id).toBe('blue-mist')
  expect(values.get('readtime-theme-usage')).toBeUndefined()
})
