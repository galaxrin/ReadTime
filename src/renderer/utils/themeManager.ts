export interface Theme {
  id: string
  name: string
  textColor: string
  textShadow: string
  fontSize: number
  lineHeight: number
  opacity: number
  appBackground: string
  readerBackground: string
  surfaceBackground: string
  controlBackground: string
  borderColor: string
  mutedColor: string
  accentColor: string
}

const STORAGE_KEY = 'readtime-theme'
const USAGE_STORAGE_KEY = 'readtime-theme-usage'
// 排版与主题分开存：切主题只换配色，不把用户调过的字号/行距/透明度打回默认
const TYPOGRAPHY_KEY = 'readtime-typography'

interface Typography {
  fontSize: number
  lineHeight: number
  opacity: number
}

function clampTypography(input: Partial<Typography>, base: Typography): Typography {
  return {
    fontSize: typeof input.fontSize === 'number' ? Math.min(24, Math.max(12, input.fontSize)) : base.fontSize,
    lineHeight: typeof input.lineHeight === 'number' ? Math.min(2.5, Math.max(1.2, input.lineHeight)) : base.lineHeight,
    opacity: typeof input.opacity === 'number' ? Math.min(1, Math.max(0.1, input.opacity)) : base.opacity
  }
}

function saveTypography(typography: Typography) {
  localStorage.setItem(TYPOGRAPHY_KEY, JSON.stringify(typography))
}

interface ThemeUsage {
  count: number
  lastUsedAt: number
}

export const defaultThemes: Theme[] = [
  {
    id: 'paper',
    name: '纸张阅读',
    textColor: '#352f29',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: '#e7dfd2',
    readerBackground: 'linear-gradient(145deg, #f7f2e9 0%, #eee5d8 100%)',
    surfaceBackground: 'rgba(255, 252, 246, 0.92)',
    controlBackground: 'rgba(255, 252, 246, 0.82)',
    borderColor: 'rgba(75, 63, 50, 0.14)',
    mutedColor: '#85796c',
    accentColor: '#7c6045'
  },
  {
    id: 'night',
    name: '静谧深色',
    textColor: '#f2eee8',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.96,
    appBackground: '#121416',
    readerBackground: 'radial-gradient(circle at 65% -15%, #293039 0%, #171a1d 42%, #111315 100%)',
    surfaceBackground: 'rgba(28, 31, 35, 0.94)',
    controlBackground: 'rgba(34, 38, 42, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    mutedColor: '#9ca3aa',
    accentColor: '#d7c7ad'
  },
  {
    id: 'glass',
    name: 'macOS 玻璃',
    textColor: '#27292b',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.96,
    appBackground: 'linear-gradient(145deg, #d7e6e1, #ddd4e8 52%, #eadbd0)',
    readerBackground: 'rgba(255, 255, 255, 0.42)',
    surfaceBackground: 'rgba(246, 246, 248, 0.76)',
    controlBackground: 'rgba(255, 255, 255, 0.58)',
    borderColor: 'rgba(255, 255, 255, 0.72)',
    mutedColor: '#6e7175',
    accentColor: '#655995'
  },
  {
    id: 'transparent',
    name: '透明白字',
    textColor: '#ffffff',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: 'transparent',
    readerBackground: 'transparent',
    surfaceBackground: '#181b1f',
    controlBackground: '#181b1f',
    borderColor: 'rgba(255, 255, 255, 0.42)',
    mutedColor: 'rgba(255, 255, 255, 0.72)',
    accentColor: '#ffffff'
  },
  {
    id: 'daylight',
    name: '清爽白昼',
    textColor: '#222831',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: '#edf0f3',
    readerBackground: '#f7f8fa',
    surfaceBackground: 'rgba(255, 255, 255, 0.94)',
    controlBackground: 'rgba(255, 255, 255, 0.84)',
    borderColor: 'rgba(34, 40, 49, 0.12)',
    mutedColor: '#79808a',
    accentColor: '#356b8c'
  },
  {
    id: 'sage',
    name: '青叶护眼',
    textColor: '#29362d',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: '#cfdccf',
    readerBackground: 'linear-gradient(145deg, #e7efe4, #dbe7d8)',
    surfaceBackground: 'rgba(239, 246, 237, 0.94)',
    controlBackground: 'rgba(235, 244, 232, 0.84)',
    borderColor: 'rgba(41, 54, 45, 0.13)',
    mutedColor: '#657267',
    accentColor: '#54745e'
  },
  {
    id: 'mist',
    name: '雾灰专注',
    textColor: '#303438',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: '#d3d6d8',
    readerBackground: 'linear-gradient(145deg, #eceeef, #dfe2e4)',
    surfaceBackground: 'rgba(242, 243, 244, 0.94)',
    controlBackground: 'rgba(238, 240, 241, 0.84)',
    borderColor: 'rgba(48, 52, 56, 0.12)',
    mutedColor: '#73787d',
    accentColor: '#5e6870'
  },
  {
    id: 'blue-mist',
    name: '晨雾蓝',
    textColor: '#253741',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 1,
    appBackground: '#ccdbe3',
    readerBackground: 'linear-gradient(145deg, #e7f0f4, #d8e5ec)',
    surfaceBackground: 'rgba(238, 246, 249, 0.94)',
    controlBackground: 'rgba(232, 242, 247, 0.84)',
    borderColor: 'rgba(37, 55, 65, 0.13)',
    mutedColor: '#637984',
    accentColor: '#4d7488'
  },
  {
    id: 'oled',
    name: '纯黑夜读',
    textColor: '#e9e9e7',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.95,
    appBackground: '#000000',
    readerBackground: '#050505',
    surfaceBackground: 'rgba(15, 15, 15, 0.96)',
    controlBackground: 'rgba(20, 20, 20, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    mutedColor: '#888888',
    accentColor: '#d0d0cc'
  },
  {
    id: 'navy',
    name: '深海蓝',
    textColor: '#dbe5ef',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.96,
    appBackground: '#0b1420',
    readerBackground: 'radial-gradient(circle at 60% -10%, #1d334b, #111d2c 48%, #0b1420)',
    surfaceBackground: 'rgba(19, 34, 50, 0.95)',
    controlBackground: 'rgba(25, 43, 61, 0.84)',
    borderColor: 'rgba(219, 229, 239, 0.1)',
    mutedColor: '#8194a8',
    accentColor: '#91b5d2'
  },
  {
    id: 'amber',
    name: '琥珀夜灯',
    textColor: '#ead8b8',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.96,
    appBackground: '#1e1711',
    readerBackground: 'radial-gradient(circle at 60% -10%, #493522, #2b2118 48%, #1e1711)',
    surfaceBackground: 'rgba(52, 39, 28, 0.95)',
    controlBackground: 'rgba(65, 48, 33, 0.84)',
    borderColor: 'rgba(234, 216, 184, 0.11)',
    mutedColor: '#ad9270',
    accentColor: '#d3aa72'
  },
  {
    id: 'forest',
    name: '墨绿书房',
    textColor: '#d8e5dc',
    textShadow: 'none',
    fontSize: 17,
    lineHeight: 1.9,
    opacity: 0.96,
    appBackground: '#101a16',
    readerBackground: 'radial-gradient(circle at 60% -10%, #2a4035, #17251f 48%, #101a16)',
    surfaceBackground: 'rgba(25, 40, 33, 0.95)',
    controlBackground: 'rgba(31, 49, 40, 0.84)',
    borderColor: 'rgba(216, 229, 220, 0.1)',
    mutedColor: '#82988a',
    accentColor: '#98b8a3'
  }
]

function loadThemeUsage(): Record<string, ThemeUsage> {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || '{}')
    return Object.fromEntries(Object.entries(saved).filter(([id, value]) => {
      if (!value || typeof value !== 'object') return false
      const usage = value as Partial<ThemeUsage>
      return defaultThemes.some(theme => theme.id === id) &&
        Number.isFinite(usage.count) && usage.count! >= 0 &&
        Number.isFinite(usage.lastUsedAt) && usage.lastUsedAt! >= 0
    })) as Record<string, ThemeUsage>
  } catch {
    return {}
  }
}

function loadSavedTheme(): Theme {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    const base = defaultThemes.find(theme => theme.id === saved?.id)
    if (!base) return defaultThemes[0]

    return {
      ...base,
      fontSize: typeof saved.fontSize === 'number' ? Math.min(24, Math.max(12, saved.fontSize)) : base.fontSize,
      lineHeight: typeof saved.lineHeight === 'number' ? Math.min(2.5, Math.max(1.2, saved.lineHeight)) : base.lineHeight,
      opacity: typeof saved.opacity === 'number' ? Math.min(1, Math.max(0.1, saved.opacity)) : base.opacity
    }
  } catch {
    return defaultThemes[0]
  }
}

function readTypographyParts(source: unknown): Partial<Typography> {
  if (!source || typeof source !== 'object') return {}
  const value = source as Partial<Typography>
  return {
    fontSize: typeof value.fontSize === 'number' ? value.fontSize : undefined,
    lineHeight: typeof value.lineHeight === 'number' ? value.lineHeight : undefined,
    opacity: typeof value.opacity === 'number' ? value.opacity : undefined
  }
}

function loadTypography(): Typography {
  // 缺少字段时优先沿用旧主题里存过的排版，最后才退回主题默认
  const legacy = readTypographyParts(loadSavedTheme())
  const base = clampTypography(legacy, defaultThemes[0])

  try {
    const raw = localStorage.getItem(TYPOGRAPHY_KEY)
    if (raw) return clampTypography(readTypographyParts(JSON.parse(raw)), base)
  } catch {
    // 落到下面按迁移处理
  }
  // 这里不写盘：构造函数在 StrictMode 下会被执行两次，迁移后的保存交给首次 update
  return base
}

export class ThemeManager {
  private currentTheme: Theme
  private typography: Typography
  private usage = loadThemeUsage()

  constructor() {
    this.typography = loadTypography()
    this.currentTheme = { ...loadSavedTheme(), ...this.typography }
    this.applyTheme()
  }

  setTheme(theme: Theme) {
    // 只取主题的配色，排版沿用用户设置
    this.currentTheme = { ...theme, ...this.typography }
    this.applyTheme()
    this.save()
    this.recordThemeUse(theme)
  }

  getFrequentThemes(limit = 4): Theme[] {
    return [...defaultThemes]
      .sort((left, right) => {
        const leftUsage = this.usage[left.id]
        const rightUsage = this.usage[right.id]
        return (rightUsage?.count ?? 0) - (leftUsage?.count ?? 0) ||
          (rightUsage?.lastUsedAt ?? 0) - (leftUsage?.lastUsedAt ?? 0) ||
          defaultThemes.indexOf(left) - defaultThemes.indexOf(right)
      })
      .slice(0, limit)
  }

  getTheme(): Theme {
    return this.currentTheme
  }

  updateFontSize(size: number) {
    this.typography = clampTypography({ ...this.typography, fontSize: size }, this.typography)
    this.currentTheme = { ...this.currentTheme, ...this.typography }
    saveTypography(this.typography)
    this.applyTheme()
    this.save()
  }

  updateLineHeight(height: number) {
    this.typography = clampTypography({ ...this.typography, lineHeight: height }, this.typography)
    this.currentTheme = { ...this.currentTheme, ...this.typography }
    saveTypography(this.typography)
    this.applyTheme()
    this.save()
  }

  updateOpacity(opacity: number) {
    this.typography = clampTypography({ ...this.typography, opacity }, this.typography)
    this.currentTheme = { ...this.currentTheme, ...this.typography }
    saveTypography(this.typography)
    this.applyTheme()
    this.save()
  }

  private save() {
    // 只存配色；排版有独立的 readtime-typography，避免同一份数据两个键各写一半
    const theme = this.currentTheme
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: theme.id,
        textColor: theme.textColor,
        textShadow: theme.textShadow,
        appBackground: theme.appBackground,
        readerBackground: theme.readerBackground,
        surfaceBackground: theme.surfaceBackground,
        controlBackground: theme.controlBackground,
        borderColor: theme.borderColor,
        mutedColor: theme.mutedColor,
        accentColor: theme.accentColor
      })
    )
  }

  private recordThemeUse(theme: Theme) {
    const previous = this.usage[theme.id]
    this.usage = {
      ...this.usage,
      [theme.id]: {
        count: (previous?.count ?? 0) + 1,
        lastUsedAt: Date.now()
      }
    }
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(this.usage))
  }

  private applyTheme() {
    const root = document.documentElement
    root.dataset.theme = this.currentTheme.id
    const properties: Record<string, string> = {
      '--text-color': this.currentTheme.textColor,
      '--text-shadow': this.currentTheme.textShadow,
      '--font-size': `${this.currentTheme.fontSize}px`,
      '--line-height': `${this.currentTheme.lineHeight}`,
      '--text-opacity': `${this.currentTheme.opacity}`,
      '--app-background': this.currentTheme.appBackground,
      '--reader-background': this.currentTheme.readerBackground,
      '--surface-background': this.currentTheme.surfaceBackground,
      '--control-background': this.currentTheme.controlBackground,
      '--border-color': this.currentTheme.borderColor,
      '--muted-color': this.currentTheme.mutedColor,
      '--accent-color': this.currentTheme.accentColor
    }
    Object.entries(properties).forEach(([key, value]) => root.style.setProperty(key, value))
  }
}
