export function splitSentences(text: string): string[] {
  return text.match(/[^。！？.!?\n]*[。！？.!?]+|[^。！？.!?\n]+|\n/g) || []
}

export function firstVisibleSentence(
  rects: Array<{ top: number; bottom: number }>,
  viewportTop: number,
  viewportBottom: number
): number {
  const visible = rects.findIndex(rect => rect.bottom > viewportTop && rect.top < viewportBottom)
  if (visible >= 0) return visible
  if (!rects.length) return 0
  return rects.reduce((nearest, rect, index) =>
    Math.abs(rect.top - viewportTop) < Math.abs(rects[nearest].top - viewportTop) ? index : nearest
  , 0)
}

export function chapterEndAction(currentChapter: number, chapterCount: number): 'next' | 'stop' {
  return currentChapter < chapterCount - 1 ? 'next' : 'stop'
}

export interface AudiobookPlaybackState {
  playing: boolean
  activeSentence: number | null
  error: string | null
}

export interface AudiobookUtterance {
  text: string
  lang: string
  rate: number
  onend: ((event: SpeechSynthesisEvent) => void) | null
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null
}

interface AudiobookSpeech<Utterance extends AudiobookUtterance> {
  speak: (utterance: Utterance) => void
  cancel: () => void
  pause: () => void
  resume: () => void
}

interface AudiobookOptions {
  sentences: string[]
  currentChapter: number
  chapterCount: number
  rate: number
  nextChapter: () => void
}

export interface AudiobookController {
  sync: (options: AudiobookOptions) => void
  getState: () => AudiobookPlaybackState
  startAt: (sentence: number) => void
  toggle: (sentence: number) => void
  stop: () => void
}

export function createAudiobookController<
  Utterance extends AudiobookUtterance = AudiobookUtterance
>({
  speech,
  createUtterance,
  session,
  onState
}: {
  speech: AudiobookSpeech<Utterance> | null
  createUtterance: ((text: string) => Utterance) | null
  session: { current: number }
  onState?: (state: AudiobookPlaybackState) => void
}): AudiobookController {
  const supported = Boolean(speech && createUtterance)
  let options: AudiobookOptions | null = null
  let pendingChapter: number | null = null
  let paused = false
  let state: AudiobookPlaybackState = {
    playing: false,
    activeSentence: null,
    error: supported ? null : '系统不支持朗读'
  }

  const updateState = (next: AudiobookPlaybackState) => {
    state = next
    onState?.(state)
  }

  const cancel = () => {
    session.current += 1
    speech?.cancel()
    if (paused) {
      speech?.resume()
      paused = false
    }
  }

  const stop = () => {
    if (!supported) return
    cancel()
    pendingChapter = null
    updateState({ playing: false, activeSentence: null, error: state.error })
  }

  const finishChapter = () => {
    if (options && chapterEndAction(options.currentChapter, options.chapterCount) === 'next') {
      pendingChapter = options.currentChapter
      updateState({ playing: true, activeSentence: null, error: null })
      options.nextChapter()
    } else {
      stop()
    }
  }

  const speakAt = (sentence: number) => {
    if (!speech || !createUtterance) return
    if (!options) {
      stop()
      return
    }
    if (!options.sentences.length) {
      finishChapter()
      return
    }
    if (sentence < 0 || sentence >= options.sentences.length) {
      stop()
      return
    }
    const playableSentence = options.sentences.findIndex((text, index) =>
      index >= sentence && text.trim() !== ''
    )
    if (playableSentence < 0) {
      finishChapter()
      return
    }

    const utterance = createUtterance(options.sentences[playableSentence])
    const utteranceSession = session.current
    utterance.lang = 'zh-CN'
    utterance.rate = options.rate
    utterance.onend = () => {
      if (utteranceSession !== session.current) return
      if (options && playableSentence + 1 < options.sentences.length) {
        speakAt(playableSentence + 1)
      }
      else finishChapter()
    }
    utterance.onerror = event => {
      if (
        utteranceSession !== session.current
        || event.error === 'canceled'
        || event.error === 'interrupted'
      ) return
      cancel()
      pendingChapter = null
      updateState({ playing: false, activeSentence: null, error: '系统朗读失败' })
    }
    updateState({ playing: true, activeSentence: playableSentence, error: null })
    speech.speak(utterance)
  }

  const startAt = (sentence: number) => {
    if (!supported) return
    cancel()
    speakAt(sentence)
  }

  const toggle = (sentence: number) => {
    if (!speech || !supported) return
    if (state.playing && state.activeSentence === sentence) {
      speech.pause()
      paused = true
      updateState({ ...state, playing: false })
    } else if (paused && state.activeSentence === sentence) {
      speech.resume()
      paused = false
      updateState({ ...state, playing: true })
    } else {
      startAt(sentence)
    }
  }

  return {
    sync: next => {
      const previous = options
      options = next
      if (pendingChapter !== null && next.currentChapter !== pendingChapter) {
        pendingChapter = null
        next.sentences.length ? speakAt(0) : finishChapter()
      } else if (previous && previous.rate !== next.rate && state.activeSentence !== null) {
        startAt(state.activeSentence)
      }
    },
    getState: () => state,
    startAt,
    toggle,
    stop
  }
}
