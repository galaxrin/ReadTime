export interface Chapter {
  title: string
  content: string
  startIndex: number
}

export function resolveEpubTitle(
  sectionHref: string,
  toc: Array<{ href: string; label: string }>,
  index: number
): string {
  const clean = (href: string) => decodeURIComponent(href.split('#')[0]).replace(/^\/+/, '')
  const section = clean(sectionHref)
  return toc.find(item => {
    const href = clean(item.href)
    return href === section || href.endsWith(`/${section}`) || section.endsWith(`/${href}`)
  })?.label.trim() || `章节 ${index + 1}`
}

function decodeTxt(buffer: Uint8Array): { encoding: string; text: string } {
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return { encoding: 'utf-8', text: new TextDecoder('utf-8').decode(buffer) }
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return { encoding: 'utf-16le', text: new TextDecoder('utf-16le').decode(buffer) }
  }
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return { encoding: 'utf-16be', text: new TextDecoder('utf-16be').decode(buffer) }
  }
  try {
    return { encoding: 'utf-8', text: new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
  } catch {
    // 中文 TXT 常见 GBK
    return { encoding: 'gbk', text: new TextDecoder('gbk').decode(buffer) }
  }
}

export function detectEncoding(buffer: Uint8Array): string {
  return decodeTxt(buffer).encoding
}

export function parseTxtFile(buffer: Uint8Array): Chapter[] {
  const { text: content } = decodeTxt(buffer)

  const chapterPattern = /^(?:第[一二三四五六七八九十百千万零〇\d]+[章节回卷]|Chapter\s+\d+|\d+[.、]\s*)/i
  const lines = content.split('\n')
  const headings = lines
    .map((line, index) => ({ title: line.trim(), index }))
    .filter(({ title }) => chapterPattern.test(title))

  if (headings.length === 0) {
    // No chapters found, treat as single chapter
    return [{
      title: '全文',
      content: content,
      startIndex: 0
    }]
  }

  const chapters: Chapter[] = []
  if (headings[0].index > 0 && lines.slice(0, headings[0].index).join('\n').trim()) {
    chapters.push({
      title: '前言',
      content: lines.slice(0, headings[0].index).join('\n').trim(),
      startIndex: 0
    })
  }

  headings.forEach((heading, index) => {
    const end = headings[index + 1]?.index ?? lines.length
    chapters.push({
      title: heading.title,
      content: lines.slice(heading.index + 1, end).join('\n').trim(),
      startIndex: heading.index
    })
  })

  return chapters
}

export async function parseEpubFile(file: File): Promise<Chapter[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      let book: any = null
      try {
        const { default: ePub } = await import('epubjs')
        book = ePub(e.target?.result as ArrayBuffer)
        await book.ready
        const navigation = await book.loaded.navigation
        const toc = (navigation?.toc || []) as Array<{ href: string; label: string }>

        const chapters: Chapter[] = []
        const spine = book.spine as any

        for (let i = 0; i < spine.length; i++) {
          const section = spine.get(i)
          const doc = await section.load()
          const content = doc.body?.textContent || ''
          const title = resolveEpubTitle(section.href || '', toc, i)

          chapters.push({
            title,
            content: content.trim(),
            startIndex: 0
          })
        }

        resolve(chapters)
      } catch (error) {
        reject(error)
      } finally {
        book?.destroy()
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export async function loadFile(file: File): Promise<Chapter[]> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'epub') {
    return parseEpubFile(file)
  }

  // Default to TXT parsing
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = new Uint8Array(e.target?.result as ArrayBuffer)
      const chapters = parseTxtFile(buffer)
      resolve(chapters)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
