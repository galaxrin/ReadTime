import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'

jest.mock('../../contexts/ReadingContext', () => ({
  ReadingProvider: ({ children }: { children: React.ReactNode }) => children,
  useReading: () => ({
    state: { activeBook: null },
    importBook: jest.fn(),
    nextChapter: jest.fn(),
    prevChapter: jest.fn()
  })
}))
jest.mock('../../contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => children,
  useSettings: () => ({
    state: {
      currentTheme: { fontSize: 17 },
      showSettings: false,
      autoHideOnMouseLeave: true,
      autoScrollSpeed: 60
    },
    toggleSettings: jest.fn(),
    updateFontSize: jest.fn()
  })
}))
jest.mock('../ReadingView', () => ({ ReadingView: () => null }))
jest.mock('../ControlBar', () => ({ ControlBar: () => null }))
jest.mock('../Settings', () => ({ Settings: () => null }))
jest.mock('../ReadingView.css', () => ({}))

import App from '../../App'

function mockDesktop(cursorInside: () => boolean) {
  const noop = jest.fn(() => () => {})
  ;(window as unknown as { desktop: unknown }).desktop = {
    windowContainsCursor: jest.fn(() => Promise.resolve(cursorInside())),
    onWindowHidden: noop,
    onWindowReveal: noop,
    onFileDrop: noop,
    onOpenSettings: noop,
    setWindowSize: jest.fn(() => Promise.resolve(true))
  }
}

beforeEach(() => {
  jest.useFakeTimers()
  // 轮询只在窗口失焦时运行；jsdom 默认 hasFocus 为 true
  jest.spyOn(document, 'hasFocus').mockReturnValue(false)
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

test('鼠标离开后隐藏内容，光标回到窗口时无需点击即可恢复', async () => {
  let inside = false
  mockDesktop(() => inside)
  const { container } = render(<App />)
  const shell = container.querySelector('.app-shell') as HTMLElement

  fireEvent.mouseLeave(shell)
  await act(async () => {
    jest.advanceTimersByTime(150)
  })
  expect(shell.className).toContain('auto-hidden')

  inside = true
  await act(async () => {
    jest.advanceTimersByTime(200)
  })
  expect(shell.className).not.toContain('auto-hidden')
})

test('光标仍在窗口内时不隐藏', async () => {
  let inside = true
  mockDesktop(() => inside)
  const { container } = render(<App />)
  const shell = container.querySelector('.app-shell') as HTMLElement

  fireEvent.mouseLeave(shell)
  await act(async () => {
    jest.advanceTimersByTime(150)
  })
  expect(shell.className).not.toContain('auto-hidden')
})

test('不依赖 mouseleave，光标离开窗口后被轮询兜底隐藏', async () => {
  let inside = false
  mockDesktop(() => inside)
  const { container } = render(<App />)
  const shell = container.querySelector('.app-shell') as HTMLElement

  await act(async () => {
    jest.advanceTimersByTime(150)
  })
  await act(async () => {
    jest.advanceTimersByTime(150)
  })
  expect(shell.className).toContain('auto-hidden')
})

test('窗口变窄进入紧凑布局，拖宽后恢复', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  mockDesktop(() => false)
  const { container } = render(<App />)
  const shell = container.querySelector('.app-shell') as HTMLElement
  expect(shell.className).not.toContain('narrow-mode')

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
  await act(async () => {
    fireEvent(window, new Event('resize'))
    jest.advanceTimersByTime(32)
  })
  expect(shell.className).toContain('narrow-mode')
  expect(shell.querySelector('.floating-controls')).toBeTruthy()

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 })
  await act(async () => {
    fireEvent(window, new Event('resize'))
    jest.advanceTimersByTime(32)
  })
  expect(shell.className).not.toContain('narrow-mode')
})

test('浮动播放按钮出现后 2 秒自动收起，失焦立即收起', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
  mockDesktop(() => false)
  const { container } = render(<App />)
  const controls = container.querySelector('.floating-controls') as HTMLElement

  expect(controls).toBeTruthy()
  expect(controls.className).toContain('visible')

  await act(async () => {
    jest.advanceTimersByTime(2100)
  })
  expect(controls.className).not.toContain('visible')

  // 鼠标移入窗口时重新出现
  await act(async () => {
    fireEvent.mouseEnter(container.querySelector('.app-shell') as HTMLElement)
  })
  expect(controls.className).toContain('visible')

  // 失焦立刻收起
  await act(async () => {
    fireEvent(window, new Event('blur'))
  })
  expect(controls.className).not.toContain('visible')
})

test('右键后圆形按钮长成胶囊，露出目录/书架/设置', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
  mockDesktop(() => false)
  const { container } = render(<App />)

  const controls = container.querySelector('.floating-controls') as HTMLElement
  expect(controls.className).not.toContain('expanded')
  expect(controls.querySelectorAll('button')).toHaveLength(4)

  await act(async () => {
    fireEvent.contextMenu(controls.querySelector('.floating-play') as HTMLElement)
  })

  expect(controls.className).toContain('expanded')
  // 只有图标，不显示文字
  expect((controls.textContent || '').trim()).toBe('')
  const labels = Array.from(controls.querySelectorAll('.floating-extra')).map(item => item.getAttribute('aria-label'))
  expect(labels).toEqual(['目录', '书架', '阅读设置'])
})
