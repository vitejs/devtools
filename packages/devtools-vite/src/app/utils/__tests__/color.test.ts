import { beforeEach, describe, expect, it } from 'vitest'
import { isDark } from '../../composables/dark'
import { getHashColorFromString, getHsla, getPluginColor, predefinedColorMap } from '../color'

describe('getHashColorFromString', () => {
  it('should get the same color with the same string', () => {
    expect(getHashColorFromString('Vite')).toBe(getHashColorFromString('Vite'))
  })
  it('should get different colors with different strings', () => {
    expect(getHashColorFromString('Vite')).not.toBe(getHashColorFromString('Devtools'))
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

describe('getPluginColor', () => {
  it('should use predefinedColorMap with known name', () => {
    for (const name in predefinedColorMap) {
      if (Object.prototype.hasOwnProperty.call(predefinedColorMap, name)
        && name === name.replace(/[^a-z]+/gi, '').toLowerCase()) {
        if (typeof predefinedColorMap[name] === 'number') {
          expect(getPluginColor(`8080-=(🤔)${name}`)).toBe(getHsla(predefinedColorMap[name]))
        }
      }
    }
  })

  it('should use getHashColorFromString with unknown name', () => {
    expect(getPluginColor('😄Foo')).toBe(getHashColorFromString('foo'))
  })
})
