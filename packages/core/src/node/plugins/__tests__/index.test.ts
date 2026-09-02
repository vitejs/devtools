import { isPackageExists } from 'local-pkg'
import { resolve } from 'pathe'
import { describe, expect, it, vi } from 'vitest'
import { DevTools } from '../index'

vi.mock('local-pkg', () => ({
  isPackageExists: vi.fn(() => false),
}))

describe('devTools', () => {
  it('resolves optional integrations from the configured project directory', async () => {
    const cwd = 'project/root'
    const resolvedCwd = resolve(cwd)

    await DevTools({ cwd })

    expect(vi.mocked(isPackageExists)).toHaveBeenCalledTimes(4)
    expect(vi.mocked(isPackageExists).mock.calls).toEqual([
      ['@vitejs/devtools-rolldown', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-vite', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-vitest', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-oxc', { paths: [resolvedCwd] }],
    ])
  })
})
