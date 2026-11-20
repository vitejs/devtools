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
    previousChunks: ['before'],
    currentChunks: ['after'],
    previousChunkKeys: ['name:before'],
    currentChunkKeys: ['name:after'],
    moved: false,
    ...overrides,
  }
}

describe('compared module membership', () => {
  const modules = [
    moduleDiff('stable.js', { package: '@example/shared' }),
    moduleDiff('added.js', { status: 'added', previousId: undefined, previousChunkKeys: [] }),
    moduleDiff('removed.js', { status: 'removed', currentId: undefined, currentChunkKeys: [] }),
  ]

  it('keeps unchanged members searchable inside either side of a chunk filter', () => {
    expect(filterComparedModules(modules, { chunk: 'name:before', search: ' STABLE ' }).map(item => item.key)).toEqual(['stable.js'])
    expect(filterComparedModules(modules, { chunk: 'name:after', search: '@EXAMPLE/SHARED' }).map(item => item.key)).toEqual(['stable.js'])
    expect(filterComparedModules(modules, { chunk: 'name:after', search: '' }).map(item => item.key)).toEqual(['stable.js', 'added.js'])
    expect(filterComparedModules(modules, { chunk: 'name:missing', search: '' })).toEqual([])
    expect(filterComparedModules(modules, { search: '' })).toHaveLength(3)
  })

  it('counts each session member once without using the full module graph count', () => {
    expect(getComparedModuleCount(modules, 0)).toBe(2)
    expect(getComparedModuleCount(modules, 1)).toBe(2)
    expect(getComparedModuleCount(undefined, 0)).toBe(0)
  })
})
