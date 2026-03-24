import type { WhenContext } from './when'
import { describe, expect, it } from 'vitest'
import { evaluateWhen, getContextValue } from './when'

describe('evaluateWhen', () => {
  const ctx: WhenContext = {
    clientType: 'embedded',
    dockOpen: true,
    paletteOpen: false,
    dockSelectedId: 'my-dock',
  }

  describe('literal booleans', () => {
    it('evaluates "true" literal', () => {
      expect(evaluateWhen('true', ctx)).toBe(true)
    })

    it('evaluates "false" literal', () => {
      expect(evaluateWhen('false', ctx)).toBe(false)
    })

    it('evaluates "!true" to false', () => {
      expect(evaluateWhen('!true', ctx)).toBe(false)
    })

    it('evaluates "!false" to true', () => {
      expect(evaluateWhen('!false', ctx)).toBe(true)
    })

    it('supports "true" in AND expressions', () => {
      expect(evaluateWhen('true && dockOpen', ctx)).toBe(true)
      expect(evaluateWhen('true && paletteOpen', ctx)).toBe(false)
    })

    it('supports "false" in OR expressions', () => {
      expect(evaluateWhen('false || dockOpen', ctx)).toBe(true)
      expect(evaluateWhen('false || paletteOpen', ctx)).toBe(false)
    })
  })

  describe('bare truthy', () => {
    it('evaluates true for truthy values', () => {
      expect(evaluateWhen('dockOpen', ctx)).toBe(true)
    })

    it('evaluates false for falsy values', () => {
      expect(evaluateWhen('paletteOpen', ctx)).toBe(false)
    })

    it('evaluates true for non-empty string', () => {
      expect(evaluateWhen('dockSelectedId', ctx)).toBe(true)
    })

    it('evaluates false for undefined keys', () => {
      expect(evaluateWhen('unknownKey', ctx)).toBe(false)
    })
  })

  describe('negation (!)', () => {
    it('negates truthy to false', () => {
      expect(evaluateWhen('!dockOpen', ctx)).toBe(false)
    })

    it('negates falsy to true', () => {
      expect(evaluateWhen('!paletteOpen', ctx)).toBe(true)
    })

    it('negates undefined to true', () => {
      expect(evaluateWhen('!unknownKey', ctx)).toBe(true)
    })
  })

  describe('equality (==)', () => {
    it('matches string values', () => {
      expect(evaluateWhen('clientType == embedded', ctx)).toBe(true)
    })

    it('rejects non-matching string values', () => {
      expect(evaluateWhen('clientType == standalone', ctx)).toBe(false)
    })

    it('compares boolean as string', () => {
      expect(evaluateWhen('dockOpen == true', ctx)).toBe(true)
      expect(evaluateWhen('dockOpen == false', ctx)).toBe(false)
    })

    it('matches dockSelectedId', () => {
      expect(evaluateWhen('dockSelectedId == my-dock', ctx)).toBe(true)
      expect(evaluateWhen('dockSelectedId == other-dock', ctx)).toBe(false)
    })
  })

  describe('inequality (!=)', () => {
    it('true when values differ', () => {
      expect(evaluateWhen('clientType != standalone', ctx)).toBe(true)
    })

    it('false when values match', () => {
      expect(evaluateWhen('clientType != embedded', ctx)).toBe(false)
    })
  })

  describe('aND (&&)', () => {
    it('true when all parts are true', () => {
      expect(evaluateWhen('dockOpen && !paletteOpen', ctx)).toBe(true)
    })

    it('false when any part is false', () => {
      expect(evaluateWhen('dockOpen && paletteOpen', ctx)).toBe(false)
    })

    it('supports three-part AND', () => {
      expect(evaluateWhen('dockOpen && !paletteOpen && clientType == embedded', ctx)).toBe(true)
      expect(evaluateWhen('dockOpen && !paletteOpen && clientType == standalone', ctx)).toBe(false)
    })
  })

  describe('oR (||)', () => {
    it('true when any part is true', () => {
      expect(evaluateWhen('paletteOpen || dockOpen', ctx)).toBe(true)
    })

    it('false when all parts are false', () => {
      expect(evaluateWhen('paletteOpen || !dockOpen', ctx)).toBe(false)
    })

    it('supports mixed AND and OR (OR of ANDs)', () => {
      expect(evaluateWhen('paletteOpen && clientType == standalone || dockOpen', ctx)).toBe(true)
    })
  })

  describe('with empty dockSelectedId', () => {
    const emptyCtx: WhenContext = {
      clientType: 'standalone',
      dockOpen: false,
      paletteOpen: true,
      dockSelectedId: '',
    }

    it('empty string is falsy', () => {
      expect(evaluateWhen('dockSelectedId', emptyCtx)).toBe(false)
    })

    it('negation of empty string is true', () => {
      expect(evaluateWhen('!dockSelectedId', emptyCtx)).toBe(true)
    })
  })

  describe('with custom context variables', () => {
    const customCtx: WhenContext = {
      clientType: 'embedded',
      dockOpen: true,
      paletteOpen: false,
      dockSelectedId: '',
      myPluginActive: true,
      myPluginMode: 'debug',
    }

    it('evaluates custom boolean', () => {
      expect(evaluateWhen('myPluginActive', customCtx)).toBe(true)
      expect(evaluateWhen('!myPluginActive', customCtx)).toBe(false)
    })

    it('evaluates custom string equality', () => {
      expect(evaluateWhen('myPluginMode == debug', customCtx)).toBe(true)
      expect(evaluateWhen('myPluginMode == release', customCtx)).toBe(false)
    })
  })
})

describe('getContextValue', () => {
  const ctx: WhenContext = {
    clientType: 'embedded',
    dockOpen: true,
    paletteOpen: false,
    dockSelectedId: '',
  }

  it('returns the value for a known key', () => {
    expect(getContextValue('clientType', ctx)).toBe('embedded')
    expect(getContextValue('dockOpen', ctx)).toBe(true)
  })

  it('returns undefined for an unknown key', () => {
    expect(getContextValue('nonExistent', ctx)).toBeUndefined()
  })
})
