import type { ModuleDest, ModuleTreeNode } from '../format'
import { describe, expect, it } from 'vitest'
import { bytesToHumanSize, formatDuration, getContentByteSize, toTree } from '../format'

describe('formatDuration', () => {
  it('should return a placeholder for null/undefined', () => {
    expect(formatDuration(null)).toEqual(['', '-'])
    expect(formatDuration(undefined)).toEqual(['', '-'])
  })

  it('should format sub-millisecond durations', () => {
    expect(formatDuration(0.5)).toEqual(['<1', 'ms'])
  })

  it('should format millisecond durations', () => {
    expect(formatDuration(500)).toEqual(['500', 'ms'])
  })

  it('should format second durations', () => {
    expect(formatDuration(1500)).toEqual(['1.5', 's'])
  })

  it('should format minute durations', () => {
    expect(formatDuration(90000)).toEqual(['1.5', 'min'])
  })

  it('should stringify when requested', () => {
    expect(formatDuration(500, true)).toBe('500 ms')
  })
})

describe('bytesToHumanSize', () => {
  it('should return raw bytes (<1000)', () => {
    expect(bytesToHumanSize(10)).toEqual([10, 'B'])
  })

  it('should return kb with proper digits', () => {
    expect(bytesToHumanSize(1000)).toEqual(['1', 'kB'])
    expect(bytesToHumanSize(1000 * 1.5)).toEqual(['1.5', 'kB'])
    expect(bytesToHumanSize(1000 * 1.666, 1)).toEqual(['1.7', 'kB'])
  })

  it('should return mb with proper digits', () => {
    expect(bytesToHumanSize(1000 * 1000)).toEqual(['1', 'MB'])
    expect(bytesToHumanSize(1000 * 1000 * 1.5)).toEqual(['1.5', 'MB'])
    expect(bytesToHumanSize(1000 * 1000 * 1.666, 1)).toEqual(['1.7', 'MB'])
  })

  it('should not throw for 0 bytes', () => {
    expect(bytesToHumanSize(0)).toEqual([0, 'B'])
  })

  // larger...
})

describe('getContentByteSize', () => {
  it('should return 0 with empty string', () => {
    expect(getContentByteSize('')).toBe(0)
  })

  it('should return bytes', () => {
    expect(getContentByteSize('vite')).toBe(4)
  })
})

describe('toTree', () => {
  it('should work with empty modules', () => {
    expect(toTree([], 'Root')).toEqual({
      name: 'Root',
      children: {},
      items: [],
    })
  })

  it('should work', () => {
    const modules: ModuleDest[] = [
      {
        full: '/path/to/project/dist/src/components/Button.js',
        path: 'src/components/Button.js',
      },
      {
        full: '/path/to/project/dist/src/utils/helper.js',
        path: 'src/utils/helper.js',
      },
      {
        full: '/path/to/project/dist/index.js',
        path: 'index.js',
      },
    ]

    expect(toTree(modules, 'Root')).toEqual({
      name: 'Root',
      children: {
        src: {
          name: 'src',
          children: {
            components: {
              name: 'components',
              children: {},
              items: [
                {
                  full: '/path/to/project/dist/src/components/Button.js',
                  path: 'src/components/Button.js',
                },
              ],
            },
            utils: {
              name: 'utils',
              children: {},
              items: [
                {
                  full: '/path/to/project/dist/src/utils/helper.js',
                  path: 'src/utils/helper.js',
                },
              ],
            },
          },
          items: [],
        },
      },
      items: [
        {
          full: '/path/to/project/dist/index.js',
          path: 'index.js',
        },
      ],
    } satisfies ModuleTreeNode)
  })
})
