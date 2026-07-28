export function nextScrollPosition(
  current: number,
  maximum: number,
  pixelsPerSecond: number,
  elapsedMs: number
) {
  const position = Math.min(maximum, current + pixelsPerSecond * elapsedMs / 1000)
  return { position, reachedEnd: position >= maximum }
}

export function shouldAdvanceChapter(
  deltaY: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  currentChapter: number,
  chapterCount: number
) {
  return deltaY > 0
    && scrollTop + clientHeight >= scrollHeight - 1
    && currentChapter < chapterCount - 1
}
