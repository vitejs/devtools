<script setup lang="ts">
import type { InspectConfigResult } from '@oxlint-config-inspector/core'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { getPluginColor } from '@vitejs/devtools-ui/utils/color'
import { computed } from 'vue'

const emit = defineEmits<{
  selectRule: [ruleId: string]
}>()

const props = defineProps<{
  config: InspectConfigResult
}>()

const rulesById = computed(() => new Map(props.config.rules.map(rule => [rule.ruleId, rule])))
</script>

<template>
  <VisualEmptyState
    v-if="config.overrideGroups.length === 0"
    icon="i-ph-files-duotone"
    title="No overrides"
    description="No override configuration was found."
  />
  <div v-else class="flex flex-col gap-2">
    <details
      v-for="group in config.overrideGroups"
      :key="group.index"
      class="bg-base border border-base rounded"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-4 px2 py1 font-mono text-sm hover:bg-active"
      >
        <span class="w-8 flex-none text-right text-xs op50">#{{ group.index + 1 }}</span>
        <span class="min-w-0 flex flex-1 items-center gap-2" :title="group.files.join(', ')">
          <span class="truncate">{{ group.files[0] }}</span>
          <span v-if="group.files.length > 1" class="flex-none text-xs op50">
            +{{ group.files.length - 1 }}
          </span>
        </span>
        <span class="flex items-center gap-3 text-xs">
          <span
            class="flex items-center gap-1"
            :class="group.files.length > 1 ? 'text-yellow-600 dark:text-yellow-400' : 'op25'"
          >
            <span class="i-ph-file-search-duotone" />
            <DisplayNumberBadge :number="group.files.length" color="" />
          </span>
          <span
            class="flex items-center gap-1"
            :class="(group.plugins?.length ?? 0) > 1 ? 'text-teal-600 dark:text-teal-400' : 'op25'"
          >
            <span class="i-ph-plugs-duotone" />
            <DisplayNumberBadge :number="group.plugins?.length ?? 0" color="" />
          </span>
          <span
            class="flex items-center gap-1"
            :class="group.rules.length > 1 ? 'text-blue-600 dark:text-blue-400' : 'op25'"
          >
            <span class="i-ph-list-bullets-duotone" />
            <DisplayNumberBadge :number="group.rules.length" color="" />
          </span>
        </span>
      </summary>

      <div class="grid gap-4 border-t border-base p4">
        <div class="flex items-start gap-2">
          <span class="i-ph-file-search-duotone my1 flex-none" />
          <div class="flex flex-col gap-2">
            <div>Applies to files matching</div>
            <div class="flex flex-wrap items-center gap-2">
              <DisplayBadge
                v-for="file in group.files"
                :key="file"
                :text="file"
                :color="false"
                size="md"
                class="inline-flex items-center border border-base bg-transparent px2 py1 text-sm leading-none font-mono"
              />
            </div>
          </div>
        </div>

        <div v-if="group.excludeFiles?.length" class="flex items-start gap-2">
          <span class="i-ph-eye-closed-duotone my1 flex-none" />
          <div class="flex flex-col gap-2">
            <div>Exclude</div>
            <div class="flex flex-wrap items-center gap-2">
              <DisplayBadge
                v-for="file in group.excludeFiles"
                :key="file"
                :text="file"
                :color="false"
                size="md"
                class="inline-flex items-center border border-base bg-transparent px2 py1 text-sm leading-none font-mono"
              />
            </div>
          </div>
        </div>

        <div v-if="group.plugins?.length" class="flex items-start gap-2">
          <span class="i-ph-plugs-duotone my1 flex-none" />
          <div class="flex flex-col gap-2">
            <div>Plugins ({{ group.plugins.length }})</div>
            <div class="flex flex-wrap items-center gap-2">
              <DisplayBadge
                v-for="plugin in group.plugins"
                :key="plugin"
                :text="plugin"
                size="md"
                class="px3 py1 text-sm leading-none font-mono"
              />
            </div>
          </div>
        </div>

        <div v-if="group.rules.length" class="flex items-start gap-2">
          <span class="i-ph-list-bullets-duotone my1 flex-none" />
          <div class="min-w-0 flex flex-1 flex-col gap-2">
            <div>Rules ({{ group.rules.length }})</div>
            <div
              class="grid grid-cols-[max-content_max-content_max-content_minmax(20rem,1fr)] items-center gap-x-3 gap-y-2 of-x-auto"
            >
              <button
                v-for="rule in group.rules"
                :key="rule.ruleId"
                type="button"
                class="col-span-4 grid grid-cols-subgrid items-center text-left focus-visible:bg-active outline-none cursor-pointer"
                @click="emit('selectRule', rule.ruleId)"
              >
                <span
                  :class="{
                    'i-ph-warning-circle-duotone color-scale-critical': rule.severity === 'error',
                    'i-ph-warning-duotone color-scale-medium': rule.severity === 'warn',
                    'i-ph-circle-half-tilt-duotone op-fade': rule.severity === 'off',
                    'i-ph-question-duotone op-fade': rule.severity === 'unknown',
                  }"
                  :title="rule.severity"
                />
                <span class="ws-nowrap border border-base rounded py-1 px-2 font-mono">
                  <span
                    v-if="rulesById.get(rule.ruleId)?.pluginName"
                    :style="{
                      color: getPluginColor(rulesById.get(rule.ruleId)!.pluginName!),
                    }"
                  >
                    {{ rulesById.get(rule.ruleId)!.pluginName }}
                  </span>
                  <span v-if="rulesById.get(rule.ruleId)?.pluginName" class="op-fade">/</span>
                  <span>{{ rulesById.get(rule.ruleId)?.name ?? rule.ruleId }}</span>
                </span>
                <span class="grid grid-cols-2 items-center gap-1 op-fade">
                  <span
                    v-if="rulesById.get(rule.ruleId)?.recommended"
                    class="i-ph-check-square-duotone"
                    title="Recommended"
                  />
                  <span v-else />
                  <span
                    v-if="rulesById.get(rule.ruleId)?.fixable"
                    class="i-ph-wrench-duotone"
                    title="Fixable"
                  />
                  <span v-else />
                </span>
                <span class="truncate op-fade">
                  {{
                    rulesById.get(rule.ruleId)?.description ??
                    rulesById.get(rule.ruleId)?.category ??
                    '-'
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-sm op-fade">No rules configured for this override.</p>
      </div>
    </details>
  </div>
</template>
