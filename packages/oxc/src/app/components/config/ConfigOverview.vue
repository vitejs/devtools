<script setup lang="ts">
import type { InspectConfigResult } from '@oxlint-config-inspector/core'
import type { OxcConfigFile } from '../../../types'
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayNumberBadge from '@vitejs/devtools-ui/components/Display/DisplayNumberBadge.vue'
import { computed } from 'vue'

const props = defineProps<{
  config: InspectConfigResult
  configFiles: OxcConfigFile[]
}>()

const selectedPath = defineModel<string>('selectedPath', { required: true })
const selectedConfig = computed(() =>
  props.configFiles.find(file => file.path === selectedPath.value),
)

const metrics = computed(
  () =>
    [
      ['Total rules', props.config.stats.totalRules, 'i-ph-list-numbers-duotone'],
      ['Enabled rules', props.config.stats.enabledRules, 'i-ph-list-checks-duotone'],
      ['Configured rules', props.config.stats.configuredRules, 'i-ph-sliders-duotone'],
      ['Override rules', props.config.stats.overrideRules, 'i-ph-files-duotone'],
      ['Builtin rules', props.config.stats.builtinRules, 'i-ph-package-duotone'],
      ['JS plugin rules', props.config.stats.jsPluginRules, 'i-ph-plugs-duotone'],
      ['Recommended', props.config.stats.recommendedRules, 'i-ph-check-square-duotone'],
      ['Fixable', props.config.stats.fixableRules, 'i-ph-wrench-duotone'],
      ['Unknown rules', props.config.stats.unknownRules, 'i-ph-question-duotone'],
      ['Deprecated', props.config.stats.deprecatedRules, 'i-ph-prohibit-inset-duotone'],
      ['Plugin errors', props.config.pluginErrors.length, 'i-ph-warning-circle-duotone'],
    ] as const,
)
</script>

<template>
  <div class="grid gap-4">
    <ContainerCard v-if="config.pluginErrors.length">
      <template #header>
        <h2 class="flex items-center gap-2 font-medium">
          <span class="i-ph-warning-duotone color-scale-critical" />
          Plugin load errors
        </h2>
      </template>
      <div class="grid gap-3 p4">
        <div
          v-for="pluginError in config.pluginErrors"
          :key="`${pluginError.specifier}:${pluginError.message}`"
          class="border border-base rounded p3"
        >
          <code class="font-medium">{{ pluginError.specifier }}</code>
          <p class="mt2 text-sm op-fade">{{ pluginError.message }}</p>
        </div>
      </div>
    </ContainerCard>

    <section class="grid gap-2">
      <div
        class="border border-base rounded p4 grid grid-cols-[max-content_160px_2fr] gap-2 items-center"
      >
        <template v-for="[label, value, icon] in metrics" :key="label">
          <div :class="icon" />
          <div>{{ label }}</div>
          <div>{{ value }}</div>
        </template>
      </div>
    </section>

    <ContainerCard>
      <template #header>
        <label class="block">
          <span class="relative block">
            <select
              v-model="selectedPath"
              :title="selectedPath"
              aria-label="Config"
              class="w-full appearance-none pl7 pr8 font-mono bg-transparent color-base outline-none"
            >
              <option v-for="file in configFiles" :key="file.path" :value="file.path">
                {{ file.path }}
              </option>
            </select>
            <span
              class="i-ph-file-code-duotone pointer-events-none absolute left-0 top-1/2 translate-y--1/2 op60"
            />
            <span
              class="i-ph-caret-down pointer-events-none absolute right-0 top-1/2 translate-y--1/2 op60"
            />
          </span>
        </label>
      </template>
      <div
        v-if="selectedConfig"
        class="config-code max-h-96 overflow-auto bg-code p4 font-mono text-sm"
      >
        <Shiki :code="selectedConfig.content" :ext="`.${selectedConfig.format}`" />
      </div>
    </ContainerCard>
  </div>
</template>

<style scoped>
.config-code {
  scrollbar-width: none;
}

.config-code::-webkit-scrollbar {
  display: none;
}
</style>
