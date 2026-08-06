// src/renderer/contexts/SettingsContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Theme, ThemeManager, defaultThemes } from '../utils/themeManager'
import { loadAutoHide, saveAutoHide } from '../utils/autoHideSetting'

interface SettingsState {
  currentTheme: Theme
  themes: Theme[]
  frequentThemes: Theme[]
  showSettings: boolean
  autoScrollSpeed: number
  readingFont: string
  customFonts: string[]
  autoHideOnMouseLeave: boolean
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
}

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
    autoHideOnMouseLeave: loadAutoHide()
  })

  const loadFont = useCallback(async (name: string) => {
    if (loadedFonts.current.has(name)) return
    const data = await window.electronAPI.readFont(name)
    const face = new FontFace(`ReadTime Custom ${name}`, data.buffer as ArrayBuffer)
    await face.load()
    document.fonts.add(face)
    loadedFonts.current.add(name)
  }, [])

  useEffect(() => {
    void window.electronAPI.listFonts().then(async fonts => {
      setState(prev => ({ ...prev, customFonts: fonts }))
      const selected = /^"ReadTime Custom (.+)"$/.exec(savedFont)?.[1]
      if (selected && fonts.includes(selected)) await loadFont(selected)
    })
  }, [loadFont, savedFont])

  const setTheme = useCallback((theme: Theme) => {
    themeManager.setTheme(theme)
    setState(prev => ({
      ...prev,
      currentTheme: theme,
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

  const toggleSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: !prev.showSettings }))
  }, [])

  const updateAutoScrollSpeed = useCallback((speed: number) => {
    if (!AUTO_SCROLL_SPEEDS.some(option => option.value === speed)) return
    localStorage.setItem('readtime-auto-scroll-speed', String(speed))
    setState(prev => ({ ...prev, autoScrollSpeed: speed }))
  }, [])

  const updateReadingFont = useCallback(async (font: string) => {
    const selected = /^"ReadTime Custom (.+)"$/.exec(font)?.[1]
    if (selected) await loadFont(selected)
    localStorage.setItem('readtime-reading-font', font)
    document.documentElement.style.setProperty('--reading-font', font)
    setState(prev => ({ ...prev, readingFont: font }))
  }, [loadFont])

  const importFont = useCallback(async () => {
    const name = await window.electronAPI.importFont()
    if (!name) return
    loadedFonts.current.delete(name)
    await loadFont(name)
    setState(prev => ({ ...prev, customFonts: [...new Set([...prev.customFonts, name])] }))
  }, [loadFont])

  const updateAutoHideOnMouseLeave = useCallback((enabled: boolean) => {
    saveAutoHide(enabled)
    setState(prev => ({ ...prev, autoHideOnMouseLeave: enabled }))
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--reading-font', state.readingFont)
  }, [state.readingFont])

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
      updateAutoHideOnMouseLeave
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
