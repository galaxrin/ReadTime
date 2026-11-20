// src/renderer/components/ReadingView.tsx
import React, { useRef, useEffect, useCallback } from 'react'
import { useReading } from '../contexts/ReadingContext'
import { useSettings } from '../contexts/SettingsContext'
import { ProgressManager } from '../utils/progressManager'
import {
  nextScrollPosition,
  shouldAdvanceChapter,
  shouldReturnPreviousChapter
} from '../utils/autoScroll'
import './ReadingView.css'

const DEFAULT_LINE_HEIGHT = 24
const SAVE_DEBOUNCE_MS = 1000

// line-height 只写在 .chapter-content 上，从容器取会拿到 "normal" 而退化成常数
function parseLineHeight(el: HTMLElement): number {
  const target = (el.querySelector('.chapter-content') as HTMLElement | null) ?? el
  const raw = parseInt(getComputedStyle(target).lineHeight, 10)
  return Number.isNaN(raw) ? DEFAULT_LINE_HEIGHT : raw
}

interface ReadingViewProps {
  autoScrolling: boolean
  speed: number
  onPause: () => void
  onManualScroll: () => void
}

export function ReadingView({ autoScrolling, speed, onPause, onManualScroll }: ReadingViewProps) {
  const { state, setCurrentLine, nextChapter, prevChapter } = useReading()
  const { state: settingsState } = useSettings()
  const contentRef = useRef<HTMLDivElement>(null)
  const progressManagerRef = useRef<ProgressManager | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chapterAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const returnToChapterEndRef = useRef(false)

  const { chapters, currentChapter, currentLine, bookTitle, activeBook, isLoading, error } = state

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

  // Scroll to saved line position when chapter changes
  useEffect(() => {
    const element = contentRef.current
    if (!element) return
    if (returnToChapterEndRef.current) {
      returnToChapterEndRef.current = false
      element.scrollTop = element.scrollHeight - element.clientHeight
      return
    }
    if (currentLine > 0) element.scrollTop = currentLine * parseLineHeight(element)
  }, [activeBook?.id, currentChapter]) // eslint-disable-line react-hooks/exhaustive-deps

  // 滚动事件很密（自动滚动每帧都写 scrollTop），合并到每帧一次，并按章节缓存行高
  const scrollFrameRef = useRef<number | null>(null)
  const lineHeightRef = useRef<{ chapter: number; value: number } | null>(null)

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    onPause()
    onManualScroll()

    const element = contentRef.current
    if (!element || chapterAdvanceTimerRef.current) return

    if (shouldReturnPreviousChapter(event.deltaY, element.scrollTop, currentChapter)) {
      returnToChapterEndRef.current = true
      prevChapter()
    } else if (shouldAdvanceChapter(
      event.deltaY,
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
      currentChapter,
      chapters.length
    )) {
      element.scrollTop = 0
      nextChapter()
    } else {
      return
    }
    chapterAdvanceTimerRef.current = setTimeout(() => {
      chapterAdvanceTimerRef.current = null
    }, 500)
  }

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const element = contentRef.current
      if (!element) return
      if (!lineHeightRef.current || lineHeightRef.current.chapter !== currentChapter) {
        lineHeightRef.current = { chapter: currentChapter, value: parseLineHeight(element) }
      }
      const scrolledLines = Math.floor(element.scrollTop / lineHeightRef.current.value)
      setCurrentLine(scrolledLines)
    })
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

  if (!bookTitle || chapters.length === 0) {
    return <div className="no-file-message">拖拽文件到此处开始阅读</div>
  }

  // Bounds check: stale progress could reference an out-of-range chapter index
  if (currentChapter < 0 || currentChapter >= chapters.length) {
    return <div className="no-file-message">章节索引无效</div>
  }

  const chapter = chapters[currentChapter]

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
      {!settingsState.hideBookTitle && (
        <header className="reader-header">
          <span className="book-name">{bookTitle}</span>
        </header>
      )}
      <article className="reader-copy">
        <h1 className="chapter-title">{chapter.title}</h1>
        <div className="chapter-content">{chapter.content}</div>
      </article>
    </div>
  )
}
