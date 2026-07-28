<script setup lang="ts">
import type { InspectedOverrideGroup, InspectedRule } from '@oxlint-config-inspector/core'
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import { computed } from 'vue'
import { createRuleUsageConfigs, getUsageLocation } from '../../utils/config-inspector'

const props = defineProps<{
  rule: InspectedRule
  overrideGroups: InspectedOverrideGroup[]
}>()

const details = computed(
  () =>
    [
      ['Name', props.rule.name],
      ['Plugin', props.rule.pluginName ?? '-'],
      ['Description', props.rule.description ?? '-'],
      ['Type / category', props.rule.ruleType ?? props.rule.category ?? '-'],
      ['Recommended', String(props.rule.recommended)],
      ['Fixable', String(props.rule.fixable)],
      ['Type aware', props.rule.typeAware === undefined ? 'unknown' : String(props.rule.typeAware)],
      ['Has suggestions', String(props.rule.hasSuggestions)],
      ['Deprecated', String(props.rule.deprecated)],
      ['Replaced by', props.rule.replacedBy.join(', ') || '-'],
      ['Used', String(props.rule.used)],
      ['Overloaded', String(props.rule.overloaded)],
      ['Aliases', props.rule.aliases.join(', ') || '-'],
    ] as const,
)

const usageConfigs = computed(() => createRuleUsageConfigs(props.rule, props.overrideGroups))
</script>

<template>
  <div class="grid w-[min(80vw,48rem)] max-w-full gap-5">
    <section>
      <h3 class="mb3 font-medium">Details</h3>
      <dl class="grid gap-2 sm:grid-cols-[max-content_1fr]">
        <template v-for="[label, value] in details" :key="label">
          <dt class="op-fade">{{ label }}</dt>
          <dd class="break-words">{{ value }}</dd>
        </template>
      </dl>
    </section>

    <section>
      <h3 class="mb3 font-medium">Usage</h3>
      <p v-if="usageConfigs.length === 0" class="text-sm op-fade">
        No default, root, or override usage config applies to this rule.
      </p>
      <div v-else class="grid gap-3">
        <ContainerCard
          v-for="usage in usageConfigs"
          :key="`${usage.source}:${usage.index ?? 'root'}:${usage.ruleId}`"
        >
          <template #header>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span>Set to</span>
              <DisplayBadge :text="usage.severity" />
              <span>in {{ getUsageLocation(usage) }}</span>
            </div>
          </template>
          <div class="grid gap-3 p4">
            <dl v-if="usage.files" class="grid items-center gap-2 sm:grid-cols-[max-content_1fr]">
              <dt class="op-fade">Files</dt>
              <dd class="flex flex-wrap items-center gap-1">
                <DisplayBadge
                  v-for="file in usage.files"
                  :key="file"
                  :text="file"
                  :color="false"
                  size="md"
                  class="inline-flex items-center border border-base bg-transparent px2 py1 text-sm leading-none font-mono"
                />
              </dd>
              <template v-if="usage.excludeFiles?.length">
                <dt class="op-fade">Exclude</dt>
                <dd class="flex flex-wrap items-center gap-1">
                  <DisplayBadge
                    v-for="file in usage.excludeFiles"
                    :key="file"
                    :text="file"
                    :color="false"
                    size="md"
                    class="inline-flex items-center border border-base bg-transparent px2 py1 text-sm leading-none font-mono"
                  />
                </dd>
              </template>
            </dl>
            <p v-else class="text-sm op-fade">Applied generally for all files.</p>

            <div v-if="usage.options.length">
              <div class="mb2 text-sm op-fade">Configured options</div>
              <div class="of-x-auto rounded bg-code p3 font-mono text-sm">
                <Shiki :code="JSON.stringify(usage.options, null, 2)" ext=".json" />
              </div>
            </div>
            <div v-if="rule.defaultOptions && Object.keys(rule.defaultOptions).length">
              <div class="mb2 text-sm op-fade">Default options</div>
              <div class="of-x-auto rounded bg-code p3 font-mono text-sm">
                <Shiki :code="JSON.stringify(rule.defaultOptions, null, 2)" ext=".json" />
              </div>
            </div>
          </div>
        </ContainerCard>
      </div>
    </section>
  </div>
</template>
