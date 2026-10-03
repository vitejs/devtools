import type { InspectedRule } from '@oxlint-config-inspector/core'
import { describe, expect, it } from 'vitest'
import {
  filterRules,
  getRuleCategoryFilters,
  getRulePluginFilters,
  resolveSelectedConfigPath,
} from './config-inspector'

const rule = {
  aliases: [],
  category: 'correctness',
  defaultSeverity: 'off',
  deprecated: false,
  fixable: true,
  hasSuggestions: false,
  name: 'no-debugger',
  offOnly: false,
  overloaded: false,
  pluginName: 'eslint',
  recommended: true,
  replacedBy: [],
  ruleId: 'eslint/no-debugger',
  ruleType: 'problem',
  severityStates: ['error'],
  source: 'builtin',
  usage: {
    category: false,
    overrideGroups: [],
    root: true,
  },
  used: true,
} as InspectedRule

describe('resolveSelectedConfigPath', () => {
  const rootPath = '.oxlintrc.json'
  const nestedPath = 'packages/app/oxlint.config.ts'
  const paths = [rootPath, nestedPath]

  it('selects the exact requested config and preserves missing targets', () => {
    expect(resolveSelectedConfigPath(paths, nestedPath, rootPath)).toBe(nestedPath)
    expect(resolveSelectedConfigPath(paths, 'deleted/oxlint.config.ts', rootPath)).toBe('')
    expect(resolveSelectedConfigPath(paths, '', nestedPath)).toBe(nestedPath)
  })
})

describe('filterRules', () => {
  it('combines text, plugin, usage, and state filters', () => {
    expect(
      filterRules([rule], {
        category: 'correctness',
        plugin: 'eslint',
        query: 'debug',
        state: 'fixable',
        usage: 'error',
      }),
    ).toEqual([rule])
    expect(
      filterRules([rule], {
        category: 'all',
        plugin: 'typescript',
        query: '',
        state: 'all',
        usage: 'all',
      }),
    ).toEqual([])
    expect(
      filterRules([rule], {
        category: 'suspicious',
        plugin: 'eslint',
        query: '',
        state: 'all',
        usage: 'all',
      }),
    ).toEqual([])
  })
})

describe('getRulePluginFilters', () => {
  it('only includes plugins matching the other filters', () => {
    const unusedRule = {
      ...rule,
      name: 'no-explicit-any',
      pluginName: 'typescript',
      ruleId: 'typescript/no-explicit-any',
      severityStates: [],
      usage: {
        category: false,
        overrideGroups: [],
        root: false,
      },
      used: false,
    } as InspectedRule

    expect(
      getRulePluginFilters([rule, unusedRule], {
        category: 'all',
        query: '',
        state: 'active',
        usage: 'using',
      }),
    ).toEqual(['all', 'eslint'])
    expect(
      getRulePluginFilters([rule, unusedRule], {
        category: 'all',
        query: '',
        state: 'active',
        usage: 'all',
      }),
    ).toEqual(['all', 'eslint', 'typescript'])
  })
})

describe('getRuleCategoryFilters', () => {
  it('only includes categories matching the other filters', () => {
    const unusedRule = {
      ...rule,
      category: 'suspicious',
      pluginName: 'typescript',
      severityStates: [],
      used: false,
    } as InspectedRule

    expect(
      getRuleCategoryFilters([rule, unusedRule], {
        plugin: 'all',
        query: '',
        state: 'active',
        usage: 'using',
      }),
    ).toEqual(['all', 'correctness'])
    expect(
      getRuleCategoryFilters([rule, unusedRule], {
        plugin: 'all',
        query: '',
        state: 'active',
        usage: 'all',
      }),
    ).toEqual(['all', 'correctness', 'suspicious'])
  })
})
