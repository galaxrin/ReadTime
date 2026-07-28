import { firstVisibleSentence, splitSentences } from '../audiobook'

test('preserves Chinese, English, and newline sentence text', () => {
  expect(splitSentences('你好。How are you?\n下一行！')).toEqual([
    '你好。',
    'How are you?',
    '\n',
    '下一行！'
  ])
})

test('drops no text and ignores empty input', () => {
  const text = '无标点结尾'
  expect(splitSentences(text).join('')).toBe(text)
  expect(splitSentences('')).toEqual([])
})

test('chooses the first intersecting sentence', () => {
  expect(firstVisibleSentence([
    { top: -40, bottom: -10 },
    { top: -5, bottom: 20 },
    { top: 20, bottom: 50 }
  ], 0, 40)).toBe(1)
})

test('falls back to the sentence nearest the viewport top', () => {
  expect(firstVisibleSentence([
    { top: -80, bottom: -40 },
    { top: 70, bottom: 90 }
  ], 0, 40)).toBe(1)
  expect(firstVisibleSentence([], 0, 40)).toBe(0)
})
