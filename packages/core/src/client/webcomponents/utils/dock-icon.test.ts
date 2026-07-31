import { describe, expect, it } from 'vitest'
import { resolveDockIcon } from './dock-icon'

describe('dock icon resolution', () => {
  it('resolves server-hosted icons against the Devframe origin', () => {
    expect(resolveDockIcon('/__devtools-assets/vite.svg', 'http://localhost:5173'))
      .toBe('http://localhost:5173/__devtools-assets/vite.svg')
  })

  it('resolves light and dark server-hosted icons', () => {
    expect(resolveDockIcon({
      dark: '/__devtools-vite/favicon-dark.svg',
      light: '/__devtools-vite/favicon.svg',
    }, 'http://localhost:5173')).toEqual({
      dark: 'http://localhost:5173/__devtools-vite/favicon-dark.svg',
      light: 'http://localhost:5173/__devtools-vite/favicon.svg',
    })
  })

  it.each([
    'builtin:vite-plus-core',
    'ph:flask',
    'https://example.com/icon.svg',
    'data:image/svg+xml,<svg/>',
  ])('keeps non-relative icon %s unchanged', (icon) => {
    expect(resolveDockIcon(icon, 'http://localhost:5173')).toBe(icon)
  })
})
