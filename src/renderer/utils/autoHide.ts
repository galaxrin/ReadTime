export const shouldAutoHide = (
  enabled: boolean,
  hasOpenOverlay: boolean,
  isResizing = false,
  autoScrolling = false
) => enabled && !hasOpenOverlay && !isResizing && !autoScrolling
