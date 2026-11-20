import playIcon from '../../../assets/icons/play.svg?raw'
import pauseIcon from '../../../assets/icons/pause.svg?raw'

interface PlayPauseIconProps {
  playing: boolean
}

// 图标来自 Lucide（ISC 许可），assets/icons/ 下保留原始 SVG
export function PlayPauseIcon({ playing }: PlayPauseIconProps) {
  return (
    <span
      className="play-pause-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: playing ? pauseIcon : playIcon }}
    />
  )
}
