// src/renderer/components/Settings.tsx
import React, { useEffect, useRef, useState } from 'react'
import { AUTO_SCROLL_SPEEDS, FONT_SIZE_RANGE, useSettings } from '../contexts/SettingsContext'
import { ReadingStats, formatMinutes } from '../utils/readingStats'
import './Settings.css'

const DEFAULT_BOSS_KEY = 'CommandOrControl+Shift+H'
const BOSS_KEY_STORAGE = 'readtime-boss-key'

export function Settings() {
  const { state, setTheme, updateFontSize, updateLineHeight, updateOpacity, toggleSettings, updateAutoScrollSpeed, updateReadingFont, importFont, updateAutoHideOnMouseLeave, updateHideBookTitle } = useSettings()
  const { currentTheme, themes, frequentThemes, showSettings, autoScrollSpeed, readingFont, customFonts, autoHideOnMouseLeave, hideBookTitle } = state
  const [shortcut, setShortcut] = useState(
    () => localStorage.getItem(BOSS_KEY_STORAGE) || DEFAULT_BOSS_KEY
  )
  const [shortcutError, setShortcutError] = useState('')
  const [showAllThemes, setShowAllThemes] = useState(false)
  const [autostart, setAutostart] = useState(false)
  const [stats, setStats] = useState(() => new ReadingStats().snapshot())
  const allThemesButtonRef = useRef<HTMLButtonElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const previousThemeViewRef = useRef(false)

  useEffect(() => {
    window.desktop.isAutostartEnabled().then(setAutostart).catch(() => setAutostart(false))
  }, [])

  useEffect(() => {
    if (!showSettings) return
    const refresh = () => setStats(new ReadingStats().snapshot())
    refresh()
    // 面板开着继续阅读时统计还在涨，定时取一次快照
    const timer = setInterval(refresh, 2000)
    return () => clearInterval(timer)
  }, [showSettings])

  useEffect(() => {
    window.desktop.updateBossKey(shortcut).then(success => {
      if (!success) setShortcutError('快捷键冲突，已保留原设置')
    }).catch(() => setShortcutError('无法注册快捷键，已保留原设置'))
  }, [])

  useEffect(() => {
    if (!showSettings) {
      setShowAllThemes(false)
      previousThemeViewRef.current = false
      return
    }
    if (showAllThemes !== previousThemeViewRef.current) {
      (showAllThemes ? backButtonRef : allThemesButtonRef).current?.focus()
      previousThemeViewRef.current = showAllThemes
    }
  }, [showAllThemes, showSettings])

  const captureShortcut = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return
    const modifiers = [
      event.metaKey && 'CommandOrControl',
      event.ctrlKey && 'Control',
      event.altKey && 'Alt',
      event.shiftKey && 'Shift'
    ].filter(Boolean)
    if (modifiers.length === 0) {
      setShortcutError('快捷键必须包含修饰键')
      return
    }
    const next = [...modifiers, event.key.length === 1 ? event.key.toUpperCase() : event.key].join('+')
    if (await window.desktop.updateBossKey(next)) {
      setShortcut(next)
      localStorage.setItem(BOSS_KEY_STORAGE, next)
      setShortcutError('')
    } else {
      setShortcutError('快捷键冲突，已保留原设置')
    }
  }

  if (!showSettings) {
    return null
  }

  return (
    <div className="settings-backdrop" onMouseDown={toggleSettings}>
      <section className="settings-panel" onMouseDown={(event) => event.stopPropagation()}>
      <button className="close-button" onClick={toggleSettings} aria-label="关闭设置">×</button>
      <div className="settings-title">阅读设置</div>

      <div className="settings-section">
        <label className="settings-label">
          <span>阅读统计</span>
          <span>{formatMinutes(stats.totalSeconds)}</span>
        </label>
        <div className="stats-row">
          <div><strong>{formatMinutes(stats.todaySeconds)}</strong><span>今日</span></div>
          <div><strong>{formatMinutes(stats.weekSeconds)}</strong><span>本周</span></div>
          <div><strong>{stats.streakDays} 天</strong><span>连续</span></div>
        </div>
      </div>

      <div className="settings-section">
        <div className="theme-section-header">
          {showAllThemes ? (
            <button ref={backButtonRef} className="theme-back" onClick={() => setShowAllThemes(false)}>‹ 返回</button>
          ) : (
            <label className="settings-label">阅读主题</label>
          )}
          {showAllThemes && <span>全部主题</span>}
        </div>
        <div className={`theme-buttons ${showAllThemes ? 'all-themes' : ''}`}>
          {(showAllThemes ? themes : frequentThemes).map(theme => (
            <button
              key={theme.id}
              className={`theme-button ${currentTheme.id === theme.id ? 'active' : ''}`}
              onClick={() => setTheme(theme)}
              aria-pressed={currentTheme.id === theme.id}
            >
              <span
                className="theme-swatch"
                style={{ background: theme.id === 'transparent' ? '#889296' : theme.readerBackground }}
              >
                <span style={{ color: theme.textColor, textShadow: theme.textShadow }}>Aa</span>
              </span>
              <span className="theme-name">{theme.name}</span>
            </button>
          ))}
        </div>
        {!showAllThemes && (
          <button ref={allThemesButtonRef} className="all-themes-button" onClick={() => setShowAllThemes(true)}>
            <span>全部主题</span><span>{themes.length} ›</span>
          </button>
        )}
      </div>

      <div className="settings-section">
        <label className="settings-label">自动滚动速度</label>
        <div className="speed-options">
          {AUTO_SCROLL_SPEEDS.map(speed => (
            <button key={speed.value} className={speed.value === autoScrollSpeed ? 'active' : ''}
              onClick={() => updateAutoScrollSpeed(speed.value)}>{speed.label}</button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label"><span>阅读字体</span><span>支持 OTF / TTF / WOFF</span></label>
        <div className="shortcut-row">
          <select className="font-select" value={readingFont} onChange={event => void updateReadingFont(event.target.value)}>
            <option value={'Georgia, "Songti SC", "STSong", serif'}>系统宋体</option>
            <option value={'-apple-system, "PingFang SC", sans-serif'}>苹方</option>
            <option value={'"ReadTime ZCOOL XiaoWei", serif'}>站酷小薇体</option>
            <option value={'"ReadTime Ma Shan Zheng", cursive'}>马善政毛笔楷书</option>
            {customFonts.map(font => <option key={font} value={`"ReadTime Custom ${font}"`}>{font}</option>)}
          </select>
          <button className="font-import" onClick={() => void importFont()}>导入字体</button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label"><span>老板键</span><span>点击后按组合键</span></label>
        <div className="shortcut-row">
          <input className="shortcut-input" readOnly value={shortcut} onKeyDown={captureShortcut} />
          <button className="shortcut-reset" onClick={async () => {
            if (await window.desktop.updateBossKey(DEFAULT_BOSS_KEY)) {
              setShortcut(DEFAULT_BOSS_KEY)
              localStorage.setItem(BOSS_KEY_STORAGE, DEFAULT_BOSS_KEY)
              setShortcutError('')
            }
          }}>恢复默认</button>
        </div>
        {shortcutError && <p className="shortcut-error">{shortcutError}</p>}
      </div>

      <div className="settings-section">
        <label className="toggle-row">
          <span>
            <strong>鼠标移出自动隐藏</strong>
            <small>移出窗口立即隐藏，移回恢复</small>
          </span>
          <input
            type="checkbox"
            checked={autoHideOnMouseLeave}
            onChange={event => updateAutoHideOnMouseLeave(event.target.checked)}
          />
        </label>
      </div>

      <div className="settings-section">
        <label className="toggle-row">
          <span>
            <strong>隐藏书名</strong>
            <small>顶部不显示书名，配合防截屏更适合公共场合</small>
          </span>
          <input
            type="checkbox"
            checked={hideBookTitle}
            onChange={event => updateHideBookTitle(event.target.checked)}
          />
        </label>
      </div>

      <div className="settings-section">
        <label className="toggle-row">
          <span>
            <strong>开机自动启动</strong>
            <small>登录后自动在菜单栏待命</small>
          </span>
          <input
            type="checkbox"
            checked={autostart}
            onChange={event => void window.desktop.setAutostart(event.target.checked).then(setAutostart)}
          />
        </label>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <span>字号</span><span>{currentTheme.fontSize}px</span>
        </label>
        <input
          type="range"
          className="settings-slider"
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          value={currentTheme.fontSize}
          onChange={(e) => updateFontSize(parseInt(e.target.value))}
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <span>行距</span><span>{currentTheme.lineHeight}</span>
        </label>
        <input
          type="range"
          className="settings-slider"
          min="1.2"
          max="2.5"
          step="0.1"
          value={currentTheme.lineHeight}
          onChange={(e) => updateLineHeight(parseFloat(e.target.value))}
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <span>文字透明</span><span>{Math.round(currentTheme.opacity * 100)}%</span>
        </label>
        <input
          type="range"
          className="settings-slider"
          min="0.1"
          max="1"
          step="0.05"
          value={currentTheme.opacity}
          onChange={(e) => updateOpacity(parseFloat(e.target.value))}
        />
      </div>
      <p className="settings-signature">ReadTime by 脏咖喱 · Galaxrin</p>
      </section>
    </div>
  )
}
