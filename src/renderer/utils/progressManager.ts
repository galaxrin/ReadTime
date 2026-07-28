export interface Progress {
  filePath: string
  chapter: number
  line: number
  timestamp: number
}

const STORAGE_KEY = 'readtime-progress'

export class ProgressManager {
  private progress = new Map<string, Progress>()

  constructor(private storage: Storage = localStorage) {
    this.load()
  }

  private load() {
    try {
      const data = JSON.parse(this.storage.getItem(STORAGE_KEY) || '{}')
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        this.progress = new Map(Object.entries(data) as [string, Progress][])
      }
    } catch {
      this.progress.clear()
    }
  }

  private save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(this.progress)))
  }

  saveProgress(filePath: string, chapter: number, line: number) {
    this.progress.set(filePath, {
      filePath,
      chapter,
      line,
      timestamp: Date.now()
    })
    this.save()
  }

  loadProgress(filePath: string): Progress | null {
    return this.progress.get(filePath) || null
  }

  removeProgress(filePath: string) {
    this.progress.delete(filePath)
    this.save()
  }

  getLastReadFile(): string | null {
    let lastFile: string | null = null
    let lastTimestamp = 0

    this.progress.forEach((progress, filePath) => {
      if (progress.timestamp >= lastTimestamp) {
        lastTimestamp = progress.timestamp
        lastFile = filePath
      }
    })

    return lastFile
  }

  getAllProgress(): Progress[] {
    return Array.from(this.progress.values())
  }
}
