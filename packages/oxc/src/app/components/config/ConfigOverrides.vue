<script setup lang="ts">
import type { InspectConfigResult } from '@oxlint-config-inspector/core'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'

const emit = defineEmits<{
  selectRule: [ruleId: string]
}>()

defineProps<{
  config: InspectConfigResult
}>()
</script>

<template>
  <VisualEmptyState
    v-if="config.overrideGroups.length === 0"
    icon="i-ph-stack-duotone"
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
        <span class="flex items-center gap-3 text-xs op-fade">
          <span class="flex items-center gap-1">
            <span class="i-ph-file-search-duotone" />
            <DisplayNumberBadge :number="group.files.length" />
          </span>
          <span class="flex items-center gap-1">
            <span class="i-ph-plugs-duotone" />
            <DisplayNumberBadge :number="group.plugins?.length ?? 0" />
          </span>
          <span class="flex items-center gap-1">
            <span class="i-ph-list-bullets-duotone" />
            <DisplayNumberBadge :number="group.rules.length" />
          </span>
        </span>
      </summary>

      <div class="grid gap-4 border-t border-base p4">
        <dl
          v-if="group.files.length > 1 || group.excludeFiles?.length || group.plugins?.length"
          class="grid items-center gap-2 sm:grid-cols-[max-content_1fr]"
        >
          <template v-if="group.files.length > 1">
            <dt class="op-fade">Files</dt>
            <dd class="flex flex-wrap items-center gap-1">
              <DisplayBadge
                v-for="file in group.files"
                :key="file"
                :text="file"
                :color="false"
                size="md"
                class="inline-flex items-center border border-base bg-transparent px2 py1 text-sm leading-none font-mono"
              />
            </dd>
          </template>
          <template v-if="group.excludeFiles?.length">
            <dt class="op-fade">Exclude</dt>
            <dd class="font-mono break-all">{{ group.excludeFiles.join(', ') }}</dd>
          </template>
          <template v-if="group.plugins?.length">
            <dt class="op-fade">Plugins</dt>
            <dd class="flex flex-wrap gap-1">
              <DisplayBadge v-for="plugin in group.plugins" :key="plugin" :text="plugin" />
            </dd>
          </template>
        </dl>

        <div v-if="group.rules.length" class="of-x-auto border border-base rounded">
          <table class="w-full text-left">
            <thead class="border-b border-base text-sm op-fade">
              <tr>
                <th class="px3 py2 font-medium">Rule</th>
                <th class="px3 py2 font-medium">Severity</th>
                <th class="px3 py2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rule in group.rules"
                :key="rule.ruleId"
                tabindex="0"
                class="border-b border-base cursor-pointer last:border-b-0 hover:bg-active focus-visible:bg-active outline-none"
                @click="emit('selectRule', rule.ruleId)"
                @keydown.enter="emit('selectRule', rule.ruleId)"
              >
                <td class="px3 py2 font-mono">{{ rule.ruleId }}</td>
                <td class="px3 py2">
                  <DisplayBadge :text="rule.severity" />
                </td>
                <td class="px3 py2">
                  <DisplayBadge :text="rule.source" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm op-fade">No rules configured for this override.</p>
      </div>
    </details>
  </div>
</template>
