import type {
  InspectedOverrideGroup,
  InspectedRule,
  RuleSeverity,
} from '@oxlint-config-inspector/core'

export type InspectorTab = 'overview' | 'rules' | 'overrides'
export type RulePluginFilter = 'all' | (string & {})
export type RuleStateFilter = 'active' | 'all' | 'deprecated' | 'fixable' | 'recommended'
export type RuleUsageFilter =
  | 'all'
  | 'using'
  | 'unused'
  | 'error'
  | 'warn'
  | 'off'
  | 'overloaded'
  | 'off-only'

export const RULE_STATE_FILTERS: RuleStateFilter[] = [
  'all',
  'active',
  'recommended',
  'fixable',
  'deprecated',
]
export const RULE_USAGE_FILTERS: RuleUsageFilter[] = [
  'all',
  'using',
  'unused',
  'error',
  'warn',
  'off',
  'overloaded',
  'off-only',
]

export function getRulePluginFilters(
  rules: InspectedRule[],
  filters: {
    query: string
    state: RuleStateFilter
    usage: RuleUsageFilter
  },
): RulePluginFilter[] {
  const plugins = filterRules(rules, { ...filters, plugin: 'all' }).flatMap(rule =>
    rule.pluginName ? [rule.pluginName] : [],
  )

  return ['all', ...new Set(plugins)]
}

export function filterRules(
  rules: InspectedRule[],
  filters: {
    plugin: RulePluginFilter
    query: string
    state: RuleStateFilter
    usage: RuleUsageFilter
  },
) {
  const query = filters.query.trim().toLowerCase()

  return rules.filter(rule => {
    if (filters.plugin !== 'all' && rule.pluginName !== filters.plugin) return false
    if (!matchesUsage(rule, filters.usage) || !matchesState(rule, filters.state)) return false
    if (!query) return true

    return [
      rule.ruleId,
      rule.name,
      rule.pluginName,
      rule.category,
      rule.description,
      rule.source,
      rule.ruleType,
      ...rule.aliases,
      ...rule.replacedBy,
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(query))
  })
}

function matchesUsage(rule: InspectedRule, filter: RuleUsageFilter) {
  if (filter === 'all') return true
  if (filter === 'using') return rule.used
  if (filter === 'unused') return !rule.used
  if (filter === 'overloaded') return rule.overloaded
  if (filter === 'off-only') return rule.offOnly
  return rule.severityStates.includes(filter)
}

function matchesState(rule: InspectedRule, filter: RuleStateFilter) {
  if (filter === 'all') return true
  if (filter === 'active') return !rule.deprecated
  if (filter === 'recommended') return rule.recommended
  if (filter === 'fixable') return rule.fixable
  return rule.deprecated
}

export interface RuleUsageConfig {
  excludeFiles?: string[]
  files?: string[]
  index?: number
  options: unknown[]
  ruleId: string
  severity: RuleSeverity
  source: 'category' | 'override' | 'root'
}

export function createRuleUsageConfigs(
  rule: InspectedRule,
  overrideGroups: InspectedOverrideGroup[],
) {
  const configs: RuleUsageConfig[] = []

  if (rule.usage.category) {
    configs.push({
      options: [],
      ruleId: rule.ruleId,
      severity: rule.defaultSeverity,
      source: 'category',
    })
  }

  if (rule.usage.root && rule.configured) {
    configs.push({
      options: rule.configured.options,
      ruleId: rule.configured.ruleId,
      severity: rule.configured.severity,
      source: 'root',
    })
  }

  for (const index of rule.usage.overrideGroups) {
    const group = overrideGroups.find(item => item.index === index)
    const overrideRule = group?.rules.find(item => item.ruleId === rule.ruleId)
    if (!group || !overrideRule) continue

    configs.push({
      excludeFiles: group.excludeFiles,
      files: group.files,
      index,
      options: overrideRule.options,
      ruleId: overrideRule.ruleId,
      severity: overrideRule.severity,
      source: 'override',
    })
  }

  return configs
}

export function getUsageLocation(config: RuleUsageConfig) {
  if (config.source === 'override') return `override #${config.index}`
  if (config.source === 'root') return 'root config'
  return 'category config'
}
