import { isDark } from '@vitejs/devtools-ui/composables/dark'
import { beforeEach, describe, expect, it } from 'vitest'
import { getHashColorFromString, getHsla } from '../color'

describe('getHashColorFromString', () => {
  it('should get the same color with the same string', () => {
    expect(getHashColorFromString('Vite')).toBe(getHashColorFromString('Vite'))
  })
  it('should get different colors with different strings', () => {
    expect(getHashColorFromString('Vite')).not.toBe(getHashColorFromString('DevTools'))
  })
})

describe('getHsla', () => {
  beforeEach(() => {
    isDark.value = false
  })

  it('light mode with default opacity', () => {
    expect(getHsla(180)).toBe('hsla(180, 65%, 40%, 1)')
  })

  it('light mode with custom opacity', () => {
    expect(getHsla(180, 0.5)).toBe('hsla(180, 65%, 40%, 0.5)')
  })

  it('dark mode with default opacity', () => {
    isDark.value = true
    expect(getHsla(180)).toBe('hsla(180, 50%, 60%, 1)')
  })

  it('dark mode with custom opacity', () => {
    isDark.value = true
    expect(getHsla(180, 0.8)).toBe('hsla(180, 50%, 60%, 0.8)')
  })
})
