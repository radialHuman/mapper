import type { CSSProperties } from 'react'
import type { OverlayStyle } from '../../utils/overlayStyleUtils'
import { DEFAULT_OVERLAY_STYLE, clampOpacity } from '../../utils/overlayStyleUtils'

type StylePanelProps = {
  overlayStyle: OverlayStyle
  onSetOverlayStyle: (updater: (old: OverlayStyle) => OverlayStyle) => void
}

export function StylePanel({ overlayStyle, onSetOverlayStyle }: StylePanelProps) {
  return (
    <section className="panel">
      <h2>Style</h2>
      <label>
        Floating Buttons Transparency ({overlayStyle.floatingOpacity.toFixed(2)})
        <input
          type="range"
          min="0.15"
          max="0.95"
          step="0.01"
          value={overlayStyle.floatingOpacity}
          onChange={(event) => {
            const value = Number(event.target.value)
            onSetOverlayStyle((old) => ({ ...old, floatingOpacity: clampOpacity(value) }))
          }}
        />
      </label>
      <label>
        Sidebar Transparency ({overlayStyle.sidebarOpacity.toFixed(2)})
        <input
          type="range"
          min="0.15"
          max="0.95"
          step="0.01"
          value={overlayStyle.sidebarOpacity}
          onChange={(event) => {
            const value = Number(event.target.value)
            onSetOverlayStyle((old) => ({ ...old, sidebarOpacity: clampOpacity(value) }))
          }}
        />
      </label>
      <label>
        Top Chip Transparency ({overlayStyle.chipOpacity.toFixed(2)})
        <input
          type="range"
          min="0.15"
          max="0.95"
          step="0.01"
          value={overlayStyle.chipOpacity}
          onChange={(event) => {
            const value = Number(event.target.value)
            onSetOverlayStyle((old) => ({ ...old, chipOpacity: clampOpacity(value) }))
          }}
        />
      </label>
      <button type="button" onClick={() => onSetOverlayStyle(() => DEFAULT_OVERLAY_STYLE)}>
        Reset Style
      </button>
    </section>
  )
}
