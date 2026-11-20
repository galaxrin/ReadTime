import { NARROW_ENTER_WIDTH, NARROW_EXIT_WIDTH, resolveNarrowLayout } from '../useNarrowLayout'

test('宽度低于阈值时进入窄窗口布局', () => {
  expect(resolveNarrowLayout(NARROW_ENTER_WIDTH, false)).toBe(true)
  expect(resolveNarrowLayout(NARROW_ENTER_WIDTH - 60, false)).toBe(true)
  expect(resolveNarrowLayout(600, false)).toBe(false)
})

test('退出阈值更高，形成滞回', () => {
  expect(resolveNarrowLayout(NARROW_EXIT_WIDTH - 1, true)).toBe(true)
  expect(resolveNarrowLayout(NARROW_EXIT_WIDTH, true)).toBe(false)
})

test('中间地带保持原状态', () => {
  const middle = (NARROW_ENTER_WIDTH + NARROW_EXIT_WIDTH) / 2
  expect(resolveNarrowLayout(middle, false)).toBe(false)
  expect(resolveNarrowLayout(middle, true)).toBe(true)
})
