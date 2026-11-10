import { isPackageExists } from 'local-pkg'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsBuiltin, resolveBuiltinOptions } from '../builtin'

vi.mock('local-pkg', () => ({
  isPackageExists: vi.fn(() => false),
}))

describe('resolveBuiltinOptions', () => {
  it('enables every panel by default and for `true`', () => {
    const expected = { terminals: true, messages: true, inspect: true, integrations: true }
    expect(resolveBuiltinOptions()).toEqual(expected)
    expect(resolveBuiltinOptions(true)).toEqual(expected)
    expect(resolveBuiltinOptions({})).toEqual(expected)
  })

  it('disables everything for `false`', () => {
    expect(resolveBuiltinOptions(false)).toBeUndefined()
  })

  it('keeps omitted panels enabled in the object form', () => {
    expect(resolveBuiltinOptions({ terminals: false }))
      .toEqual({ terminals: false, messages: true, inspect: true, integrations: true })
  })

  it('passes terminal options through', () => {
    expect(resolveBuiltinOptions({ terminals: { shell: '/bin/sh' } })?.terminals)
      .toEqual({ shell: '/bin/sh' })
  })
})

describe('devToolsBuiltin', () => {
  it('skips disabled integrations', async () => {
    vi.mocked(isPackageExists).mockClear()
    await DevToolsBuiltin({ builtinDevTools: { integrations: { vitest: false, oxc: false } } })

    expect(vi.mocked(isPackageExists).mock.calls.map(([pkg]) => pkg))
      .toEqual(['@vitejs/devtools-rolldown', '@vitejs/devtools-vite'])
  })

  it('skips every integration when disabled as a group', async () => {
    vi.mocked(isPackageExists).mockClear()
    await DevToolsBuiltin({ builtinDevTools: { integrations: false } })

    expect(vi.mocked(isPackageExists)).not.toHaveBeenCalled()
  })

  it('contributes nothing when disabled', async () => {
    expect(await DevToolsBuiltin({ builtinDevTools: false })).toEqual([])
  })
})
