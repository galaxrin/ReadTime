import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { SettingsProvider, useSettings } from '../SettingsContext'
import { resetWindowSpaceForTests } from '../../utils/windowSpace'

type Context = ReturnType<typeof useSettings>

function setup(desktop: Record<string, unknown>) {
  ;(window as unknown as { desktop: unknown }).desktop = desktop
  const holder: { current: Context | null } = { current: null }
  function Probe() {
    holder.current = useSettings()
    return null
  }
  render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>
  )
  return holder
}

function desktopMock(overrides: Record<string, unknown> = {}) {
  const noop = () => () => {}
  return {
    listFonts: jest.fn(() => Promise.resolve([])),
    readFont: jest.fn(),
    importFont: jest.fn(),
    setWindowSizeAnimated: jest.fn(() => Promise.resolve(false)),
    setWindowSize: jest.fn((width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
      return Promise.resolve(true)
    }),
    onOpenSettings: noop,
    ...overrides
  }
}

beforeEach(() => {
  resetWindowSpaceForTests()
})

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

test('窗口太窄时打开设置会把宽高一起撑到可用尺寸', async () => {
  setWindowSize(300, 200)
  const desktop = desktopMock()
  const holder = setup(desktop)

  await act(async () => {
    await holder.current!.toggleSettings()
    await new Promise(resolve => setTimeout(resolve, 400))
  })

  const firstCalls = desktop.setWindowSize.mock.calls
  expect(firstCalls[firstCalls.length - 1]).toEqual([392, 480])
  expect(holder.current!.state.showSettings).toBe(true)

  await act(async () => {
    await holder.current!.toggleSettings()
    await new Promise(resolve => setTimeout(resolve, 400))
  })

  const calls = desktop.setWindowSize.mock.calls
  expect(calls[calls.length - 1]).toEqual([300, 200])
  expect(holder.current!.state.showSettings).toBe(false)
})

test('窗口尺寸已足够时不动窗口', async () => {
  setWindowSize(600, 700)
  const desktop = desktopMock()
  const holder = setup(desktop)

  await act(async () => {
    await holder.current!.toggleSettings()
  })

  expect(desktop.setWindowSize).not.toHaveBeenCalled()
  expect(holder.current!.state.showSettings).toBe(true)
})

test('撑开失败也不影响面板打开', async () => {
  setWindowSize(300, 200)
  const desktop = desktopMock({
    setWindowSize: jest.fn(() => Promise.reject(new Error('boom')))
  })
  const holder = setup(desktop)

  await act(async () => {
    await holder.current!.toggleSettings()
  })

  expect(holder.current!.state.showSettings).toBe(true)
})

test('面板打开后用户自己改尺寸，关闭时不再套用旧快照', async () => {
  setWindowSize(300, 200)
  const desktop = desktopMock()
  const holder = setup(desktop)

  await act(async () => {
    await holder.current!.toggleSettings()
  })
  expect(desktop.setWindowSize).toHaveBeenCalledWith(392, 480)
  const callsAfterOpen = desktop.setWindowSize.mock.calls.length

  // 模拟等待忽略期结束后，用户自己拖动了窗口
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 420))
  })
  await act(async () => {
    fireEvent(window, new Event('resize'))
  })

  await act(async () => {
    await holder.current!.toggleSettings()
  })

  // 快照已被清空，关闭时不应再产生任何尺寸调用（动画会多次调用，所以比总数）
  expect(desktop.setWindowSize.mock.calls.length).toBe(callsAfterOpen)
})
