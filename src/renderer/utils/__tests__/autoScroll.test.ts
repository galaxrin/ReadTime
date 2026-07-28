import { nextScrollPosition, shouldAdvanceChapter } from '../autoScroll'

test('moves by elapsed speed and reports chapter end', () => {
  expect(nextScrollPosition(100, 500, 30, 1000)).toEqual({ position: 130, reachedEnd: false })
  expect(nextScrollPosition(490, 500, 30, 1000)).toEqual({ position: 500, reachedEnd: true })
})

test('keeps sub-pixel progress at low speed', () => {
  let position = 0
  for (let frame = 0; frame < 60; frame++) {
    position = nextScrollPosition(position, 500, 30, 1000 / 60).position
  }
  expect(position).toBeCloseTo(30)
})

test('advances only when scrolling down at the bottom with a next chapter', () => {
  expect(shouldAdvanceChapter(20, 500, 500, 1000, 0, 2)).toBe(true)
  expect(shouldAdvanceChapter(20, 499, 500, 1000, 0, 2)).toBe(true)
  expect(shouldAdvanceChapter(20, 498, 500, 1000, 0, 2)).toBe(false)
  expect(shouldAdvanceChapter(-20, 500, 500, 1000, 0, 2)).toBe(false)
  expect(shouldAdvanceChapter(20, 500, 500, 1000, 1, 2)).toBe(false)
})
