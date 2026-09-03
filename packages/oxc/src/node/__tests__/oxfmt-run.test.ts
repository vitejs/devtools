import { describe, expect, it } from 'vitest'
import { getOxfmtFormatCommand } from '../rpc/functions/oxfmt-run'

describe('getOxfmtFormatCommand', () => {
  it('uses Vite+ first, then the detected package manager', () => {
    expect(getOxfmtFormatCommand('pnpm', false, true)).toEqual({
      command: 'vp',
      args: ['fmt', '--check'],
    })
    expect(getOxfmtFormatCommand('pnpm', true, false)).toEqual({
      command: 'pnpm',
      args: ['exec', 'oxfmt', '--write'],
    })
  })
})
