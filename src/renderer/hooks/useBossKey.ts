import { useEffect, useState, useCallback } from 'react'

export function useBossKey() {
  const [isHidden, setIsHidden] = useState(false)

  const toggleVisibility = useCallback(() => {
    setIsHidden(prev => !prev)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'h') {
        e.preventDefault()
        toggleVisibility()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleVisibility])

  return { isHidden, toggleVisibility }
}
