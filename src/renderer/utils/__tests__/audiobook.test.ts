import {
  AudiobookController,
  AudiobookUtterance,
  chapterEndAction,
  createAudiobookController,
  firstVisibleSentence,
  splitSentences
} from '../audiobook'

function createSpeechHarness() {
  const utterances: AudiobookUtterance[] = []
  const speech = {
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    speak: jest.fn((utterance: AudiobookUtterance) => utterances.push(utterance))
  }
  const controller = createAudiobookController({
    speech,
    createUtterance: text => ({ text, lang: '', rate: 1, onend: null, onerror: null }),
    session: { current: 0 }
  })

  return {
    controller,
    speech,
    utterances,
    sync: (options?: Partial<Parameters<AudiobookController['sync']>[0]>) => controller.sync({
      sentences: ['第一句。', '第二句。'],
      currentChapter: 0,
      chapterCount: 1,
      rate: 1.25,
      nextChapter: jest.fn(),
      ...options
    })
  }
}

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

test('continues only when a next chapter exists', () => {
  expect(chapterEndAction(0, 2)).toBe('next')
  expect(chapterEndAction(1, 2)).toBe('stop')
})

test('speaks one configured sentence at a time and advances on end', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  sync()

  controller.startAt(0)
  expect(utterances[0]).toMatchObject({ text: '第一句。', lang: 'zh-CN', rate: 1.25 })
  expect(controller.getState()).toEqual({ playing: true, activeSentence: 0, error: null })

  utterances[0].onend?.()
  expect(utterances[1]).toMatchObject({ text: '第二句。', lang: 'zh-CN', rate: 1.25 })
  expect(controller.getState().activeSentence).toBe(1)
})

test('continues on the next chapter render and stops after the final chapter', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  const nextChapter = jest.fn()
  sync({ currentChapter: 0, chapterCount: 2, nextChapter })
  controller.startAt(1)

  utterances[0].onend?.()
  expect(nextChapter).toHaveBeenCalledTimes(1)
  expect(controller.getState()).toEqual({ playing: true, activeSentence: null, error: null })

  sync({ sentences: ['末章。'], currentChapter: 1, chapterCount: 2, nextChapter })
  expect(utterances[1].text).toBe('末章。')
  utterances[1].onend?.()
  expect(controller.getState()).toEqual({ playing: false, activeSentence: null, error: null })
  expect(nextChapter).toHaveBeenCalledTimes(1)
})

test('skips empty chapters while continuing', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  const nextChapter = jest.fn()
  sync({ sentences: ['开始。'], currentChapter: 0, chapterCount: 3, nextChapter })
  controller.startAt(0)
  utterances[0].onend?.()

  sync({ sentences: [], currentChapter: 1, chapterCount: 3, nextChapter })
  expect(nextChapter).toHaveBeenCalledTimes(2)
  expect(controller.getState().playing).toBe(true)

  sync({ sentences: ['结束。'], currentChapter: 2, chapterCount: 3, nextChapter })
  expect(utterances[1].text).toBe('结束。')
})

test('ignores stale callbacks after canceled speech restarts', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  sync()
  controller.startAt(0)
  const canceledUtterance = utterances[0]

  controller.startAt(1)
  canceledUtterance.onend?.()

  expect(utterances).toHaveLength(2)
  expect(controller.getState()).toEqual({ playing: true, activeSentence: 1, error: null })
})

test('pauses and resumes the same sentence without replacing its utterance', () => {
  const { controller, speech, utterances, sync } = createSpeechHarness()
  sync()
  controller.startAt(0)

  controller.toggle(0)
  expect(speech.pause).toHaveBeenCalledTimes(1)
  expect(controller.getState()).toEqual({ playing: false, activeSentence: 0, error: null })

  controller.toggle(0)
  expect(speech.resume).toHaveBeenCalledTimes(1)
  expect(utterances).toHaveLength(1)
  expect(controller.getState()).toEqual({ playing: true, activeSentence: 0, error: null })
})

test('restarts the active sentence when the rate changes', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  sync({ rate: 1 })
  controller.startAt(0)
  const oldUtterance = utterances[0]

  sync({ rate: 2 })
  expect(utterances[1]).toMatchObject({ text: '第一句。', rate: 2 })
  oldUtterance.onend?.()
  expect(utterances).toHaveLength(2)
  expect(controller.getState()).toEqual({ playing: true, activeSentence: 0, error: null })
})

test('ignores native cancellation errors and stops on other speech errors', () => {
  const { controller, utterances, sync } = createSpeechHarness()
  sync()
  controller.startAt(0)

  utterances[0].onerror?.({ error: 'canceled' })
  utterances[0].onerror?.({ error: 'interrupted' })
  expect(controller.getState()).toEqual({ playing: true, activeSentence: 0, error: null })

  utterances[0].onerror?.({ error: 'network' })
  expect(controller.getState()).toEqual({
    playing: false,
    activeSentence: null,
    error: '系统朗读失败'
  })
})

test('returns an inert error state when system speech is unsupported', () => {
  const nextChapter = jest.fn()
  const controller = createAudiobookController({
    speech: null,
    createUtterance: null,
    session: { current: 0 }
  })
  controller.sync({
    sentences: ['不会朗读。'],
    currentChapter: 0,
    chapterCount: 2,
    rate: 1,
    nextChapter
  })

  controller.startAt(0)
  controller.toggle(0)
  controller.stop()
  expect(controller.getState()).toEqual({
    playing: false,
    activeSentence: null,
    error: '系统不支持朗读'
  })
  expect(nextChapter).not.toHaveBeenCalled()
})
