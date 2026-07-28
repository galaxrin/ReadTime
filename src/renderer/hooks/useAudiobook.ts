import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudiobookController,
  AudiobookPlaybackState,
  createAudiobookController,
  splitSentences
} from '../utils/audiobook'

interface UseAudiobookOptions {
  content: string
  currentChapter: number
  chapterCount: number
  rate: number
  nextChapter: () => void
}

export interface AudiobookState extends AudiobookPlaybackState {
  startAt: (sentence: number) => void
  toggle: (sentence: number) => void
  stop: () => void
}

export function useAudiobook({
  content,
  currentChapter,
  chapterCount,
  rate,
  nextChapter
}: UseAudiobookOptions): AudiobookState {
  const supported = typeof window !== 'undefined'
    && Boolean(window.speechSynthesis)
    && typeof SpeechSynthesisUtterance !== 'undefined'
  const sentences = useMemo(() => splitSentences(content), [content])
  const session = useRef(0)
  const [state, setState] = useState<AudiobookPlaybackState>({
    playing: false,
    activeSentence: null,
    error: supported ? null : '系统不支持朗读'
  })
  const controller = useRef<AudiobookController | null>(null)

  if (!controller.current) {
    const speech = supported ? window.speechSynthesis : null
    controller.current = createAudiobookController<SpeechSynthesisUtterance>({
      speech: speech && {
        speak: utterance => speech.speak(utterance),
        cancel: () => speech.cancel(),
        pause: () => speech.pause(),
        resume: () => speech.resume()
      },
      createUtterance: supported
        ? text => new SpeechSynthesisUtterance(text)
        : null,
      session,
      onState: setState
    })
  }

  useEffect(() => {
    controller.current?.sync({ sentences, currentChapter, chapterCount, rate, nextChapter })
  }, [sentences, currentChapter, chapterCount, rate, nextChapter])

  useEffect(() => () => controller.current?.stop(), [])

  const startAt = useCallback((sentence: number) => controller.current?.startAt(sentence), [])
  const toggle = useCallback((sentence: number) => controller.current?.toggle(sentence), [])
  const stop = useCallback(() => controller.current?.stop(), [])

  return { ...state, startAt, toggle, stop }
}
