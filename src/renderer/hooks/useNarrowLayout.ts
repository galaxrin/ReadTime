import { useEffect, useState } from 'react'

export const NARROW_ENTER_WIDTH = 380
export const NARROW_EXIT_WIDTH = 400

// 滞回：进入看 380、退出看 400，窗口停在临界点时不会来回闪
export function resolveNarrowLayout(width: number, wasNarrow: boolean): boolean {
  return wasNarrow ? width < NARROW_EXIT_WIDTH : width <= NARROW_ENTER_WIDTH
}

export function useNarrowLayout(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => resolveNarrowLayout(window.innerWidth, false))

  useEffect(() => {
    let frame: number | null = null
    const update = () => {
      frame = null
      setIsNarrow(previous => {
        const next = resolveNarrowLayout(window.innerWidth, previous)
        return next === previous ? previous : next
      })
    }
    const onResize = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(update)
    }

    window.addEventListener('resize', onResize)
    update()
    return () => {
      window.removeEventListener('resize', onResize)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  return isNarrow
}
