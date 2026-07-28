export function splitSentences(text: string): string[] {
  return text.match(/[^。！？.!?\n]+[。！？.!?]+|[^\n。！？.!?]+(?=\n|$)|\n/g) || []
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
