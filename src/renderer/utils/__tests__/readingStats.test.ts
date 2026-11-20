import { ReadingStats, formatMinutes } from '../readingStats'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value)
  } as unknown as Storage
}

const dayKey = (offset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

test('累加今天的阅读秒数', () => {
  const stats = new ReadingStats(memoryStorage())
  stats.addSeconds(60)
  stats.addSeconds(30)
  expect(stats.snapshot().todaySeconds).toBe(90)
})

test('忽略非法或非正的秒数', () => {
  const stats = new ReadingStats(memoryStorage())
  stats.addSeconds(0)
  stats.addSeconds(-30)
  stats.addSeconds(Number.NaN)
  expect(stats.snapshot().totalSeconds).toBe(0)
})

test('统计本周与累计，并算出连续天数', () => {
  const storage = memoryStorage()
  storage.setItem(
    'readtime-stats',
    JSON.stringify({ [dayKey(0)]: 120, [dayKey(1)]: 300, [dayKey(2)]: 60, [dayKey(10)]: 600 })
  )
  const snapshot = new ReadingStats(storage).snapshot()

  expect(snapshot.totalSeconds).toBe(1080)
  expect(snapshot.weekSeconds).toBe(480)
  expect(snapshot.streakDays).toBe(3)
})

test('今天没读时连续天数为 0', () => {
  const storage = memoryStorage()
  storage.setItem('readtime-stats', JSON.stringify({ [dayKey(1)]: 300 }))
  expect(new ReadingStats(storage).snapshot().streakDays).toBe(0)
})

test('没有存储时也不崩', () => {
  const stats = new ReadingStats(null)
  stats.addSeconds(60)
  expect(stats.snapshot().totalSeconds).toBe(0)
})

test('时长文案按小时与分钟切换', () => {
  expect(formatMinutes(90)).toBe('1 分钟')
  expect(formatMinutes(600)).toBe('10 分钟')
  expect(formatMinutes(3600)).toBe('1 小时')
  expect(formatMinutes(5400)).toBe('1 小时 30 分钟')
})
