export interface Progress {
  filePath: string
  chapter: number
  line: number
  timestamp: number
}

const STORAGE_KEY = 'readtime-progress'

type ProgressMap = Record<string, Progress>

export class ProgressManager {
  constructor(private storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  // 每次读写存储，多个实例（阅读视图 / 上下文）看到的是同一份数据
  private read(): ProgressMap {
    try {
      const data = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}')
      if (data && typeof data === 'object' && !Array.isArray(data)) return data as ProgressMap
    } catch {
      // 数据损坏按空处理
    }
    return {}
  }

  private write(data: ProgressMap) {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  saveProgress(filePath: string, chapter: number, line: number) {
    const data = this.read()
    data[filePath] = { filePath, chapter, line, timestamp: Date.now() }
    this.write(data)
  }

  loadProgress(filePath: string): Progress | null {
    return this.read()[filePath] || null
  }

  removeProgress(filePath: string) {
    const data = this.read()
    delete data[filePath]
    this.write(data)
  }

  getAllProgress(): Progress[] {
    return Object.values(this.read())
  }
}
