// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { ReadingProvider } from './contexts/ReadingContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ReadingView } from './components/ReadingView'
import { ControlBar } from './components/ControlBar'
import { BookshelfIcon, SettingsIcon, TocIcon } from './components/AppIcons'
import { PlayPauseIcon } from './components/PlayPauseIcon'
import { Settings } from './components/Settings'
import { useReading } from './contexts/ReadingContext'
import { FONT_SIZE_RANGE, useSettings } from './contexts/SettingsContext'
import { useNarrowLayout } from './hooks/useNarrowLayout'
import { shouldAutoHide } from './utils/autoHide'
import { ReadingStats } from './utils/readingStats'

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px', background: '#1a1a1a', height: '100vh' }}>
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px 16px' }}>
            刷新
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// 光标轮询间隔与隐藏前防抖，前者决定恢复速度，后者防止鼠标掠过边缘就隐藏
const CURSOR_POLL_MS = 100
const HIDE_DELAY_MS = 120
const STATS_TICK_SECONDS = 30
const CONTROLS_HIDE_MS = 5000
const PLAY_BUTTON_VISIBLE_MS = 2000
const MENU_ALIVE_MS = 6000

function AppContent() {
  const { importBook, nextChapter, prevChapter, state: readingState } = useReading()
  const hasBook = Boolean(readingState.bookTitle && readingState.chapters.length)
  const statsRef = useRef<ReadingStats | null>(null)
  const getStats = () => (statsRef.current ??= new ReadingStats())
  const isNarrow = useNarrowLayout()
  const isCompact = isNarrow
  const { state: settingsState, toggleSettings, updateFontSize } = useSettings()
  const { currentTheme } = settingsState
  const [autoScrolling, setAutoScrolling] = useState(false)
  const pauseAutoScroll = useCallback(() => setAutoScrolling(false), [])
  const [showControls, setShowControls] = useState(false)
  const [playButtonVisible, setPlayButtonVisible] = useState(false)
  const [compactMenuOpen, setCompactMenuOpen] = useState(false)
  const [overlayRequest, setOverlayRequest] = useState<'toc' | 'bookshelf' | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)
  const playHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [controlOverlayOpen, setControlOverlayOpen] = useState(false)
  const [autoHidden, setAutoHidden] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isResizingRef = useRef(false)

  const cancelPendingAutoHide = useCallback(() => {
    if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current)
    autoHideTimeoutRef.current = null
  }, [])

  const revealContent = useCallback(() => {
    cancelPendingAutoHide()
    setAutoHidden(false)
  }, [cancelPendingAutoHide])

  const armHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
      hideTimeoutRef.current = null
    }, CONTROLS_HIDE_MS)
  }, [])

  // 菜单不该在失焦、隐藏、开设置、退出紧凑布局后残留
  useEffect(() => {
    if (!isCompact || !playButtonVisible || settingsState.showSettings || autoHidden) {
      setCompactMenuOpen(false)
    }
  }, [isCompact, playButtonVisible, settingsState.showSettings, autoHidden])

  // 浮动播放按钮只短暂出现：进模式、鼠标移入时显示 2 秒，失焦立即收起
  const startLongPress = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null
      longPressTriggeredRef.current = true
      setCompactMenuOpen(true)
      setPlayButtonVisible(true)
    }, 500)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  const showPlayButton = useCallback((duration = PLAY_BUTTON_VISIBLE_MS) => {
    setPlayButtonVisible(true)
    if (playHideRef.current) clearTimeout(playHideRef.current)
    playHideRef.current = setTimeout(() => {
      setPlayButtonVisible(false)
      playHideRef.current = null
    }, duration)
  }, [])

  // 彻底复位长按状态（定时器与“已触发”标记一起清）
  const resetLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
    longPressTriggeredRef.current = false
  }, [])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    armHideTimer()
  }, [armHideTimer])

  // 鼠标停在控制栏上时持续续期，mousemove 很密所以节流到 500ms
  const keepAliveRef = useRef(0)
  const keepControlsAlive = useCallback(() => {
    const now = Date.now()
    if (now - keepAliveRef.current < 500) return
    keepAliveRef.current = now
    setShowControls(true)
    armHideTimer()
  }, [armHideTimer])

  useEffect(() => {
    if (!compactMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.floating-controls')) return
      setCompactMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [compactMenuOpen])

  useEffect(() => {
    if (!isCompact) {
      setCompactMenuOpen(false)
      setPlayButtonVisible(false)
      if (playHideRef.current) {
        clearTimeout(playHideRef.current)
        playHideRef.current = null
      }
      return
    }
    showPlayButton()
  }, [isCompact, showPlayButton])

  useEffect(() => {
    return () => {
      if (playHideRef.current) clearTimeout(playHideRef.current)
      if (longPressRef.current) clearTimeout(longPressRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const hideControls = () => {
      setShowControls(false)
      setPlayButtonVisible(false)
      // 失焦也随自动隐藏开关藏内容，避免切到别的 app 时字还亮在屏幕上
      if (settingsState.autoHideOnMouseLeave && !settingsState.showSettings && !controlOverlayOpen && !autoScrolling) {
        pauseAutoScroll()
        setAutoHidden(true)
      }
    }
    const restore = () => {
      revealContent()
      showControlsTemporarily()
    }
    window.addEventListener('focus', restore)
    window.addEventListener('blur', hideControls)
    return () => {
      window.removeEventListener('focus', restore)
      window.removeEventListener('blur', hideControls)
    }
  }, [
    autoScrolling,
    controlOverlayOpen,
    pauseAutoScroll,
    revealContent,
    settingsState.autoHideOnMouseLeave,
    settingsState.showSettings,
    showControlsTemporarily
  ])

  useEffect(() => {
    const handleResize = () => {
      isResizingRef.current = true
      cancelPendingAutoHide()
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        isResizingRef.current = false
        resizeTimeoutRef.current = null
      }, 300)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelPendingAutoHide()
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [cancelPendingAutoHide])

  const toggleAutoScroll = useCallback(() => {
    setAutoScrolling(value => {
      if (!value) setShowControls(false)
      return !value
    })
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' && autoScrolling) {
      e.preventDefault()
      setAutoScrolling(false)
      return
    }
    // macOS 用 Command、Windows 用 Ctrl，两者都认
    const primary = e.metaKey || e.ctrlKey
    // Settings shortcut (Cmd+,)
    if (primary && e.key === ',') {
      e.preventDefault()
      toggleSettings()
    }

    // Chapter navigation (Cmd+ArrowRight / Cmd+ArrowLeft)
    if (primary && e.key === 'ArrowRight') {
      e.preventDefault()
      nextChapter()
    }

    if (primary && e.key === 'ArrowLeft') {
      e.preventDefault()
      prevChapter()
    }

    // Font size shortcuts (Cmd+= increase / Cmd+- decrease)
    if (primary && e.key === '=') {
      e.preventDefault()
      updateFontSize(Math.min(currentTheme.fontSize + 2, FONT_SIZE_RANGE.max))
    }

    if (primary && e.key === '-') {
      e.preventDefault()
      updateFontSize(Math.max(currentTheme.fontSize - 2, FONT_SIZE_RANGE.min))
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSettings, nextChapter, prevChapter, updateFontSize, currentTheme.fontSize, autoScrolling])

  // 窗口失焦（非 key）时 WKWebView 不再派发 hover，显隐两个方向都改由窗口级光标轮询兜底
  useEffect(() => {
    if (!settingsState.autoHideOnMouseLeave) return
    let cancelled = false
    const timer = setInterval(() => {
      // 窗口有焦点时 DOM 的 mouseenter/mouseleave 可靠，交给它们，省掉每秒 10 次 IPC
      if (document.hasFocus()) return
      void window.desktop.windowContainsCursor().then(inside => {
        if (cancelled) return
        if (inside) {
          cancelPendingAutoHide()
          if (autoHidden) revealContent()
          return
        }
        if (autoHideTimeoutRef.current || settingsState.showSettings || controlOverlayOpen || isResizingRef.current || autoScrolling) return
        autoHideTimeoutRef.current = setTimeout(() => {
          pauseAutoScroll()
          setAutoHidden(true)
          autoHideTimeoutRef.current = null
        }, HIDE_DELAY_MS)
      })
    }, CURSOR_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [
    settingsState.autoHideOnMouseLeave,
    settingsState.showSettings,
    controlOverlayOpen,
    autoScrolling,
    autoHidden,
    revealContent,
    cancelPendingAutoHide,
    pauseAutoScroll
  ])

  // 阅读时长按「实际聚焦区间」累计：失焦立刻结算，不在间隔里凑整
  useEffect(() => {
    if (!readingState.activeBook || autoHidden) return
    let lastTick = Date.now()
    const accumulate = () => {
      const now = Date.now()
      if (document.hasFocus()) {
        getStats().addSeconds(Math.round((now - lastTick) / 1000))
      }
      lastTick = now
    }
    const timer = setInterval(accumulate, STATS_TICK_SECONDS * 1000)
    const onFocus = () => {
      lastTick = Date.now()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', accumulate)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', accumulate)
      accumulate()
    }
  }, [readingState.activeBook?.id, autoHidden])

  useEffect(() => window.desktop.onWindowHidden(pauseAutoScroll), [pauseAutoScroll])
  useEffect(() => window.desktop.onWindowReveal(revealContent), [revealContent])
  useEffect(() => window.desktop.onFileDrop(path => void importBook(path)), [importBook])
  useEffect(() => {
    if (!settingsState.autoHideOnMouseLeave || settingsState.showSettings || controlOverlayOpen) {
      cancelPendingAutoHide()
    }
    if (!settingsState.autoHideOnMouseLeave && autoHidden) revealContent()
  }, [
    settingsState.autoHideOnMouseLeave,
    settingsState.showSettings,
    controlOverlayOpen,
    autoHidden,
    cancelPendingAutoHide,
    revealContent
  ])
  useEffect(() => {
    if (settingsState.showSettings) setAutoScrolling(false)
  }, [settingsState.showSettings])
  useEffect(() => {
    if (autoScrolling) setShowControls(false)
  }, [autoScrolling])

  return (
    <div
      className={`app-shell ${autoHidden ? 'auto-hidden' : ''} ${isNarrow ? 'narrow-mode' : ''}`}
      onMouseEnter={() => {
        revealContent()
        showControlsTemporarily()
        if (isCompact) showPlayButton()
      }}
      onMouseLeave={() => {
        if (!shouldAutoHide(
          settingsState.autoHideOnMouseLeave,
          settingsState.showSettings || controlOverlayOpen,
          isResizingRef.current,
          autoScrolling
        )) return
        cancelPendingAutoHide()
        autoHideTimeoutRef.current = setTimeout(async () => {
          if (await window.desktop.windowContainsCursor()) {
            autoHideTimeoutRef.current = null
            return
          }
          pauseAutoScroll()
          setAutoHidden(true)
          autoHideTimeoutRef.current = null
        }, HIDE_DELAY_MS)
      }}
      onClick={showControlsTemporarily}
    >
      <div className="window-drag-region" data-tauri-drag-region />
      <ReadingView
        autoScrolling={autoScrolling}
        speed={settingsState.autoScrollSpeed}
        onPause={pauseAutoScroll}
        onManualScroll={() => setShowControls(false)}
      />
      {isCompact && (
        <div
          className={`floating-controls ${compactMenuOpen ? 'expanded' : ''} ${autoScrolling ? 'active' : ''} ${playButtonVisible ? 'visible' : ''}`}
          onMouseLeave={() => setCompactMenuOpen(false)}
        >
          <button
            className="floating-play"
            onClick={event => {
              event.stopPropagation()
              if (longPressTriggeredRef.current) {
                // 这次点击是长按松手带来的，不要再切播放
                longPressTriggeredRef.current = false
                return
              }
              toggleAutoScroll()
            }}
            onMouseEnter={() => showPlayButton(isCompact ? (compactMenuOpen ? MENU_ALIVE_MS : PLAY_BUTTON_VISIBLE_MS) : PLAY_BUTTON_VISIBLE_MS)}
            onPointerDown={event => {
              if (event.button !== 0) return
              startLongPress()
            }}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={resetLongPress}
            onContextMenu={event => {
              event.preventDefault()
              setCompactMenuOpen(true)
              showPlayButton(MENU_ALIVE_MS)
            }}
            title={autoScrolling ? '暂停自动滚动' : '开始自动滚动'}
            aria-label={autoScrolling ? '暂停自动滚动' : '开始自动滚动'}
          >
            <PlayPauseIcon playing={autoScrolling} />
          </button>
          <button className="floating-extra" aria-label="目录" title="目录" disabled={!hasBook} onClick={() => {
            setOverlayRequest('toc')
            setCompactMenuOpen(false)
          }}>
            <TocIcon />
          </button>
          <button className="floating-extra" aria-label="书架" title="书架" onClick={() => {
            setOverlayRequest('bookshelf')
            setCompactMenuOpen(false)
          }}>
            <BookshelfIcon />
          </button>
          <button className="floating-extra" aria-label="阅读设置" title="阅读设置" onClick={() => {
            setCompactMenuOpen(false)
            void toggleSettings()
          }}>
            <SettingsIcon />
          </button>
        </div>
      )}
      <ControlBar
        visible={showControls}
        autoScrolling={autoScrolling}
        onToggleAutoScroll={toggleAutoScroll}
        onPause={pauseAutoScroll}
        onOverlayChange={setControlOverlayOpen}
        onKeepAlive={keepControlsAlive}
        overlayRequest={overlayRequest}
        onOverlayRequestConsumed={() => setOverlayRequest(null)}
      />
      <Settings />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ReadingProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ReadingProvider>
    </ErrorBoundary>
  )
}

export default App
