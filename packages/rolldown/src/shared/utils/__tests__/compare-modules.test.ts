import type { SessionCompareModuleDiff } from '../../types'
import { describe, expect, it } from 'vitest'
import { filterComparedModules, getComparedModuleCount } from '../compare-modules'

function moduleDiff(key: string, overrides: Partial<SessionCompareModuleDiff> = {}): SessionCompareModuleDiff {
  return {
    key,
    name: key,
    status: 'unchanged',
    previousId: key,
    currentId: key,
    previous: 42,
    current: 42,
    delta: 0,
    deltaRatio: 0,
    previousChunks: ['main'],
    currentChunks: ['main'],
    previousChunkKeys: ['name:main'],
    currentChunkKeys: ['name:main'],
    moved: false,
    ...overrides,
  }
}

describe('compared module membership', () => {
  const stable = moduleDiff('stable.js', { package: '@example/shared' })
  const moved = moduleDiff('moved.js', {
    status: 'changed',
    currentChunks: ['lazy'],
    currentChunkKeys: ['name:lazy'],
    moved: true,
  })

  const added = moduleDiff('added.js', {
    status: 'added',
    previousId: undefined,
    previousChunks: [],
    previousChunkKeys: [],
    previous: 0,
    delta: 42,
    deltaRatio: null,
  })
  const removed = moduleDiff('removed.js', {
    status: 'removed',
    currentId: undefined,
    currentChunks: [],
    currentChunkKeys: [],
    current: 0,
    delta: -42,
    deltaRatio: -1,
  })

  it('keeps unchanged members searchable and matches moved members in either chunk', () => {
    const modules = [stable, moved, added, removed]
    expect(filterComparedModules(modules, { chunk: 'name:main', search: ' STABLE ' })).toEqual([stable])
    expect(filterComparedModules(modules, { chunk: 'name:main', search: '@EXAMPLE/SHARED' })).toEqual([stable])
    expect(filterComparedModules(modules, { chunk: 'name:main', search: '' })).toEqual([stable, moved, added, removed])
    expect(filterComparedModules(modules, { chunk: 'name:lazy', search: '' })).toEqual([moved])
    expect(filterComparedModules(modules, { chunk: 'name:missing', search: '' })).toEqual([])
    expect(filterComparedModules(modules, { search: '' })).toEqual(modules)
  })

  it('counts members on the side where they are present', () => {
    expect(getComparedModuleCount([stable, added], 0)).toBe(1)
    expect(getComparedModuleCount([stable, added], 1)).toBe(2)
    expect(getComparedModuleCount([stable, removed], 0)).toBe(2)
    expect(getComparedModuleCount([stable, removed], 1)).toBe(1)
    expect(getComparedModuleCount(undefined, 0)).toBe(0)
  })
})
