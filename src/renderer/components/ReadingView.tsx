// src/renderer/components/ReadingView.tsx
import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useReading } from '../contexts/ReadingContext'
import { ProgressManager } from '../utils/progressManager'
import { nextScrollPosition, shouldAdvanceChapter } from '../utils/autoScroll'
import { splitSentences } from '../utils/audiobook'
import './ReadingView.css'

const DEFAULT_LINE_HEIGHT = 24
const SAVE_DEBOUNCE_MS = 1000

function parseLineHeight(el: HTMLElement): number {
  const raw = parseInt(getComputedStyle(el).lineHeight, 10)
  return Number.isNaN(raw) ? DEFAULT_LINE_HEIGHT : raw
}

interface ReadingViewProps {
  autoScrolling: boolean
  speed: number
  activeSentence: number | null
  onPause: () => void
  onManualScroll: () => void
  onStopAudiobook: () => void
}

export function ReadingView({
  autoScrolling,
  speed,
  activeSentence,
  onPause,
  onManualScroll,
  onStopAudiobook
}: ReadingViewProps) {
  const { state, setCurrentLine, nextChapter } = useReading()
  const contentRef = useRef<HTMLDivElement>(null)
  const progressManagerRef = useRef<ProgressManager | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chapterAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { chapters, currentChapter, currentLine, filePath, activeBook, isLoading, error } = state
  const chapter = chapters[currentChapter]
  const sentences = useMemo(() => splitSentences(chapter?.content || ''), [chapter?.content])

  // Lazily initialize ProgressManager once
  const getProgressManager = useCallback(() => {
    if (!progressManagerRef.current) {
      progressManagerRef.current = new ProgressManager()
    }
    return progressManagerRef.current
  }, [])

  // Debounced save: fires at most once per SAVE_DEBOUNCE_MS
  const debouncedSave = useCallback(
    (path: string, chapter: number, line: number) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        getProgressManager().saveProgress(path, chapter, line)
      }, SAVE_DEBOUNCE_MS)
    },
    [getProgressManager],
  )

  // Save progress on chapter/line change (debounced)
  useEffect(() => {
    if (activeBook && chapters.length > 0) {
      debouncedSave(activeBook.id, currentChapter, currentLine)
    }
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [activeBook, chapters.length, currentChapter, currentLine, debouncedSave])

  useEffect(() => {
    const saveBeforeQuit = () => {
      if (activeBook) getProgressManager().saveProgress(activeBook.id, currentChapter, currentLine)
    }
    window.addEventListener('beforeunload', saveBeforeQuit)
    return () => window.removeEventListener('beforeunload', saveBeforeQuit)
  }, [activeBook, currentChapter, currentLine, getProgressManager])

  useEffect(() => () => {
    if (chapterAdvanceTimerRef.current) clearTimeout(chapterAdvanceTimerRef.current)
  }, [])

  useEffect(() => {
    const view = contentRef.current
    if (activeSentence === null || !view) return
    const element = view.querySelector<HTMLElement>(`[data-sentence="${activeSentence}"]`)
    if (!element) return
    const viewRect = view.getBoundingClientRect()
    const sentenceRect = element.getBoundingClientRect()
    if (sentenceRect.bottom <= viewRect.top || sentenceRect.top >= viewRect.bottom) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeSentence])

  // Scroll to saved line position when chapter changes
  useEffect(() => {
    if (contentRef.current && currentLine > 0) {
      const lineHeight = parseLineHeight(contentRef.current)
      contentRef.current.scrollTop = currentLine * lineHeight
    }
  }, [activeBook?.id, currentChapter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    if (contentRef.current) {
      const lineHeight = parseLineHeight(contentRef.current)
      const scrolledLines = Math.floor(contentRef.current.scrollTop / lineHeight)
      setCurrentLine(scrolledLines)
    }
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    onPause()
    onManualScroll()

    const element = contentRef.current
    if (!element || chapterAdvanceTimerRef.current || !shouldAdvanceChapter(
      event.deltaY,
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
      currentChapter,
      chapters.length
    )) return

    element.scrollTop = 0
    onStopAudiobook()
    nextChapter()
    chapterAdvanceTimerRef.current = setTimeout(() => {
      chapterAdvanceTimerRef.current = null
    }, 500)
  }

  useEffect(() => {
    const element = contentRef.current
    if (!autoScrolling || !element) return

    let previous = 0
    let frame = 0
    let position = element.scrollTop
    const tick = (time: number) => {
      if (!previous) {
        previous = time
        frame = requestAnimationFrame(tick)
        return
      }
      const next = nextScrollPosition(
        position,
        Math.max(0, element.scrollHeight - element.clientHeight),
        speed,
        time - previous
      )
      position = next.position
      element.scrollTop = next.position
      previous = time
      if (next.reachedEnd) {
        if (currentChapter < chapters.length - 1) {
          element.scrollTop = 0
          nextChapter()
        } else {
          onPause()
        }
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [autoScrolling, speed, currentChapter, chapters.length, nextChapter, onPause])

  if (isLoading) {
    return <div className="no-file-message">加载中...</div>
  }

  if (error) {
    return <div className="no-file-message">{error}</div>
  }

  if (!filePath || chapters.length === 0) {
    return <div className="no-file-message">拖拽文件到此处开始阅读</div>
  }

  // Bounds check: stale progress could reference an out-of-range chapter index
  if (currentChapter < 0 || currentChapter >= chapters.length) {
    return <div className="no-file-message">章节索引无效</div>
  }

  return (
    <div
      className="reading-view"
      ref={contentRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      onTouchMove={() => {
        onPause()
        onManualScroll()
      }}
      onClick={onPause}
    >
      <header className="reader-header">
        <span className="book-name">{filePath}</span>
        <span className="chapter-count">{currentChapter + 1} / {chapters.length}</span>
      </header>
      <article className="reader-copy">
        <h1 className="chapter-title">{chapter.title}</h1>
        <div className="chapter-content">
          {sentences.map((sentence, index) => (
            <span
              key={index}
              data-sentence={index}
              className={index === activeSentence ? 'spoken-sentence' : undefined}
            >
              {sentence}
            </span>
          ))}
        </div>
      </article>
    </div>
  )
}
