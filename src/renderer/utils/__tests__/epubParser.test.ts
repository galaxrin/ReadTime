import { resolveEpubTitle } from '../fileParser'

describe('epubParser', () => {
  test('uses the navigation label matching a spine href', () => {
    expect(resolveEpubTitle('text/chapter1.xhtml', [
      { href: 'text/chapter1.xhtml#start', label: '第一章 相遇' }
    ], 0)).toBe('第一章 相遇')
  })
})
