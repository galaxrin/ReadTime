import settingsIcon from '../../../assets/icons/settings.svg?raw'
import libraryIcon from '../../../assets/icons/library.svg?raw'
import listIcon from '../../../assets/icons/list.svg?raw'

// 图标来自 Lucide（ISC 许可），原始 SVG 在 assets/icons/
function InlineIcon({ svg }: { svg: string }) {
  return <span className="app-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

export function SettingsIcon() {
  return <InlineIcon svg={settingsIcon} />
}

export function BookshelfIcon() {
  return <InlineIcon svg={libraryIcon} />
}

export function TocIcon() {
  return <InlineIcon svg={listIcon} />
}

