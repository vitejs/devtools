export const DETECT_MARGIN = 100
export const DEFAULT_GAP = 10
export const VIEWPORT_MARGIN = 8

export type FloatingAlign = 'top' | 'bottom' | 'left' | 'right'

export interface FloatingAnchorRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ResolveFloatingPositionOptions {
  rect: FloatingAnchorRect
  viewportWidth: number
  viewportHeight: number
  panelWidth?: number
  panelHeight?: number
  gap?: number
  placement?: FloatingAlign
}

export interface ResolvedFloatingPosition {
  align: FloatingAlign
  style: Record<string, string>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(max, min))
}

export function resolveFloatingPosition(options: ResolveFloatingPositionOptions): ResolvedFloatingPosition {
  const {
    rect,
    viewportWidth: vw,
    viewportHeight: vh,
    panelWidth = 0,
    panelHeight = 0,
    gap = DEFAULT_GAP,
    placement,
  } = options

  const anchorRight = rect.left + rect.width
  const anchorBottom = rect.top + rect.height

  let align: FloatingAlign = 'bottom'
  if (placement)
    align = placement
  else if (rect.left < DETECT_MARGIN)
    align = 'right'
  else if (anchorRight > vw - DETECT_MARGIN)
    align = 'left'
  else if (rect.top < DETECT_MARGIN)
    align = 'bottom'
  else if (anchorBottom > vh - DETECT_MARGIN)
    align = 'top'

  if (!placement && panelWidth && panelHeight) {
    if (align === 'bottom' && anchorBottom + gap + panelHeight > vh - VIEWPORT_MARGIN && rect.top - gap - panelHeight >= VIEWPORT_MARGIN)
      align = 'top'
    else if (align === 'top' && rect.top - gap - panelHeight < VIEWPORT_MARGIN && anchorBottom + gap + panelHeight <= vh - VIEWPORT_MARGIN)
      align = 'bottom'
    else if (align === 'right' && anchorRight + gap + panelWidth > vw - VIEWPORT_MARGIN && rect.left - gap - panelWidth >= VIEWPORT_MARGIN)
      align = 'left'
    else if (align === 'left' && rect.left - gap - panelWidth < VIEWPORT_MARGIN && anchorRight + gap + panelWidth <= vw - VIEWPORT_MARGIN)
      align = 'right'
  }

  const style: Record<string, string> = {}

  if (align === 'top' || align === 'bottom') {
    if (align === 'bottom')
      style.top = `${anchorBottom + gap}px`
    else
      style.bottom = `${vh - rect.top + gap}px`

    if (panelWidth) {
      style.left = `${clamp(rect.left + rect.width / 2 - panelWidth / 2, VIEWPORT_MARGIN, vw - panelWidth - VIEWPORT_MARGIN)}px`
    }
    else {
      style.left = `${rect.left + rect.width / 2}px`
      style.transform = 'translateX(-50%)'
    }
  }
  else {
    if (align === 'right')
      style.left = `${anchorRight + gap}px`
    else
      style.right = `${vw - rect.left + gap}px`

    if (panelHeight) {
      style.top = `${clamp(rect.top + rect.height / 2 - panelHeight / 2, VIEWPORT_MARGIN, vh - panelHeight - VIEWPORT_MARGIN)}px`
    }
    else {
      style.top = `${rect.top + rect.height / 2}px`
      style.transform = 'translateY(-50%)'
    }
  }

  return { align, style }
}
