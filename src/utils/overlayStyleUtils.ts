export type OverlayStyle = {
  floatingOpacity: number
  sidebarOpacity: number
  chipOpacity: number
}

export const OVERLAY_STYLE_KEY = 'mapper.overlay-style.v1'
export const DEFAULT_OVERLAY_STYLE: OverlayStyle = {
  floatingOpacity: 0.64,
  sidebarOpacity: 0.46,
  chipOpacity: 0.5,
}

export function clampOpacity(value: number): number {
  return Math.min(0.95, Math.max(0.15, Number.isFinite(value) ? value : 0.5))
}

export function loadOverlayStyle(): OverlayStyle {
  try {
    const raw = localStorage.getItem(OVERLAY_STYLE_KEY)
    if (!raw) {
      return DEFAULT_OVERLAY_STYLE
    }

    const parsed = JSON.parse(raw) as Partial<OverlayStyle>
    return {
      floatingOpacity: clampOpacity(parsed.floatingOpacity ?? DEFAULT_OVERLAY_STYLE.floatingOpacity),
      sidebarOpacity: clampOpacity(parsed.sidebarOpacity ?? DEFAULT_OVERLAY_STYLE.sidebarOpacity),
      chipOpacity: clampOpacity(parsed.chipOpacity ?? DEFAULT_OVERLAY_STYLE.chipOpacity),
    }
  } catch {
    return DEFAULT_OVERLAY_STYLE
  }
}
