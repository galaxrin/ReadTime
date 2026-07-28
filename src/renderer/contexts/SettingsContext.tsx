// src/renderer/contexts/SettingsContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Theme, ThemeManager, defaultThemes } from '../utils/themeManager'
import { loadAutoHide, saveAutoHide } from '../utils/autoHideSetting'

interface SettingsState {
  currentTheme: Theme
  themes: Theme[]
  frequentThemes: Theme[]
  showSettings: boolean
  autoScrollSpeed: number
  audiobookRate: number
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
  updateAudiobookRate: (rate: number) => void
  updateReadingFont: (font: string) => void
  importFont: () => Promise<void>
  updateAutoHideOnMouseLeave: (enabled: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)
export const AUTO_SCROLL_SPEEDS = [
  { label: '低速', value: 30 },
  { label: '中速', value: 60 },
  { label: '高速', value: 100 }
] as const
export const AUDIOBOOK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeManager] = useState(() => new ThemeManager())
  const savedSpeed = Number(localStorage.getItem('readtime-auto-scroll-speed')) || 55
  const savedAudiobookRate = Number(localStorage.getItem('readtime-audiobook-rate'))
  const [state, setState] = useState<SettingsState>({
    currentTheme: themeManager.getTheme(),
    themes: defaultThemes,
    frequentThemes: themeManager.getFrequentThemes(),
    showSettings: false,
    autoScrollSpeed: AUTO_SCROLL_SPEEDS.reduce<number>((closest, speed) =>
      Math.abs(speed.value - savedSpeed) < Math.abs(closest - savedSpeed) ? speed.value : closest
    , AUTO_SCROLL_SPEEDS[1].value),
    audiobookRate: AUDIOBOOK_RATES.some(rate => rate === savedAudiobookRate) ? savedAudiobookRate : 1,
    readingFont: localStorage.getItem('readtime-reading-font') || 'Georgia, "Songti SC", "STSong", serif',
    customFonts: [],
    autoHideOnMouseLeave: loadAutoHide()
  })

  const loadCustomFonts = useCallback(async () => {
    const fonts = await window.electronAPI.listFonts()
    await Promise.all(fonts.map(async ({ name, data }) => {
      const face = new FontFace(`ReadTime Custom ${name}`, data.buffer as ArrayBuffer)
      await face.load()
      document.fonts.add(face)
    }))
    setState(prev => ({ ...prev, customFonts: fonts.map(font => font.name) }))
  }, [])

  useEffect(() => {
    void loadCustomFonts()
  }, [loadCustomFonts])

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

  const updateAudiobookRate = useCallback((rate: number) => {
    if (!AUDIOBOOK_RATES.some(value => value === rate)) return
    localStorage.setItem('readtime-audiobook-rate', String(rate))
    setState(prev => ({ ...prev, audiobookRate: rate }))
  }, [])

  const updateReadingFont = useCallback((font: string) => {
    localStorage.setItem('readtime-reading-font', font)
    document.documentElement.style.setProperty('--reading-font', font)
    setState(prev => ({ ...prev, readingFont: font }))
  }, [])

  const importFont = useCallback(async () => {
    if (await window.electronAPI.importFont()) await loadCustomFonts()
  }, [loadCustomFonts])

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
      updateAudiobookRate,
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
