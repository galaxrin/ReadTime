import { Menu, MenuItemConstructorOptions, nativeImage, Tray } from 'electron'

interface ToggleableWindow {
  toggle(): void
  reveal(): void
  isVisible(): boolean
  isAutoHidden(): boolean
}

export class MenuBarManager {
  private tray: Tray | null = null

  constructor(
    private window: ToggleableWindow,
    private quit: () => void,
    private iconPath: string
  ) {}

  create() {
    if (this.tray) return

    const icon = nativeImage.createFromPath(this.iconPath).resize({ width: 16, height: 16 })
    icon.setTemplateImage(true)
    this.tray = new Tray(icon)
    this.tray.setToolTip('ReadTime')
    this.tray.on('click', () => this.window.toggle())
    this.tray.on('right-click', () => this.tray?.popUpContextMenu(this.buildMenu()))
  }

  destroy() {
    this.tray?.destroy()
    this.tray = null
  }

  private buildMenu() {
    const shouldShow = !this.window.isVisible() || this.window.isAutoHidden()
    const template: MenuItemConstructorOptions[] = [
      {
        label: shouldShow ? '显示阅读窗口' : '隐藏阅读窗口',
        click: () => shouldShow ? this.window.reveal() : this.window.toggle()
      },
      { type: 'separator' },
      { label: '退出 ReadTime', click: this.quit }
    ]
    return Menu.buildFromTemplate(template)
  }
}
