// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { ReadingProvider } from './contexts/ReadingContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ReadingView } from './components/ReadingView'
import { ControlBar } from './components/ControlBar'
import { Settings } from './components/Settings'
import { useReading } from './contexts/ReadingContext'
import { useSettings } from './contexts/SettingsContext'
import { shouldAutoHide } from './utils/autoHide'

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

function AppContent() {
  const { importBook, nextChapter, prevChapter } = useReading()
  const { state: settingsState, toggleSettings, updateFontSize } = useSettings()
  const { currentTheme } = settingsState
  const [autoScrolling, setAutoScrolling] = useState(false)
  const pauseAutoScroll = useCallback(() => setAutoScrolling(false), [])
  const [showControls, setShowControls] = useState(false)
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
    window.electronAPI.setWindowAutoHidden(false)
  }, [cancelPendingAutoHide])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
      hideTimeoutRef.current = null
    }, 5000)
  }, [])

  useEffect(() => {
    const hideControls = () => setShowControls(false)
    window.addEventListener('blur', hideControls)
    return () => {
      window.removeEventListener('blur', hideControls)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await importBook((files[0] as File & { path?: string }).path)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' && autoScrolling) {
      e.preventDefault()
      setAutoScrolling(false)
      return
    }
    // Settings shortcut (Cmd+,)
    if (e.metaKey && e.key === ',') {
      e.preventDefault()
      toggleSettings()
    }

    // Chapter navigation (Cmd+ArrowRight / Cmd+ArrowLeft)
    if (e.metaKey && e.key === 'ArrowRight') {
      e.preventDefault()
      nextChapter()
    }

    if (e.metaKey && e.key === 'ArrowLeft') {
      e.preventDefault()
      prevChapter()
    }

    // Font size shortcuts (Cmd+= increase / Cmd+- decrease)
    if (e.metaKey && e.key === '=') {
      e.preventDefault()
      updateFontSize(Math.min(currentTheme.fontSize + 2, 24))
    }

    if (e.metaKey && e.key === '-') {
      e.preventDefault()
      updateFontSize(Math.max(currentTheme.fontSize - 2, 12))
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSettings, nextChapter, prevChapter, updateFontSize, currentTheme.fontSize, autoScrolling])

  useEffect(() => window.electronAPI.onWindowHidden(pauseAutoScroll), [pauseAutoScroll])
  useEffect(() => window.electronAPI.onWindowReveal(revealContent), [revealContent])
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
      className={`app-shell ${autoHidden ? 'auto-hidden' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => {
        revealContent()
        showControlsTemporarily()
      }}
      onMouseLeave={() => {
        if (!shouldAutoHide(
          settingsState.autoHideOnMouseLeave,
          settingsState.showSettings || controlOverlayOpen,
          isResizingRef.current
        )) return
        cancelPendingAutoHide()
        autoHideTimeoutRef.current = setTimeout(() => {
          pauseAutoScroll()
          setAutoHidden(true)
          window.electronAPI.setWindowAutoHidden(true)
          autoHideTimeoutRef.current = null
        }, 200)
      }}
      onClick={showControlsTemporarily}
    >
      <div className="window-drag-region" />
      <ReadingView
        autoScrolling={autoScrolling}
        speed={settingsState.autoScrollSpeed}
        onPause={pauseAutoScroll}
        onManualScroll={() => setShowControls(false)}
      />
      <ControlBar
        visible={showControls}
        autoScrolling={autoScrolling}
        onToggleAutoScroll={toggleAutoScroll}
        onPause={pauseAutoScroll}
        onOverlayChange={setControlOverlayOpen}
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
