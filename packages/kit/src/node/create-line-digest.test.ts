import { describe, expect, it } from 'vitest'
import { createLineDigest } from './create-line-digest'

describe('createLineDigest', () => {
  it('tracks the latest non-empty line and reports only on change', () => {
    const digest = createLineDigest()
    expect(digest.push('building…\n')).toBe('building…')
    expect(digest.latest).toBe('building…')
    // A chunk whose only complete line repeats the current one is a no-op.
    expect(digest.push('building…\n')).toBeUndefined()
    expect(digest.push('done in 1.2s\n')).toBe('done in 1.2s')
  })

  it('joins a line split across chunks', () => {
    const digest = createLineDigest()
    expect(digest.push('resolving ')).toBe('resolving')
    // The unterminated tail continues; the completed line is the latest.
    expect(digest.push('deps\nbundling\n')).toBe('bundling')
    expect(digest.latest).toBe('bundling')
  })

  it('treats carriage returns as line breaks (progress repaints)', () => {
    const digest = createLineDigest()
    expect(digest.push('10%\r')).toBe('10%')
    expect(digest.push('55%\r99%\r')).toBe('99%')
  })

  it('strips ANSI escapes and trailing whitespace', () => {
    const digest = createLineDigest()
    expect(digest.push('\u001B[32mready\u001B[0m   \n')).toBe('ready')
  })

  it('ignores blank lines', () => {
    const digest = createLineDigest()
    expect(digest.push('\n\n   \n')).toBeUndefined()
    expect(digest.latest).toBe('')
  })
})
