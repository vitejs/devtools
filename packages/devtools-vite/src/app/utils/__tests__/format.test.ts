import type { ModuleDest, ModuleTreeNode } from '../../../shared/types/data'
import { describe, expect, it } from 'vitest'
import { bytesToHumanSize, getContentByteSize, toTree } from '../format'

describe('bytesToHumanSize', () => {
  it('should return raw bytes (<1024)', () => {
    expect(bytesToHumanSize(10)).toEqual([10, 'B'])
  })

  it('should return kb with proper digits', () => {
    expect(bytesToHumanSize(1024)).toEqual(['1', 'KB'])
    expect(bytesToHumanSize(1024 * 1.5)).toEqual(['1.5', 'KB'])
    expect(bytesToHumanSize(1024 * 1.666, 1)).toEqual(['1.7', 'KB'])
  })

  it('should return mb with proper digits', () => {
    expect(bytesToHumanSize(1024 * 1024)).toEqual(['1', 'MB'])
    expect(bytesToHumanSize(1024 * 1024 * 1.5)).toEqual(['1.5', 'MB'])
    expect(bytesToHumanSize(1024 * 1024 * 1.666, 1)).toEqual(['1.7', 'MB'])
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
