import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { collectAllKeybindings, formatKeybinding, KNOWN_BROWSER_SHORTCUTS, normalizeKeyEvent } from '../keybindings'

describe('formatKeybinding', () => {
  it('splits key string into parts', () => {
    expect(formatKeybinding('A')).toEqual(['A'])
  })

  it('formats modifier keys', () => {
    const result = formatKeybinding('Mod+Shift+K')
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
