// src/renderer/components/ControlBar.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useReading } from '../contexts/ReadingContext'
import { useSettings } from '../contexts/SettingsContext'
import { Bookmark, BookmarkManager } from '../utils/bookmarkManager'
import { acquireWindowSpace, releaseWindowSpace } from '../utils/windowSpace'
import { PlayPauseIcon } from './PlayPauseIcon'
import './ControlBar.css'

interface ControlBarProps {
  visible: boolean
  autoScrolling: boolean
  onToggleAutoScroll: () => void
  onPause: () => void
  onOverlayChange: (open: boolean) => void
  onKeepAlive: () => void
  overlayRequest?: 'toc' | 'bookshelf' | null
  onOverlayRequestConsumed?: () => void
}

const bookmarkManager = new BookmarkManager()

export function ControlBar({
  visible,
  autoScrolling,
  onToggleAutoScroll,
  onPause,
  onOverlayChange,
  onKeepAlive,
  overlayRequest,
  onOverlayRequestConsumed
}: ControlBarProps) {
  const { state, importBook, openBook, removeBook, nextChapter, prevChapter, setCurrentChapter, setCurrentLine } = useReading()
  const { toggleSettings } = useSettings()
  const { books, activeBook, chapters, currentChapter, currentLine, bookTitle } = state
  const [showToc, setShowToc] = useState(false)
  const [showBookshelf, setShowBookshelf] = useState(false)
  const [tocView, setTocView] = useState<'chapters' | 'bookmarks'>('chapters')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const currentItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (showToc) currentItemRef.current?.scrollIntoView({ block: 'center' })
  }, [showToc])

  useEffect(() => {
    setBookmarks(activeBook ? bookmarkManager.list(activeBook.id) : [])
  }, [activeBook, showToc])

  const overlayOpen = showToc || showBookshelf
  useEffect(() => onOverlayChange(overlayOpen), [overlayOpen, onOverlayChange])

  // 点弹层以外的空白处即返回；控制栏/浮动控件上的点击交给它们自己的开关逻辑
  useEffect(() => {
    if (!overlayOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('.toc-popover')) return
      if (target.closest('.control-bar') || target.closest('.floating-controls')) return
      setShowToc(false)
      setShowBookshelf(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [overlayOpen])

  // 目录/书架要完整显示，窗口不够大时先撑开，关闭时带动画缩回
  useEffect(() => {
    if (!overlayOpen) return
    void acquireWindowSpace()
    return () => {
      void releaseWindowSpace()
    }
  }, [overlayOpen])

  const hasBook = Boolean(bookTitle && chapters.length)

  // 紧凑模式下的浮动菜单要能打开目录/书架
  useEffect(() => {
    if (!overlayRequest) return
    // 没有书时目录弹层根本渲染不出来，若仍然置 showToc 会让 overlay 状态卡住，
    // 进而让“鼠标移出自动隐藏”永久失效
    if (overlayRequest === 'toc' && !hasBook) {
      onOverlayRequestConsumed?.()
      return
    }
    if (overlayRequest === 'toc') {
      onPause()
      setShowToc(true)
      setShowBookshelf(false)
    } else {
      onPause()
      setShowToc(false)
      setShowBookshelf(true)
    }
    onOverlayRequestConsumed?.()
  }, [overlayRequest, hasBook, onPause, onOverlayRequestConsumed])
  const progress = hasBook ? ((currentChapter + 1) / chapters.length) * 100 : 0

  return (
    <>
    {showToc && hasBook && (
      <div className="toc-popover">
        <div className="toc-tabs">
          <button className={tocView === 'chapters' ? 'active' : ''} onClick={() => setTocView('chapters')}>
            目录 · {chapters.length} 章
          </button>
          <button className={tocView === 'bookmarks' ? 'active' : ''} onClick={() => setTocView('bookmarks')}>
            书签 · {bookmarks.length}
          </button>
        </div>
        {tocView === 'chapters' ? (
          <div className="toc-list">
            {chapters.map((chapter, index) => (
              <button
                key={`${chapter.startIndex}-${index}`}
                ref={index === currentChapter ? currentItemRef : undefined}
                className={`toc-item ${index === currentChapter ? 'active' : ''}`}
                onClick={() => {
                  setCurrentChapter(index)
                  setShowToc(false)
                  onPause()
                }}
              >
                <span>{index + 1}</span>{chapter.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="toc-list">
            <button
              className="toc-add-bookmark"
              onClick={() => {
                if (!activeBook) return
                bookmarkManager.add(activeBook.id, currentChapter, currentLine, chapters[currentChapter]?.title || `第 ${currentChapter + 1} 章`)
                setBookmarks(bookmarkManager.list(activeBook.id))
              }}
            >
              ＋ 收藏当前位置
            </button>
            {bookmarks.length === 0 && <div className="bookshelf-empty">还没有书签</div>}
            {bookmarks.map(bookmark => (
              <div className="bookmark-item" key={bookmark.id}>
                <button
                  onClick={() => {
                    setCurrentChapter(Math.min(bookmark.chapter, chapters.length - 1))
                    setCurrentLine(bookmark.line)
                    setShowToc(false)
                    onPause()
                  }}
                >
                  <span>{bookmark.chapter + 1}</span>
                  <span className="bookmark-title">{bookmark.title}</span>
                  <small>{new Date(bookmark.createdAt).toLocaleDateString()}</small>
                </button>
                <button
                  className="bookshelf-remove"
                  aria-label={`删除书签 ${bookmark.title}`}
                  onClick={() => {
                    if (!activeBook) return
                    bookmarkManager.remove(activeBook.id, bookmark.id)
                    setBookmarks(bookmarkManager.list(activeBook.id))
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
    {showBookshelf && (
      <div className="toc-popover bookshelf-popover">
        <div className="toc-header">
          <strong>书架</strong>
          <button className="bookshelf-import" onClick={() => void importBook()}>＋ 导入书籍</button>
        </div>
        <div className="toc-list">
          {books.length === 0 && <div className="bookshelf-empty">还没有书籍</div>}
          {books.map(book => (
            <div className={`bookshelf-item ${book.id === activeBook?.id ? 'active' : ''}`} key={book.id}>
              <button onClick={() => {
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
    <div
      className={`control-bar ${visible || showToc || showBookshelf || !hasBook ? 'visible' : ''}`}
      onMouseEnter={onKeepAlive}
      onMouseMove={onKeepAlive}
    >
      <button className={`control-button wide-control-button ${showBookshelf ? 'active' : ''}`} onClick={() => {
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
      <button className={`control-button wide-control-button ${showToc ? 'active' : ''}`} disabled={!hasBook} onClick={() => {
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
        className="control-button wide-control-button"
        onClick={prevChapter}
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
        className="control-button wide-control-button"
        onClick={nextChapter}
        disabled={!hasBook || currentChapter === chapters.length - 1}
        title="下一章"
        aria-label="下一章"
      >
        ›
      </button>

      <button className={`control-button auto-scroll-button ${autoScrolling ? 'active' : ''}`} disabled={!hasBook} onClick={onToggleAutoScroll}
        title={autoScrolling ? '暂停自动滚动' : '开始自动滚动'} aria-label="自动滚动">
        <PlayPauseIcon playing={autoScrolling} />
      </button>

      <button
        className="control-button wide-control-button"
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
