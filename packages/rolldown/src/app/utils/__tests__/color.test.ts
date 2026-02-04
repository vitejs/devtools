import { getHashColorFromString, getHsla } from '@vitejs/devtools-ui/utils/color'
import { describe, expect, it } from 'vitest'
import { getPluginColor, predefinedColorMap } from '../color'

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
