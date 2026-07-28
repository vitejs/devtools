import type { InspectedRule } from '@oxlint-config-inspector/core'
import { describe, expect, it } from 'vitest'
import { filterRules, getRulePluginFilters } from './config-inspector'

const rule = {
  aliases: [],
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

describe('filterRules', () => {
  it('combines text, plugin, usage, and state filters', () => {
    expect(
      filterRules([rule], {
        plugin: 'eslint',
        query: 'debug',
        state: 'fixable',
        usage: 'error',
      }),
    ).toEqual([rule])
    expect(
      filterRules([rule], {
        plugin: 'typescript',
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
        query: '',
        state: 'active',
        usage: 'using',
      }),
    ).toEqual(['all', 'eslint'])
    expect(
      getRulePluginFilters([rule, unusedRule], {
        query: '',
        state: 'active',
        usage: 'all',
      }),
    ).toEqual(['all', 'eslint', 'typescript'])
  })
})
