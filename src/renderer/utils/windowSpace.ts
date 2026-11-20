const MIN_WIDTH = 392
const MIN_HEIGHT = 480
const ANIMATION_MS = 220

interface Size {
  width: number
  height: number
}

let holders = 0
let restoreSize: Size | null = null
let resizeFromUs = false

function setSize(width: number, height: number) {
  // 逐帧调用，单帧失败不该让整个动画抛错
  void window.desktop.setWindowSize(width, height).catch(() => undefined)
}

// 优先交给原生做窗口动画（macOS 的 AppKit 插值，一次调用即平滑）；
// 平台不支持时退回逐帧改尺寸
export async function animateWindowSize(targetWidth: number, targetHeight: number, duration = ANIMATION_MS) {
  const startWidth = window.innerWidth
  const startHeight = window.innerHeight
  if (startWidth === targetWidth && startHeight === targetHeight) return

  const native = await window.desktop.setWindowSizeAnimated(targetWidth, targetHeight).catch(() => false)
  if (native) return

  const started = performance.now()
  await new Promise<void>(resolve => {
    const step = () => {
      const progress = Math.min(1, (performance.now() - started) / duration)
      if (progress >= 1) {
        setSize(targetWidth, targetHeight)
        resolve()
        return
      }
      const eased = 1 - Math.pow(1 - progress, 3)
      setSize(
        Math.round(startWidth + (targetWidth - startWidth) * eased),
        Math.round(startHeight + (targetHeight - startHeight) * eased)
      )
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

export function isResizeFromUs() {
  return resizeFromUs
}

function markResizeFromUs() {
  resizeFromUs = true
  window.setTimeout(() => {
    resizeFromUs = false
  }, 400)
}

// 面板/弹层需要完整空间时调用；多个 UI 同时占用也不会提前缩回
export async function acquireWindowSpace() {
  holders += 1
  if (restoreSize) return

  const width = window.innerWidth
  const height = window.innerHeight
  if (width >= MIN_WIDTH && height >= MIN_HEIGHT) return

  restoreSize = { width, height }
  markResizeFromUs()
  await animateWindowSize(Math.max(width, MIN_WIDTH), Math.max(height, MIN_HEIGHT))
}

export async function releaseWindowSpace() {
  holders = Math.max(0, holders - 1)
  if (holders > 0 || !restoreSize) return

  const target = restoreSize
  restoreSize = null
  markResizeFromUs()
  await animateWindowSize(target.width, target.height)
}

// 用户自己拖动了窗口，说明不需要再还原
export function dropWindowSpaceRestore() {
  restoreSize = null
}

// 仅供测试：清掉模块级计数，避免用例之间互相影响
export function resetWindowSpaceForTests() {
  holders = 0
  restoreSize = null
  resizeFromUs = false
}
