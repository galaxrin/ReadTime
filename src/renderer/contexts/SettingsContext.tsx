// src/renderer/contexts/SettingsContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Theme, ThemeManager, defaultThemes } from '../utils/themeManager'
import { loadAutoHide, saveAutoHide } from '../utils/autoHideSetting'
import { acquireWindowSpace, dropWindowSpaceRestore, isResizeFromUs, releaseWindowSpace } from '../utils/windowSpace'

interface SettingsState {
  currentTheme: Theme
  themes: Theme[]
  frequentThemes: Theme[]
  showSettings: boolean
  autoScrollSpeed: number
  readingFont: string
  customFonts: string[]
  autoHideOnMouseLeave: boolean
  hideBookTitle: boolean
}

interface SettingsContextType {
  state: SettingsState
  setTheme: (theme: Theme) => void
  updateFontSize: (size: number) => void
  updateLineHeight: (height: number) => void
  updateOpacity: (opacity: number) => void
  toggleSettings: () => void
  updateAutoScrollSpeed: (speed: number) => void
  updateReadingFont: (font: string) => Promise<void>
  importFont: () => Promise<void>
  updateAutoHideOnMouseLeave: (enabled: boolean) => void
  updateHideBookTitle: (enabled: boolean) => void
}

const HIDE_TITLE_KEY = 'readtime-hide-book-title'

export const FONT_SIZE_RANGE = { min: 12, max: 24 } as const

const SettingsContext = createContext<SettingsContextType | null>(null)
export const AUTO_SCROLL_SPEEDS = [
  { label: '低速', value: 30 },
  { label: '中速', value: 60 },
  { label: '高速', value: 100 }
] as const

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeManager] = useState(() => new ThemeManager())
  const loadedFonts = useRef(new Set<string>())
  const savedSpeed = Number(localStorage.getItem('readtime-auto-scroll-speed')) || 55
  const savedFont = localStorage.getItem('readtime-reading-font') || 'Georgia, "Songti SC", "STSong", serif'
  const [state, setState] = useState<SettingsState>({
    currentTheme: themeManager.getTheme(),
    themes: defaultThemes,
    frequentThemes: themeManager.getFrequentThemes(),
    showSettings: false,
    autoScrollSpeed: AUTO_SCROLL_SPEEDS.reduce<number>((closest, speed) =>
      Math.abs(speed.value - savedSpeed) < Math.abs(closest - savedSpeed) ? speed.value : closest
    , AUTO_SCROLL_SPEEDS[1].value),
    readingFont: savedFont,
    customFonts: [],
    autoHideOnMouseLeave: loadAutoHide(),
    hideBookTitle: localStorage.getItem(HIDE_TITLE_KEY) === 'true'
  })

  const loadFont = useCallback(async (name: string) => {
    if (loadedFonts.current.has(name)) return
    const data = await window.desktop.readFont(name)
    const face = new FontFace(`ReadTime Custom ${name}`, data.buffer as ArrayBuffer)
    await face.load()
    document.fonts.add(face)
    loadedFonts.current.add(name)
  }, [])

  useEffect(() => {
    void window.desktop.listFonts().catch(() => [] as string[]).then(async fonts => {
      setState(prev => ({ ...prev, customFonts: fonts }))
      const selected = /^"ReadTime Custom (.+)"$/.exec(savedFont)?.[1]
      if (selected && fonts.includes(selected)) await loadFont(selected)
    })
  }, [loadFont, savedFont])

  const setTheme = useCallback((theme: Theme) => {
    themeManager.setTheme(theme)
    const current = themeManager.getTheme()
    setState(prev => ({
      ...prev,
      currentTheme: current,
      frequentThemes: themeManager.getFrequentThemes()
    }))
  }, [themeManager])

  const updateFontSize = useCallback((size: number) => {
    themeManager.updateFontSize(size)
    setState(prev => ({ ...prev, currentTheme: themeManager.getTheme() }))
  }, [themeManager])

  const updateLineHeight = useCallback((height: number) => {
    themeManager.updateLineHeight(height)
    setState(prev => ({ ...prev, currentTheme: themeManager.getTheme() }))
  }, [themeManager])

  const updateOpacity = useCallback((opacity: number) => {
    themeManager.updateOpacity(opacity)
    setState(prev => ({ ...prev, currentTheme: themeManager.getTheme() }))
  }, [themeManager])

  // 托盘打开设置时若原本是迷你横条，关掉面板要还原回去
  // 窗口被拖得太小时设置面板放不下：打开前临时撑开，关闭后带动画还原
  const showSettingsRef = useRef(false)
  showSettingsRef.current = state.showSettings

  const toggleSettings = useCallback(async () => {
    const opening = !showSettingsRef.current
    try {
      if (opening) await acquireWindowSpace()
      else await releaseWindowSpace()
    } catch (error) {
      console.error('切换设置面板失败:', error)
    } finally {
      setState(prev => ({ ...prev, showSettings: opening }))
    }
  }, [])

  const openSettings = useCallback(() => {
    if (state.showSettings) return
    void toggleSettings()
  }, [state.showSettings, toggleSettings])

  const openSettingsRef = useRef(openSettings)
  useEffect(() => {
    openSettingsRef.current = openSettings
  }, [openSettings])

  useEffect(() => {
    const stop = window.desktop.onOpenSettings(() => openSettingsRef.current())
    return stop
  }, [])

  // 面板开着时用户自己拖动窗口，说明他改了主意：不再还原
  useEffect(() => {
    if (!state.showSettings) return
    const onResize = () => {
      if (isResizeFromUs()) return
      dropWindowSpaceRestore()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [state.showSettings])

  const updateAutoScrollSpeed = useCallback((speed: number) => {
    if (!AUTO_SCROLL_SPEEDS.some(option => option.value === speed)) return
    localStorage.setItem('readtime-auto-scroll-speed', String(speed))
    setState(prev => ({ ...prev, autoScrollSpeed: speed }))
  }, [])

  const updateReadingFont = useCallback(async (font: string) => {
    const selected = /^"ReadTime Custom (.+)"$/.exec(font)?.[1]
    if (selected) await loadFont(selected)
    localStorage.setItem('readtime-reading-font', font)
    setState(prev => ({ ...prev, readingFont: font }))
  }, [loadFont])

  const importFont = useCallback(async () => {
    const name = await window.desktop.importFont()
    if (!name) return
    loadedFonts.current.delete(name)
    await loadFont(name)
    setState(prev => ({ ...prev, customFonts: [...new Set([...prev.customFonts, name])] }))
  }, [loadFont])

  const updateAutoHideOnMouseLeave = useCallback((enabled: boolean) => {
    saveAutoHide(enabled)
    setState(prev => ({ ...prev, autoHideOnMouseLeave: enabled }))
  }, [])

  const updateHideBookTitle = useCallback((enabled: boolean) => {
    localStorage.setItem(HIDE_TITLE_KEY, String(enabled))
    setState(prev => ({ ...prev, hideBookTitle: enabled }))
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--reading-font', state.readingFont)
  }, [state.readingFont])

  // 历史上可能存着 55 这类非档位值，被吸附后要回写，否则永远对不上
  useEffect(() => {
    localStorage.setItem('readtime-auto-scroll-speed', String(state.autoScrollSpeed))
  }, [state.autoScrollSpeed])

  return (
    <SettingsContext.Provider value={{
      state,
      setTheme,
      updateFontSize,
      updateLineHeight,
      updateOpacity,
      toggleSettings,
      updateAutoScrollSpeed,
      updateReadingFont,
      importFont,
      updateAutoHideOnMouseLeave,
      updateHideBookTitle
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
