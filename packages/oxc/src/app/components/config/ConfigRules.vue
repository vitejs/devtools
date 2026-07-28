<script setup lang="ts">
import type { InspectConfigResult, InspectedRule } from '@oxlint-config-inspector/core'
import { computed, ref, watch } from 'vue'
import {
  filterRules,
  getRulePluginFilters,
  RULE_STATE_FILTERS,
  RULE_USAGE_FILTERS,
} from '../../utils/config-inspector'
import type {
  RulePluginFilter,
  RuleStateFilter,
  RuleUsageFilter,
} from '../../utils/config-inspector'
import ConfigOptionSelectGroup from './ConfigOptionSelectGroup.vue'

const props = defineProps<{
  config: InspectConfigResult
}>()
const emit = defineEmits<{
  selectRule: [ruleId: string]
}>()

const query = ref('')
const plugin = ref<RulePluginFilter>('all')
const usage = ref<RuleUsageFilter>('using')
const state = ref<RuleStateFilter>('active')

const pluginFilters = computed(() =>
  getRulePluginFilters(props.config.rules, {
    query: query.value,
    state: state.value,
    usage: usage.value,
  }),
)
const pluginTitles = computed(() =>
  pluginFilters.value.map(value => (value === 'all' ? 'All' : value)),
)
const usageTitles = ['All', 'Using', 'Unused', 'Error', 'Warn', 'Off', 'Overloaded', 'Off Only']
const stateTitles = ['All', 'Active', 'Recommended', 'Fixable', 'Deprecated']

watch(pluginFilters, filters => {
  if (!filters.includes(plugin.value)) plugin.value = 'all'
})

const filteredRules = computed(() =>
  filterRules(props.config.rules, {
    plugin: plugin.value,
    query: query.value,
    state: state.value,
    usage: usage.value,
  }),
)

const hasActiveFilters = computed(
  () =>
    query.value !== '' ||
    plugin.value !== 'all' ||
    usage.value !== 'using' ||
    state.value !== 'active',
)

function clearFilters() {
  query.value = ''
  plugin.value = 'all'
  usage.value = 'using'
  state.value = 'active'
}

function showRule(rule: InspectedRule) {
  emit('selectRule', rule.ruleId)
}
</script>

<template>
  <div class="grid gap-5">
    <div class="relative flex">
      <input
        v-model="query"
        :class="{ 'font-mono': query }"
        class="w-full border border-base rounded-full bg-transparent px3 py2 pl10 outline-none"
        aria-label="Search rules"
        placeholder="Search rules..."
      />
      <span
        class="i-ph-magnifying-glass-duotone pointer-events-none absolute left-4 top-1/2 translate-y--1/2 op-fade"
      />
      <button
        v-if="query"
        type="button"
        class="i-lucide-circle-x absolute right-4 top-1/2 translate-y--1/2 op50 cursor-pointer hover:op100"
        aria-label="Clear search"
        @click="query = ''"
      />
    </div>

    <div class="grid gap-3">
      <div class="grid gap-2 sm:grid-cols-[4rem_1fr] sm:items-start">
        <span class="text-right text-sm leading-7 op-fade">Plugins</span>
        <ConfigOptionSelectGroup
          v-model="plugin"
          :options="pluginFilters"
          :titles="pluginTitles"
          :classes="pluginFilters.map(value => (value === 'all' ? '' : 'font-mono'))"
        />
      </div>
      <div class="grid gap-2 sm:grid-cols-[4rem_1fr] sm:items-start">
        <span class="text-right text-sm leading-7 op-fade">Usage</span>
        <ConfigOptionSelectGroup
          v-model="usage"
          :options="RULE_USAGE_FILTERS"
          :titles="usageTitles"
        >
          <template #default="{ value, title }">
            <span class="flex items-center gap-1">
              <span
                v-if="value === 'error' || value === 'overloaded'"
                class="i-ph-x-circle-duotone color-scale-critical"
              />
              <span
                v-if="value === 'warn' || value === 'overloaded'"
                class="i-ph-warning-duotone color-scale-medium"
              />
              <span
                v-if="value === 'off' || value === 'off-only' || value === 'overloaded'"
                class="i-ph-minus-circle-duotone"
              />
              {{ title }}
            </span>
          </template>
        </ConfigOptionSelectGroup>
      </div>
      <div class="grid gap-2 sm:grid-cols-[4rem_1fr] sm:items-start">
        <span class="text-right text-sm leading-7 op-fade">State</span>
        <ConfigOptionSelectGroup
          v-model="state"
          :options="RULE_STATE_FILTERS"
          :titles="stateTitles"
        >
          <template #default="{ value, title }">
            <span class="flex items-center gap-1">
              <span
                v-if="value === 'recommended'"
                class="i-ph-check-square-duotone color-scale-low"
              />
              <span v-if="value === 'fixable'" class="i-ph-wrench-duotone color-scale-medium" />
              <span v-if="value === 'deprecated'" class="i-ph-prohibit-inset-duotone" />
              {{ title }}
            </span>
          </template>
        </ConfigOptionSelectGroup>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-2 border border-base rounded-full bg-active px3 py1">
        <span class="i-ph-list-checks-duotone" />
        <span>{{ filteredRules.length }}</span>
        <span>rules {{ hasActiveFilters ? 'filtered' : 'enabled' }}</span>
        <span class="text-sm op-fade">out of {{ config.stats.totalRules }} rules</span>
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="flex items-center gap-2 border border-active rounded-full bg-active px3 py1"
        @click="clearFilters"
      >
        <span class="i-ph-funnel-duotone color-active" />
        <span class="op-fade">Clear Filter</span>
        <span class="i-ph-x ml--1 text-sm op-fade" />
      </button>
    </div>

    <div class="of-x-auto">
      <table class="w-full text-left">
        <thead class="border-b border-base text-sm op-fade">
          <tr>
            <th class="px3 py2 font-medium">Status</th>
            <th class="px3 py2 font-medium">Rule</th>
            <th class="px3 py2 font-medium">Meta</th>
            <th class="px3 py2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rule in filteredRules"
            :key="rule.ruleId"
            tabindex="0"
            class="border-b border-base cursor-pointer last:border-b-0 hover:bg-active focus-visible:bg-active outline-none"
            @click="showRule(rule)"
            @keydown.enter="showRule(rule)"
          >
            <td class="px3 py2">
              <span class="flex items-center gap-1">
                <span
                  v-for="severity in rule.severityStates"
                  :key="severity"
                  :class="{
                    'i-ph-x-circle-duotone color-scale-critical': severity === 'error',
                    'i-ph-warning-duotone color-scale-medium': severity === 'warn',
                    'i-ph-minus-circle-duotone op-fade': severity === 'off',
                  }"
                  :title="severity"
                />
              </span>
            </td>
            <td class="px3 py2 font-mono">{{ rule.ruleId }}</td>
            <td class="px3 py2">
              <span class="flex items-center gap-1 op-fade">
                <span
                  v-if="rule.recommended"
                  class="i-ph-check-square-duotone"
                  title="Recommended"
                />
                <span v-if="rule.fixable" class="i-ph-wrench-duotone" title="Fixable" />
                <span
                  v-if="rule.deprecated"
                  class="i-ph-warning-circle-duotone color-deprecated"
                  title="Deprecated"
                />
              </span>
            </td>
            <td class="max-w-md truncate px3 py2 op-fade">
              {{ rule.description ?? rule.category ?? '-' }}
            </td>
          </tr>
          <tr v-if="filteredRules.length === 0">
            <td colspan="4" class="px3 py10 text-center op-fade">
              No rules match the current filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
