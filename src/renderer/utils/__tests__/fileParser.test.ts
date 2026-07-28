import { parseTxtFile, detectEncoding } from '../fileParser'
import iconv from 'iconv-lite'

describe('fileParser', () => {
  describe('detectEncoding', () => {
    test('accepts browser-native Uint8Array input', () => {
      expect(detectEncoding(new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]))).toBe('utf-8')
    })

    it('should detect UTF-8 with BOM', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
      expect(detectEncoding(buffer)).toBe('utf-8')
    })

    it('should detect UTF-8 without BOM', () => {
      const buffer = Buffer.from('Hello World', 'utf-8')
      expect(detectEncoding(buffer)).toBe('utf-8')
    })

    it('should default to GBK for Chinese content', () => {
      const buffer = iconv.encode('你好世界', 'gbk')
      expect(detectEncoding(buffer)).toBe('gbk')
    })
  })

  describe('parseTxtFile', () => {
    it('should parse single chapter', () => {
      const content = 'This is the content'
      const buffer = Buffer.from(content, 'utf-8')
      const chapters = parseTxtFile(buffer)

      expect(chapters).toHaveLength(1)
      expect(chapters[0].title).toBe('全文')
      expect(chapters[0].content).toBe(content)
    })

    it('should parse multiple chapters', () => {
      const content = `第一章 开始
这是第一章的内容

第二章 继续
这是第二章的内容

第三章 结束
这是第三章的内容`
      const buffer = Buffer.from(content, 'utf-8')
      const chapters = parseTxtFile(buffer)

      expect(chapters).toHaveLength(3)
      expect(chapters[0].title).toBe('第一章 开始')
      expect(chapters[1].title).toBe('第二章 继续')
      expect(chapters[2].title).toBe('第三章 结束')
    })

    it('should handle GBK encoding', () => {
      const content = `第一章 开始
这是第一章的内容`
      const buffer = iconv.encode(content, 'gbk')
      const chapters = parseTxtFile(buffer)

      expect(chapters).toHaveLength(1)
      expect(chapters[0].title).toBe('第一章 开始')
    })

    test('keeps preface and recognizes mixed chapter styles', () => {
      const content = `序言内容
第一章 开始
正文
Chapter 2 Continue
More
3、结束
End`
      const chapters = parseTxtFile(Buffer.from(content))

      expect(chapters.map(chapter => chapter.title)).toEqual([
        '前言',
        '第一章 开始',
        'Chapter 2 Continue',
        '3、结束'
      ])
    })
  })
})
