import { shouldAutoHide } from '../autoHide'

test('auto-hide requires the preference and no open overlay', () => {
  expect(shouldAutoHide(false, false)).toBe(false)
  expect(shouldAutoHide(true, true)).toBe(false)
  expect(shouldAutoHide(true, false)).toBe(true)
  expect(shouldAutoHide(true, false, true)).toBe(false)
  expect((shouldAutoHide as (...args: boolean[]) => boolean)(true, false, false, true)).toBe(false)
})
