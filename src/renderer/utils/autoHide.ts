export const shouldAutoHide = (
  enabled: boolean,
  hasOpenOverlay: boolean,
  isResizing = false
) => enabled && !hasOpenOverlay && !isResizing
