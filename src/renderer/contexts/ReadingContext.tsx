import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { Chapter, loadFile } from '../utils/fileParser'
import { ProgressManager, Progress } from '../utils/progressManager'

interface ReadingState {
  chapters: Chapter[]
  currentChapter: number
  currentLine: number
  filePath: string | null
  books: BookRecord[]
  activeBook: BookRecord | null
  isLoading: boolean
  error: string | null
}

type ReadingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHAPTERS'; payload: Chapter[] }
  | { type: 'SET_FILE_PATH'; payload: string }
  | { type: 'SET_BOOKS'; payload: BookRecord[] }
  | { type: 'SET_ACTIVE_BOOK'; payload: BookRecord | null }
  | { type: 'SET_CURRENT_CHAPTER'; payload: number }
  | { type: 'SET_CURRENT_LINE'; payload: number }
  | { type: 'RESET_READING' }
  | { type: 'NEXT_CHAPTER' }
  | { type: 'PREV_CHAPTER' }

const initialState: ReadingState = {
  chapters: [],
  currentChapter: 0,
  currentLine: 0,
  filePath: null,
  books: [],
  activeBook: null,
  isLoading: false,
  error: null
}

function readingReducer(state: ReadingState, action: ReadingAction): ReadingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_CHAPTERS':
      return { ...state, chapters: action.payload }
    case 'SET_FILE_PATH':
      return { ...state, filePath: action.payload }
    case 'SET_BOOKS':
      return { ...state, books: action.payload }
    case 'SET_ACTIVE_BOOK':
      return { ...state, activeBook: action.payload }
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapter: action.payload, currentLine: 0 }
    case 'SET_CURRENT_LINE':
      return { ...state, currentLine: action.payload }
    case 'NEXT_CHAPTER':
      if (state.currentChapter < state.chapters.length - 1) {
        return { ...state, currentChapter: state.currentChapter + 1, currentLine: 0 }
      }
      return state
    case 'PREV_CHAPTER':
      if (state.currentChapter > 0) {
        return { ...state, currentChapter: state.currentChapter - 1, currentLine: 0 }
      }
      return state
    case 'RESET_READING':
      return { ...state, chapters: [], currentChapter: 0, currentLine: 0, filePath: null, activeBook: null }
    default:
      return state
  }
}

interface ReadingContextType {
  state: ReadingState
  dispatch: React.Dispatch<ReadingAction>
  importBook: (sourcePath?: string) => Promise<void>
  openBook: (id: string) => Promise<void>
  removeBook: (id: string) => Promise<void>
  nextChapter: () => void
  prevChapter: () => void
  setCurrentChapter: (chapter: number) => void
  setCurrentLine: (line: number) => void
}

const ReadingContext = createContext<ReadingContextType | null>(null)

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(readingReducer, initialState)
  const stateRef = useRef(state)
  const progressManagerRef = useRef<ProgressManager | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const getProgressManager = useCallback(() => {
    if (!progressManagerRef.current) {
      progressManagerRef.current = new ProgressManager()
    }
    return progressManagerRef.current
  }, [])

  const refreshBooks = useCallback(async () => {
    const books = await window.electronAPI.listBooks()
    dispatch({ type: 'SET_BOOKS', payload: books })
    return books
  }, [])

  const openBook = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const current = stateRef.current
      if (current.activeBook) {
        getProgressManager().saveProgress(current.activeBook.id, current.currentChapter, current.currentLine)
      }
      const { book, data } = await window.electronAPI.readBook(id)
      const file = new File([new Uint8Array(data)], book.title)
      const chapters = await loadFile(file)
      const progress = getProgressManager().loadProgress(book.id)
        || getProgressManager().loadProgress(book.title)
      const chapter = Math.min(Math.max(progress?.chapter || 0, 0), Math.max(chapters.length - 1, 0))
      const line = Math.max(progress?.line || 0, 0)

      dispatch({ type: 'SET_CHAPTERS', payload: chapters })
      dispatch({ type: 'SET_FILE_PATH', payload: book.title })
      dispatch({ type: 'SET_ACTIVE_BOOK', payload: book })
      dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapter })
      dispatch({ type: 'SET_CURRENT_LINE', payload: line })
      if (progress && progress.filePath === book.title) {
        getProgressManager().saveProgress(book.id, chapter, line)
      }
      await window.electronAPI.touchBook(book.id)
      await refreshBooks()
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '无法打开书籍' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [getProgressManager, refreshBooks])

  const importBook = useCallback(async (sourcePath?: string) => {
    try {
      const book = await window.electronAPI.importBook(sourcePath)
      if (book) await openBook(book.id)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '导入书籍失败' })
    }
  }, [openBook])

  const removeBook = useCallback(async (id: string) => {
    await window.electronAPI.removeBook(id)
    getProgressManager().removeProgress(id)
    const books = await refreshBooks()
    if (state.activeBook?.id !== id) return
    if (books[0]) await openBook(books[0].id)
    else dispatch({ type: 'RESET_READING' })
  }, [getProgressManager, openBook, refreshBooks, state.activeBook?.id])

  useEffect(() => {
    void refreshBooks()
      .then(books => books[0] && openBook(books[0].id))
      .catch(() => dispatch({ type: 'SET_ERROR', payload: '无法恢复上次阅读的书籍' }))
  }, [openBook, refreshBooks])

  const nextChapter = useCallback(() => {
    dispatch({ type: 'NEXT_CHAPTER' })
  }, [])

  const prevChapter = useCallback(() => {
    dispatch({ type: 'PREV_CHAPTER' })
  }, [])

  const setCurrentChapter = useCallback((chapter: number) => {
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapter })
  }, [])

  const setCurrentLine = useCallback((line: number) => {
    dispatch({ type: 'SET_CURRENT_LINE', payload: line })
  }, [])

  return (
    <ReadingContext.Provider value={{
      state,
      dispatch,
      importBook,
      openBook,
      removeBook,
      nextChapter,
      prevChapter,
      setCurrentChapter,
      setCurrentLine
    }}>
      {children}
    </ReadingContext.Provider>
  )
}

export function useReading() {
  const context = useContext(ReadingContext)
  if (!context) {
    throw new Error('useReading must be used within ReadingProvider')
  }
  return context
}
