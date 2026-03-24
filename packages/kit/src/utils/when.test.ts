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

  describe('namespaced keys (dot separator)', () => {
    const nsCtx: WhenContext = {
      'clientType': 'embedded',
      'dockOpen': true,
      'paletteOpen': false,
      'dockSelectedId': '',
      'vite.mode': 'development',
    }

    it('resolves flat namespaced key via exact match', () => {
      expect(evaluateWhen('vite.mode == development', nsCtx)).toBe(true)
      expect(evaluateWhen('vite.mode == production', nsCtx)).toBe(false)
    })

    it('bare truthy on flat namespaced key', () => {
      expect(evaluateWhen('vite.mode', nsCtx)).toBe(true)
      expect(evaluateWhen('vite.unknown', nsCtx)).toBe(false)
    })

    it('negation on flat namespaced key', () => {
      expect(evaluateWhen('!vite.mode', nsCtx)).toBe(false)
      expect(evaluateWhen('!vite.unknown', nsCtx)).toBe(true)
    })
  })

  describe('namespaced keys (colon separator)', () => {
    const nsCtx: WhenContext = {
      'clientType': 'embedded',
      'dockOpen': true,
      'paletteOpen': false,
      'dockSelectedId': '',
      'vite:buildMode': 'lib',
    }

    it('resolves colon-namespaced key via exact match', () => {
      expect(evaluateWhen('vite:buildMode == lib', nsCtx)).toBe(true)
      expect(evaluateWhen('vite:buildMode == app', nsCtx)).toBe(false)
    })

    it('bare truthy on colon-namespaced key', () => {
      expect(evaluateWhen('vite:buildMode', nsCtx)).toBe(true)
    })
  })

  describe('namespaced keys (nested objects)', () => {
    const nestedCtx: WhenContext = {
      clientType: 'embedded',
      dockOpen: true,
      paletteOpen: false,
      dockSelectedId: '',
      vite: { mode: 'development', ssr: true },
    }

    it('resolves nested object via dot path', () => {
      expect(evaluateWhen('vite.mode == development', nestedCtx)).toBe(true)
      expect(evaluateWhen('vite.ssr', nestedCtx)).toBe(true)
      expect(evaluateWhen('!vite.ssr', nestedCtx)).toBe(false)
    })

    it('returns undefined for missing nested path', () => {
      expect(evaluateWhen('vite.missing', nestedCtx)).toBe(false)
      expect(evaluateWhen('!vite.missing', nestedCtx)).toBe(true)
    })
  })

  describe('namespaced keys in compound expressions', () => {
    const nsCtx: WhenContext = {
      'clientType': 'embedded',
      'dockOpen': true,
      'paletteOpen': false,
      'dockSelectedId': '',
      'vite.mode': 'development',
    }

    it('aND with namespaced key', () => {
      expect(evaluateWhen('dockOpen && vite.mode == development', nsCtx)).toBe(true)
      expect(evaluateWhen('paletteOpen && vite.mode == development', nsCtx)).toBe(false)
    })

    it('oR with namespaced key', () => {
      expect(evaluateWhen('paletteOpen || vite.mode == development', nsCtx)).toBe(true)
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

  describe('namespaced keys', () => {
    it('exact match takes priority over nested path', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        'vite.mode': 'flat-value',
        'vite': { mode: 'nested-value' },
      }
      expect(getContextValue('vite.mode', nsCtx)).toBe('flat-value')
    })

    it('falls back to nested path when no exact match', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        vite: { mode: 'nested-value' },
      }
      expect(getContextValue('vite.mode', nsCtx)).toBe('nested-value')
    })

    it('resolves colon-separated keys via exact match', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        'vite:mode': 'colon-value',
      }
      expect(getContextValue('vite:mode', nsCtx)).toBe('colon-value')
    })

    it('resolves colon-separated keys via nested path', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        vite: { mode: 'nested-value' },
      }
      expect(getContextValue('vite:mode', nsCtx)).toBe('nested-value')
    })

    it('returns undefined for missing nested path', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        vite: { mode: 'value' },
      }
      expect(getContextValue('vite.missing', nsCtx)).toBeUndefined()
    })

    it('handles deeply nested paths', () => {
      const nsCtx: WhenContext = {
        ...ctx,
        plugin: { config: { debug: true } },
      }
      expect(getContextValue('plugin.config.debug', nsCtx)).toBe(true)
      expect(getContextValue('plugin.config.missing', nsCtx)).toBeUndefined()
    })
  })
})
