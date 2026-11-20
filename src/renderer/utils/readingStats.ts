export interface StatsSnapshot {
  todaySeconds: number
  weekSeconds: number
  totalSeconds: number
  streakDays: number
}

const STORAGE_KEY = 'readtime-stats'

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgoKey(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  return dateKey(date)
}

export class ReadingStats {
  constructor(private storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  private read(): Record<string, number> {
    try {
      const data = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}')
      if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, number>
    } catch {
      // 数据损坏就当没有记录
    }
    return {}
  }

  addSeconds(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    const data = this.read()
    const key = dateKey()
    data[key] = (data[key] || 0) + Math.round(seconds)
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  snapshot(): StatsSnapshot {
    const data = this.read()
    const totalSeconds = Object.values(data).reduce((sum, value) => sum + value, 0)
    const todaySeconds = data[dateKey()] || 0
    const weekSeconds = Array.from({ length: 7 }, (_, offset) => data[daysAgoKey(offset)] || 0).reduce(
      (sum, value) => sum + value,
      0
    )

    let streakDays = 0
    while (streakDays < 3650 && (data[daysAgoKey(streakDays)] || 0) > 0) {
      streakDays += 1
    }

    return { todaySeconds, weekSeconds, totalSeconds, streakDays }
  }
}

export function formatMinutes(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`
}
