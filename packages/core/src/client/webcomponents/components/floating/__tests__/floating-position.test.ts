import { describe, expect, it } from 'vitest'
import { resolveFloatingPosition } from '../floating-position'

const VW = 1280
const VH = 720

interface RectInit {
  left: number
  top: number
  width?: number
  height?: number
}

function resolve(rect: RectInit, extra: Partial<Parameters<typeof resolveFloatingPosition>[0]> = {}) {
  return resolveFloatingPosition({
    rect: { width: 40, height: 40, ...rect },
    viewportWidth: VW,
    viewportHeight: VH,
    ...extra,
  })
}

describe('alignment guess', () => {
  it('defaults to bottom for a mid-viewport anchor', () => {
    const { align, style } = resolve({ left: 600, top: 300 })
    expect(align).toBe('bottom')
    expect(style.top).toBe('350px')
  })

  it('prefers right when the anchor hugs the left edge', () => {
    expect(resolve({ left: 20, top: 300 }).align).toBe('right')
  })

  it('prefers left when the anchor hugs the right edge', () => {
    expect(resolve({ left: 1230, top: 300 }).align).toBe('left')
  })

  it('prefers top when the anchor hugs the bottom edge', () => {
    expect(resolve({ left: 600, top: 660 }).align).toBe('top')
  })

  it('respects an explicit placement', () => {
    expect(resolve({ left: 600, top: 300 }, { placement: 'left' }).align).toBe('left')
  })
})

describe('cross-axis clamping', () => {
  it('clamps a wide panel against the right viewport edge', () => {
    const { align, style } = resolve({ left: 1100, top: 660 }, { panelWidth: 400, panelHeight: 100 })
    expect(align).toBe('top')
    expect(style.left).toBe(`${VW - 400 - 8}px`)
    expect(style.bottom).toBe('70px')
    expect(style.transform).toBeUndefined()
  })

  it('clamps a wide panel against the left viewport edge', () => {
    const { align, style } = resolve({ left: 110, top: 660 }, { panelWidth: 400, panelHeight: 100 })
    expect(align).toBe('top')
    expect(style.left).toBe('8px')
  })

  it('clamps a tall side panel against the bottom viewport edge', () => {
    const { align, style } = resolve({ left: 1230, top: 600 }, { panelWidth: 200, panelHeight: 240 })
    expect(align).toBe('left')
    expect(style.top).toBe(`${VH - 240 - 8}px`)
    expect(style.right).toBe('60px')
    expect(style.transform).toBeUndefined()
  })

  it('clamps a tall side panel against the top viewport edge', () => {
    const { align, style } = resolve({ left: 1230, top: 60 }, { panelWidth: 200, panelHeight: 240 })
    expect(align).toBe('left')
    expect(style.top).toBe('8px')
  })
})

describe('side flipping', () => {
  it('flips bottom → top when the panel cannot fit below', () => {
    const { align, style } = resolve({ left: 600, top: 480 }, { panelWidth: 200, panelHeight: 250 })
    expect(align).toBe('top')
    expect(style.bottom).toBe(`${VH - 480 + 10}px`)
  })

  it('keeps the guessed side when neither side fits', () => {
    const { align } = resolve({ left: 600, top: 480 }, { panelWidth: 200, panelHeight: 800 })
    expect(align).toBe('bottom')
  })

  it('never flips an explicit placement', () => {
    const { align } = resolve({ left: 600, top: 480 }, { placement: 'bottom', panelWidth: 200, panelHeight: 250 })
    expect(align).toBe('bottom')
  })
})

describe('first paint (panel size not yet measured)', () => {
  it('falls back to CSS centering below the anchor', () => {
    const { style } = resolve({ left: 600, top: 300 })
    expect(style.left).toBe('620px')
    expect(style.transform).toBe('translateX(-50%)')
  })

  it('falls back to CSS centering beside the anchor', () => {
    const { align, style } = resolve({ left: 20, top: 300 })
    expect(align).toBe('right')
    expect(style.left).toBe('70px')
    expect(style.top).toBe('320px')
    expect(style.transform).toBe('translateY(-50%)')
  })
})
