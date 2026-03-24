import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'
import type { WhenContext } from '../keybindings'
import { describe, expect, it } from 'vitest'
import { collectAllKeybindings, evaluateWhen, formatKeybinding, KNOWN_BROWSER_SHORTCUTS, normalizeKeyEvent } from '../keybindings'

describe('formatKeybinding', () => {
  it('splits key string into parts', () => {
    expect(formatKeybinding('A')).toEqual(['A'])
  })

  it('formats modifier keys', () => {
    const result = formatKeybinding('Mod+Shift+K')
    // Platform-dependent, but should have 3 parts
    expect(result).toHaveLength(3)
    expect(result[2]).toBe('K')
  })

  it('formats Alt modifier', () => {
    const result = formatKeybinding('Alt+N')
    expect(result).toHaveLength(2)
    expect(result[1]).toBe('N')
  })
})

describe('normalizeKeyEvent', () => {
  function makeKeyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      key: '',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...overrides,
    } as KeyboardEvent
  }

  it('normalizes a simple letter key', () => {
    const result = normalizeKeyEvent(makeKeyEvent({ key: 'k' }))
    expect(result).toBe('K')
  })

  it('ignores modifier-only events', () => {
    const result = normalizeKeyEvent(makeKeyEvent({ key: 'Control', ctrlKey: true }))
    // On non-Mac, ctrlKey maps to Mod; key is Control which is filtered out
    expect(result).toMatch(/^(Mod|Ctrl)?$/)
  })

  it('normalizes Shift+letter', () => {
    const result = normalizeKeyEvent(makeKeyEvent({ key: 'K', shiftKey: true }))
    expect(result).toBe('Shift+K')
  })

  it('normalizes Alt+key', () => {
    const result = normalizeKeyEvent(makeKeyEvent({ key: 'n', altKey: true }))
    expect(result).toBe('Alt+N')
  })
})

describe('evaluateWhen', () => {
  const ctx: WhenContext = {
    clientType: 'embedded',
    dockOpen: true,
    paletteOpen: false,
    dockSelectedId: 'my-dock',
  }

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
      // paletteOpen=false, so first branch fails; dockOpen=true, so second branch succeeds
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

describe('collectAllKeybindings', () => {
  it('collects from top-level and children', () => {
    const commands = {
      value: [
        {
          id: 'cmd1',
          source: 'client' as const,
          title: 'Cmd 1',
          keybindings: [{ key: 'Mod+K' }],
          children: [
            {
              id: 'cmd1:child',
              source: 'client' as const,
              title: 'Child',
              keybindings: [{ key: 'Mod+L' }],
            },
          ],
        },
        {
          id: 'cmd2',
          source: 'client' as const,
          title: 'Cmd 2',
          keybindings: [],
        },
      ] as DevToolsCommandEntry[],
    }

    const getKeybindings = (id: string): DevToolsCommandKeybinding[] => {
      if (id === 'cmd1')
        return [{ key: 'Mod+K' }]
      if (id === 'cmd1:child')
        return [{ key: 'Mod+L' }]
      return []
    }

    const result = collectAllKeybindings(commands, getKeybindings)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'cmd1', keybinding: { key: 'Mod+K' } })
    expect(result[1]).toEqual({ id: 'cmd1:child', keybinding: { key: 'Mod+L' } })
  })

  it('returns empty array for commands without keybindings', () => {
    const commands = {
      value: [
        { id: 'cmd1', source: 'client' as const, title: 'Cmd 1' },
      ] as DevToolsCommandEntry[],
    }
    const result = collectAllKeybindings(commands, () => [])
    expect(result).toHaveLength(0)
  })
})

describe('kNOWN_BROWSER_SHORTCUTS', () => {
  it('has descriptions for all entries', () => {
    for (const [key, description] of Object.entries(KNOWN_BROWSER_SHORTCUTS)) {
      expect(key).toBeTruthy()
      expect(typeof description).toBe('string')
      expect(description.length).toBeGreaterThan(0)
    }
  })

  it('includes common shortcuts', () => {
    expect(KNOWN_BROWSER_SHORTCUTS['Mod+T']).toBe('Open new tab')
    expect(KNOWN_BROWSER_SHORTCUTS['Mod+W']).toBe('Close tab')
    expect(KNOWN_BROWSER_SHORTCUTS['Mod+F']).toBe('Find in page')
  })
})
