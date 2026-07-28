<script setup lang="ts">
import type { InspectedRule } from '@oxlint-config-inspector/core'
import type { InspectorTab } from '../../utils/config-inspector'
import { resolveSelectedConfigPath } from '../../utils/config-inspector'
import ConfigOverview from '../../components/config/ConfigOverview.vue'
import ConfigOverrides from '../../components/config/ConfigOverrides.vue'
import ConfigRuleDetails from '../../components/config/ConfigRuleDetails.vue'
import ConfigRules from '../../components/config/ConfigRules.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { useAsyncState } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'

const rpc = useRpc()
const route = useRoute()
const router = useRouter()
const requestedPath = computed(() =>
  typeof route.query.config === 'string' ? route.query.config : '',
)

const {
  state: configFiles,
  isLoading: isLoadingFiles,
  error: configFilesError,
} = useAsyncState(() => rpc.value.call('devtools-oxc:get-config-files'), [])

const supportedConfigs = computed(() =>
  configFiles.value.filter(
    file =>
      file.tool === 'oxlint' &&
      file.format !== 'mts' &&
      file.format !== 'cts' &&
      (file.source === 'oxc' || file.path.endsWith('vite.config.ts')),
  ),
)

const selectedPath = ref('')
watch(
  [supportedConfigs, requestedPath],
  ([files, requested]) => {
    selectedPath.value = resolveSelectedConfigPath(
      files.map(file => file.path),
      requested,
      selectedPath.value,
    )
  },
  { immediate: true },
)
const missingConfig = computed(
  () =>
    !!requestedPath.value &&
    !supportedConfigs.value.some(file => file.path === requestedPath.value),
)

const {
  state: config,
  isLoading: isLoadingConfig,
  error: configError,
  execute: inspectConfig,
} = useAsyncState(
  () => rpc.value.call('devtools-oxc:inspect-lint-config', selectedPath.value),
  null,
  { immediate: false },
)

watch(
  selectedPath,
  path => {
    config.value = null
    if (path) inspectConfig()
  },
  { immediate: true },
)

const tabs = [
  ['overview', 'Overview', 'i-ph-stack-duotone'],
  ['rules', 'Rules', 'i-ph-list-dashes-duotone'],
  ['overrides', 'Overrides', 'i-ph-files-duotone'],
] as const satisfies readonly (readonly [InspectorTab, string, string])[]
const activeTab = ref<InspectorTab>('overview')
const selectedRule = ref<InspectedRule | null>(null)
const detailsOpen = ref(false)

function showRule(ruleId: string) {
  selectedRule.value = config.value?.rules.find(rule => rule.ruleId === ruleId) ?? null
  detailsOpen.value = selectedRule.value !== null
}

watch(detailsOpen, open => {
  if (!open) selectedRule.value = null
})

watch(selectedPath, () => {
  detailsOpen.value = false
  if (selectedPath.value && route.query.config !== selectedPath.value) {
    router.replace({
      query: { ...route.query, config: selectedPath.value },
    })
  }
})

const isLoading = computed(() => isLoadingFiles.value || isLoadingConfig.value)
const error = computed(() => configFilesError.value ?? configError.value)
const errorMessage = computed(() => {
  const value = error.value
  return value instanceof Error ? value.message : String(value)
})
</script>

<template>
  <div class="mx-auto max-w-7xl p6">
    <Back />

    <header
      v-if="supportedConfigs.length"
      class="mb4 flex flex-wrap items-end justify-between gap-4"
    >
      <nav
        v-if="config"
        class="flex flex-wrap items-center gap-3"
        aria-label="Config inspector views"
      >
        <button
          v-for="[value, label, icon] in tabs"
          :key="value"
          type="button"
          class="btn-action flex-none px3! py1.5! text-base"
          :class="{ 'btn-action-active': activeTab === value }"
          :aria-pressed="activeTab === value"
          @click="activeTab = value"
        >
          <span :class="icon" class="flex-none text-xl" />
          {{ label }}
        </button>
      </nav>

      <label v-if="activeTab !== 'overview' || missingConfig" class="ml-auto max-w-full">
        <span class="relative max-w-full">
          <select
            v-model="selectedPath"
            :disabled="isLoadingConfig"
            :title="selectedPath"
            aria-label="Config"
            class="min-w-48 max-w-full appearance-none pl10 pr10 py2 text-sm font-mono rounded-lg bg-base color-base border border-base outline-none transition-all focus-visible:ring-3 focus-visible:ring-primary-500/30 disabled:op50 disabled:pointer-events-none"
            style="field-sizing: content"
          >
            <option v-if="missingConfig" value="" disabled>{{ requestedPath }} (missing)</option>
            <option v-for="file in supportedConfigs" :key="file.path" :value="file.path">
              {{ file.path }}
            </option>
          </select>
          <span
            class="i-ph-file-code-duotone pointer-events-none absolute left-3 top-1/2 translate-y--1/2 op60"
          />
          <span
            class="i-ph-caret-down pointer-events-none absolute right-4 top-1/2 translate-y--1/2 op60"
          />
        </span>
      </label>
    </header>

    <VisualLoading v-if="isLoading" text="Loading Oxlint config..." />

    <VisualEmptyState
      v-else-if="error"
      icon="i-ph-warning-circle-duotone"
      title="Could not load config"
      :description="errorMessage"
    />

    <VisualEmptyState
      v-else-if="missingConfig"
      icon="i-ph-file-x-duotone"
      title="Oxlint config not found"
      :description="`${requestedPath} is no longer available in this workspace.`"
    />

    <VisualEmptyState
      v-else-if="!selectedPath"
      icon="i-ph-file-x-duotone"
      title="No supported Oxlint config"
      description="Add a supported Oxlint config to this workspace."
    />

    <template v-else-if="config">
      <ConfigOverview
        v-if="activeTab === 'overview'"
        v-model:selected-path="selectedPath"
        :config="config"
        :config-files="supportedConfigs"
      />
      <ConfigRules
        v-else-if="activeTab === 'rules'"
        :key="selectedPath"
        :config="config"
        @select-rule="showRule"
      />
      <ConfigOverrides v-else :config="config" @select-rule="showRule" />
    </template>

    <div
      v-if="detailsOpen && selectedRule && config"
      class="fixed inset-0 backdrop-blur-8 backdrop-brightness-95 z-panel-content"
      @click.self="detailsOpen = false"
    >
      <div
        class="fixed right-0 bottom-0 top-20 w-full max-w-3xl z-panel-content bg-glass border-l border-t border-base rounded-tl-xl flex flex-col"
      >
        <header class="flex items-center justify-between gap-4 border-b border-base px5 py4">
          <div>
            <div class="flex items-center gap-2">
              <div class="font-mono">{{ selectedRule.ruleId }}</div>
              <a
                v-if="selectedRule.docsUrl"
                :href="selectedRule.docsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-action-sm"
              >
                Docs
                <span class="i-ph-arrow-square-out-duotone" />
              </a>
            </div>
            <div class="mt1 text-xs font-normal op-fade">{{ selectedRule.source }}</div>
          </div>
          <button type="button" class="btn-icon" aria-label="Close" @click="detailsOpen = false">
            <span class="i-ph-x" />
          </button>
        </header>
        <div class="of-auto p6">
          <ConfigRuleDetails
            class="mx-auto"
            :rule="selectedRule"
            :override-groups="config.overrideGroups"
          />
        </div>
      </div>
    </div>
  </div>
</template>
