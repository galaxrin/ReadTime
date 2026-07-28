// src/renderer/components/ControlBar.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useReading } from '../contexts/ReadingContext'
import { useSettings } from '../contexts/SettingsContext'
import './ControlBar.css'

interface ControlBarProps {
  visible: boolean
  autoScrolling: boolean
  audiobookPlaying: boolean
  onToggleAutoScroll: () => void
  onToggleAudiobook: () => void
  onStopAudiobook: () => void
  onPause: () => void
  onOverlayChange: (open: boolean) => void
}

export function ControlBar({
  visible,
  autoScrolling,
  audiobookPlaying,
  onToggleAutoScroll,
  onToggleAudiobook,
  onStopAudiobook,
  onPause,
  onOverlayChange
}: ControlBarProps) {
  const { state, importBook, openBook, removeBook, nextChapter, prevChapter, setCurrentChapter } = useReading()
  const { toggleSettings } = useSettings()
  const { books, activeBook, chapters, currentChapter, filePath } = state
  const [showToc, setShowToc] = useState(false)
  const [showBookshelf, setShowBookshelf] = useState(false)
  const currentItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (showToc) currentItemRef.current?.scrollIntoView({ block: 'center' })
  }, [showToc])
  useEffect(() => onOverlayChange(showToc || showBookshelf), [showToc, showBookshelf, onOverlayChange])

  const hasBook = Boolean(filePath && chapters.length)
  const progress = hasBook ? ((currentChapter + 1) / chapters.length) * 100 : 0

  return (
    <>
    {showToc && hasBook && (
      <div className="toc-popover">
        <div className="toc-header"><strong>目录</strong><span>{chapters.length} 章</span></div>
        <div className="toc-list">
          {chapters.map((chapter, index) => (
            <button
              key={`${chapter.startIndex}-${index}`}
              ref={index === currentChapter ? currentItemRef : undefined}
              className={`toc-item ${index === currentChapter ? 'active' : ''}`}
              onClick={() => {
                onStopAudiobook()
                setCurrentChapter(index)
                setShowToc(false)
                onPause()
              }}
            >
              <span>{index + 1}</span>{chapter.title}
            </button>
          ))}
        </div>
      </div>
    )}
    {showBookshelf && (
      <div className="toc-popover bookshelf-popover">
        <div className="toc-header">
          <strong>书架</strong>
          <button className="bookshelf-import" onClick={() => {
            onStopAudiobook()
            void importBook()
          }}>＋ 导入书籍</button>
        </div>
        <div className="toc-list">
          {books.length === 0 && <div className="bookshelf-empty">还没有书籍</div>}
          {books.map(book => (
            <div className={`bookshelf-item ${book.id === activeBook?.id ? 'active' : ''}`} key={book.id}>
              <button onClick={() => {
                onStopAudiobook()
                void openBook(book.id)
                setShowBookshelf(false)
                onPause()
              }}>
                <span>{book.title}</span>
                <small>{book.format.toUpperCase()}</small>
              </button>
              <button className="bookshelf-remove" aria-label={`移除 ${book.title}`} onClick={() => {
                if (window.confirm('从书架移除？原文件不会被删除。')) void removeBook(book.id)
              }}>×</button>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className={`control-bar ${visible || showToc || showBookshelf || !hasBook ? 'visible' : ''}`}>
      <button className={`control-button ${showBookshelf ? 'active' : ''}`} onClick={() => {
        setShowBookshelf(value => !value)
        setShowToc(false)
        onPause()
      }} title="书架" aria-label="书架">
        <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5.5" width="7" height="15" rx="1.5" />
          <rect x="10.5" y="3.5" width="8" height="17" rx="1.5" />
          <path d="M6 9h2M13.5 7h2" />
        </svg>
      </button>
      <button className={`control-button ${showToc ? 'active' : ''}`} disabled={!hasBook} onClick={() => {
        setShowToc(value => !value)
        setShowBookshelf(false)
        onPause()
      }} title="目录" aria-label="目录">
        <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="6" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="5" cy="18" r="1" />
          <path d="M9 6h10M9 12h8M9 18h6" />
        </svg>
      </button>
      <button
        className="control-button"
        onClick={() => {
          onStopAudiobook()
          prevChapter()
        }}
        disabled={!hasBook || currentChapter === 0}
        title="上一章"
        aria-label="上一章"
      >
        ‹
      </button>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="progress-info">
        {hasBook ? `${currentChapter + 1} / ${chapters.length}` : '—'}
      </span>

      <button
        className="control-button"
        onClick={() => {
          onStopAudiobook()
          nextChapter()
        }}
        disabled={!hasBook || currentChapter === chapters.length - 1}
        title="下一章"
        aria-label="下一章"
      >
        ›
      </button>

      <button className={`control-button auto-scroll-button ${autoScrolling ? 'active' : ''}`} disabled={!hasBook} onClick={onToggleAutoScroll}
        title={autoScrolling ? '暂停自动滚动' : '开始自动滚动'} aria-label="自动滚动">
        {autoScrolling ? 'Ⅱ' : '▶'}
      </button>

      <button
        className={`control-button audiobook-button ${audiobookPlaying ? 'active' : ''}`}
        disabled={!hasBook}
        onClick={onToggleAudiobook}
        title={audiobookPlaying ? '暂停听书' : '开始听书'}
        aria-label={audiobookPlaying ? '暂停听书' : '开始听书'}
      >
        {audiobookPlaying ? 'Ⅱ' : '🔊'}
      </button>

      <button
        className="control-button"
        onClick={toggleSettings}
        title="阅读设置"
        aria-label="阅读设置"
      >
        ⌘
      </button>
    </div>
    </>
  )
}
