<script setup lang="ts">
import type {
  SessionCompareChangeStatus,
  SessionCompareContext,
  SessionCompareDetails,
  SessionCompareMetricValue,
} from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import PanelSideNav from '@vitejs/devtools-ui/components/PanelSideNav.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { bytesToHumanSize } from '~/utils/format'

type CompareTab = 'overview' | 'assets' | 'chunks' | 'packages' | 'plugins' | 'modules'
type DiffMode = 'changed' | 'added' | 'removed'
type DiffFormat = 'bytes' | 'duration' | 'number'

interface SplitDiffStat {
  value: string
  label: string
  tone?: 'increase' | 'decrease'
  hidden?: boolean
}

interface SplitDiffRow extends SessionCompareMetricValue {
  key: string
  status: SessionCompareChangeStatus
  previousTitle?: string
  currentTitle?: string
  previousTitleMeta?: string
  currentTitleMeta?: string
  previousSubtitle?: string
  currentSubtitle?: string
  previousStats?: SplitDiffStat[]
  currentStats?: SplitDiffStat[]
  previousBadges: string[]
  currentBadges: string[]
  format: DiffFormat
  ratioText: string
}

const TABLE_LIMIT = 300

const isLoading = ref(false)
const params = useRoute().params as {
  sessions: string
}

const rpc = useRpc()
const sessions = ref<SessionCompareContext[]>([])
const details = ref<SessionCompareDetails | null>(null)
const activeTab = ref<CompareTab>('overview')
const activeDiffMode = ref<DiffMode>('changed')

onMounted(async () => {
  isLoading.value = true
  const sessionIds = params.sessions.split(',')

  const [summary, compareDetails] = await Promise.all([
    rpc.value.call(
      'vite:rolldown:get-session-compare-summary',
      { sessions: sessionIds },
    ),
    rpc.value.call(
      'vite:rolldown:get-session-compare-details',
      { sessions: sessionIds },
    ),
  ])

  sessions.value = summary
  details.value = compareDetails

  isLoading.value = false
})

const normalizedSessions = computed<Array<SessionCompareContext & { createdAt: Date, title: string }>>(() => {
  return sessions.value.map((session, index) => ({
    ...session,
    // @ts-expect-error missing type
    createdAt: new Date(session.meta?.timestamp ?? 0),
    title: index === 0 ? 'Session A' : 'Session B',
  }))
})

const comparisonMetrics = computed(() => {
  const [sessionA, sessionB] = normalizedSessions.value
  return [
    {
      name: 'Bundle Size',
      description: 'Total file size of the assets',
      icon: 'i-ph-package-duotone',
      current: sessionB?.bundle_size ?? 0,
      previous: sessionA?.bundle_size ?? 0,
      format: 'bytes',
    },
    {
      name: 'Initial JS',
      description: 'Total file size of the initial JS chunks',
      icon: 'i-ph-file-js-duotone',
      current: sessionB?.initial_js ?? 0,
      previous: sessionA?.initial_js ?? 0,
      format: 'bytes',
    },
    {
      name: 'Modules',
      description: 'Total number of modules',
      icon: 'i-ph-graph-duotone',
      current: sessionB?.modules ?? 0,
      previous: sessionA?.modules ?? 0,
    },
    {
      name: 'Packages',
      description: 'Total number of packages',
      icon: 'i-ph-package-duotone',
      current: details.value?.sessionStats.current.packages ?? 0,
      previous: details.value?.sessionStats.previous.packages ?? 0,
    },
    {
      name: 'Duplicated Packages',
      description: 'Total number of duplicated packages',
      icon: 'i-ph-package-duotone',
      current: details.value?.sessionStats.current.duplicatedPackages ?? 0,
      previous: details.value?.sessionStats.previous.duplicatedPackages ?? 0,
    },
    {
      name: 'Plugins',
      description: 'Total number of plugins',
      icon: 'i-ph-plugs-duotone',
      current: sessionB?.meta?.plugins.length ?? 0,
      previous: sessionA?.meta?.plugins.length ?? 0,
    },
    {
      name: 'Chunks',
      description: 'Total number of chunks',
      icon: 'i-ph-shapes-duotone',
      current: sessionB?.chunks ?? 0,
      previous: sessionA?.chunks ?? 0,
    },
    {
      name: 'Assets',
      description: 'Total number of assets',
      icon: 'i-ph-package-duotone',
      current: sessionB?.assets ?? 0,
      previous: sessionA?.assets ?? 0,
    },
  ]
})

const sessionSummaries = computed(() => {
  switch (activeTab.value) {
    case 'assets':
      return normalizedSessions.value.map(session => [
        {
          label: 'Assets',
          value: session.assets.toLocaleString(),
          icon: 'i-ph-package-duotone',
        },
        {
          label: 'Bundle',
          value: formatBytesSummary(session.bundle_size),
          icon: 'i-ph-hard-drives-duotone',
        },
        {
          label: 'Initial JS',
          value: formatBytesSummary(session.initial_js),
          icon: 'i-ph-file-js-duotone',
        },
      ])
    case 'chunks':
      return normalizedSessions.value.map(session => [
        {
          label: 'Chunks',
          value: session.chunks.toLocaleString(),
          icon: 'i-ph-shapes-duotone',
        },
        {
          label: 'Modules',
          value: session.modules.toLocaleString(),
          icon: 'i-ph-graph-duotone',
        },
        {
          label: 'Initial JS',
          value: formatBytesSummary(session.initial_js),
          icon: 'i-ph-file-js-duotone',
        },
      ])
    default:
      return undefined
  }
})

const tabs = computed<Array<{ id: CompareTab, label: string, icon: string, count?: number }>>(() => [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'i-ph-squares-four-duotone',
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'i-ph-package-duotone',
    count: getChangedCount(details.value?.summary.assets),
  },
  {
    id: 'chunks',
    label: 'Chunks',
    icon: 'i-ph-shapes-duotone',
    count: getChangedCount(details.value?.summary.chunks),
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: 'i-ph-package-duotone',
    count: getChangedCount(details.value?.summary.packages),
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: 'i-ph-plugs-duotone',
    count: getChangedCount(details.value?.summary.plugins),
  },
  {
    id: 'modules',
    label: 'Modules',
    icon: 'i-ph-graph-duotone',
    count: getChangedCount(details.value?.summary.modules),
  },
])

const compareSideNavItems = computed(() => tabs.value.map(tab => ({
  title: tab.count ? `${tab.label} (${tab.count})` : tab.label,
  icon: tab.icon,
  active: activeTab.value === tab.id,
  action: () => {
    activeTab.value = tab.id
  },
})))

watch(activeTab, () => {
  activeDiffMode.value = 'changed'
})

const changedAssets = computed(() => changedOnly(details.value?.assets))
const changedChunks = computed(() => changedOnly(details.value?.chunks))
const changedPackages = computed(() => changedOnly(details.value?.packages))
const changedPlugins = computed(() => changedOnly(details.value?.plugins))
const changedModules = computed(() => changedOnly(details.value?.modules))

const assetRows = computed<SplitDiffRow[]>(() => changedAssets.value.map(item => createSplitRow({
  key: item.key,
  status: item.status,
  previousTitle: item.previousFilename,
  currentTitle: item.currentFilename,
  previousTitleMeta: formatAssetTitleMeta(item.chunkName),
  currentTitleMeta: formatAssetTitleMeta(item.chunkName),
  previous: item.previous,
  current: item.current,
  delta: item.delta,
  deltaRatio: item.deltaRatio,
  format: 'bytes',
  previousBadges: [item.scope],
  currentBadges: [item.scope],
})))

const chunkRows = computed<SplitDiffRow[]>(() => changedChunks.value.map(item => createSplitRow({
  key: item.key,
  status: item.status,
  previousTitle: item.previousChunkId == null ? undefined : item.name,
  currentTitle: item.currentChunkId == null ? undefined : item.name,
  previousStats: createChunkStats(item.previousModules, item.previousImports),
  currentStats: createChunkStats(item.currentModules, item.currentImports, {
    modules: item.previousModules,
    imports: item.previousImports,
  }),
  previous: item.previous,
  current: item.current,
  delta: item.delta,
  deltaRatio: item.deltaRatio,
  format: 'bytes',
  previousBadges: [
    item.reason,
    item.previousInitial ? 'initial' : undefined,
  ].filter(Boolean) as string[],
  currentBadges: [
    item.reason,
    item.currentInitial ? 'initial' : undefined,
  ].filter(Boolean) as string[],
})))

const packageRows = computed<SplitDiffRow[]>(() => changedPackages.value.map(item => createSplitRow({
  key: item.key,
  status: item.status,
  previousTitle: item.status === 'added' ? undefined : formatPackageTitle(item.name, item.previousVersion ?? item.version),
  currentTitle: item.status === 'removed' ? undefined : formatPackageTitle(item.name, item.currentVersion ?? item.version),
  previousStats: createPackageStats(item.previousFiles, item.previousImporters),
  currentStats: createPackageStats(item.currentFiles, item.currentImporters, {
    files: item.previousFiles,
    importers: item.previousImporters,
  }),
  previous: item.previous,
  current: item.current,
  delta: item.delta,
  deltaRatio: item.deltaRatio,
  format: 'bytes',
  previousBadges: [
    item.previousType,
    item.previousDuplicated ? 'duplicated' : undefined,
  ].filter(Boolean) as string[],
  currentBadges: [
    item.currentType,
    item.currentDuplicated ? 'duplicated' : undefined,
  ].filter(Boolean) as string[],
})))

const pluginRows = computed<SplitDiffRow[]>(() => changedPlugins.value.map(item => createSplitRow({
  key: item.key,
  status: item.status,
  previousTitle: item.previousPluginId == null ? undefined : item.name,
  currentTitle: item.currentPluginId == null ? undefined : item.name,
  previousStats: createPluginStats(item.previousCalls, item.previousResolveDuration, item.previousLoadDuration, item.previousTransformDuration),
  currentStats: createPluginStats(item.currentCalls, item.currentResolveDuration, item.currentLoadDuration, item.currentTransformDuration, {
    calls: item.previousCalls,
    resolve: item.previousResolveDuration,
    load: item.previousLoadDuration,
    transform: item.previousTransformDuration,
  }),
  previous: item.previous,
  current: item.current,
  delta: item.delta,
  deltaRatio: item.deltaRatio,
  format: 'duration',
  previousBadges: ['plugin'],
  currentBadges: ['plugin'],
})))

const moduleRows = computed<SplitDiffRow[]>(() => changedModules.value.map(item => createSplitRow({
  key: item.key,
  status: item.status,
  previousTitle: item.status === 'added' ? undefined : item.id,
  currentTitle: item.status === 'removed' ? undefined : item.id,
  previousSubtitle: [
    item.kind,
    item.fileType,
    `chunks ${item.previousChunks.length}`,
    `imports ${item.previousImports}`,
    `importers ${item.previousImporters}`,
  ].join(' · '),
  currentSubtitle: [
    item.kind,
    item.fileType,
    `chunks ${item.currentChunks.length}`,
    `imports ${item.currentImports}`,
    `importers ${item.currentImporters}`,
  ].join(' · '),
  previous: item.previous,
  current: item.current,
  delta: item.delta,
  deltaRatio: item.deltaRatio,
  format: 'bytes',
  previousBadges: [item.kind, item.fileType],
  currentBadges: [item.kind, item.fileType],
})))

const activeRows = computed(() => {
  switch (activeTab.value) {
    case 'assets':
      return assetRows.value
    case 'chunks':
      return chunkRows.value
    case 'packages':
      return packageRows.value
    case 'plugins':
      return pluginRows.value
    case 'modules':
      return moduleRows.value
    default:
      return []
  }
})

const changedRows = computed(() => activeRows.value.filter(item => item.status === 'changed' && item.delta !== 0))
const addedRows = computed(() => activeRows.value.filter(item => item.status === 'added'))
const removedRows = computed(() => activeRows.value.filter(item => item.status === 'removed'))

const activeDiffRows = computed(() => {
  switch (activeDiffMode.value) {
    case 'added':
      return addedRows.value
    case 'removed':
      return removedRows.value
    case 'changed':
    default:
      return changedRows.value
  }
})

const diffModeOptions = computed<Array<{
  id: DiffMode
  label: string
  title: string
  description: string
  icon: string
  count: number
  delta: number
  rows: SplitDiffRow[]
}>>(() => {
  return [
    {
      id: 'changed',
      label: 'Changed',
      title: 'Changed in Both Sessions',
      icon: 'i-ph-arrows-left-right-duotone',
      description: 'Matched entries with metric changes on both sides.',
      count: changedRows.value.length,
      delta: sumDelta(changedRows.value),
      rows: changedRows.value,
    },
    {
      id: 'added',
      label: 'Added',
      title: 'Added to Session B',
      icon: 'i-ph-plus-circle-duotone',
      description: 'Entries that only exist in the current session.',
      count: addedRows.value.length,
      delta: sumDelta(addedRows.value),
      rows: addedRows.value,
    },
    {
      id: 'removed',
      label: 'Removed',
      title: 'Removed from Session A',
      icon: 'i-ph-minus-circle-duotone',
      description: 'Entries that existed before but are missing now.',
      count: removedRows.value.length,
      delta: sumDelta(removedRows.value),
      rows: removedRows.value,
    },
  ]
})

const activeDiffOption = computed(() => diffModeOptions.value.find(item => item.id === activeDiffMode.value))

const activeDiffFormat = computed(() => activeRows.value[0]?.format || 'bytes')

const activeDiffEmptyText = computed(() => {
  switch (activeDiffMode.value) {
    case 'added':
      return 'No added entries'
    case 'removed':
      return 'No removed entries'
    case 'changed':
    default:
      return 'No changed entries'
  }
})

function getChangedCount(summary?: { added: number, removed: number, changed: number }) {
  if (!summary)
    return 0
  return summary.added + summary.removed + summary.changed
}

function changedOnly<T extends { status: SessionCompareChangeStatus }>(items: T[] | undefined) {
  return (items ?? [])
    .filter(item => item.status !== 'unchanged')
    .slice(0, TABLE_LIMIT)
}

function formatAssetTitleMeta(chunkName: string | undefined) {
  return chunkName?.replace(/[[\]]/g, '')
}

function formatPackageTitle(name: string, version: string | undefined) {
  if (!version || version === '(unknown)')
    return name
  return `${name}@${version}`
}

function createChunkStats(modules: number, imports: number, baseline?: { modules: number, imports: number }): SplitDiffStat[] {
  return [
    {
      value: modules.toLocaleString(),
      label: 'modules',
      tone: getStatTone(modules, baseline?.modules),
    },
    {
      value: imports.toLocaleString(),
      label: 'imports',
      tone: getStatTone(imports, baseline?.imports),
    },
  ]
}

function createPackageStats(files: number, importers: number, baseline?: { files: number, importers: number }): SplitDiffStat[] {
  return [
    {
      value: files.toLocaleString(),
      label: 'files',
      tone: getStatTone(files, baseline?.files),
    },
    {
      value: importers.toLocaleString(),
      label: 'importers',
      tone: getStatTone(importers, baseline?.importers),
    },
  ]
}

function createPluginStats(
  calls: number,
  resolve: number,
  load: number,
  transform: number,
  baseline?: { calls: number, resolve: number, load: number, transform: number },
): SplitDiffStat[] {
  return [
    {
      value: calls.toLocaleString(),
      label: 'calls',
      tone: getStatTone(calls, baseline?.calls),
    },
    {
      value: formatValue(resolve, 'duration'),
      label: 'resolve',
      tone: getStatTone(resolve, baseline?.resolve),
      hidden: resolve === 0 && baseline?.resolve === 0,
    },
    {
      value: formatValue(load, 'duration'),
      label: 'load',
      tone: getStatTone(load, baseline?.load),
      hidden: load === 0 && baseline?.load === 0,
    },
    {
      value: formatValue(transform, 'duration'),
      label: 'transform',
      tone: getStatTone(transform, baseline?.transform),
      hidden: transform === 0 && baseline?.transform === 0,
    },
  ].filter(stat => !stat.hidden)
}

function getStatTone(value: number, baseline: number | undefined): SplitDiffStat['tone'] {
  if (baseline == null || value === baseline)
    return undefined
  return value > baseline ? 'increase' : 'decrease'
}

function createSplitRow(row: Omit<SplitDiffRow, 'ratioText'>): SplitDiffRow {
  return {
    ...row,
    ratioText: formatRatio(row),
  }
}

function formatRatio(item: SessionCompareMetricValue) {
  if (item.deltaRatio == null)
    return item.previous === 0 && item.current > 0 ? 'new' : '-'
  if (item.deltaRatio === 0)
    return '0%'
  const sign = item.deltaRatio > 0 ? '+' : ''
  return `${sign}${(item.deltaRatio * 100).toFixed(2)}%`
}

function formatValue(value: number, format: DiffFormat) {
  if (format === 'duration') {
    if (value >= 1000)
      return `${+(value / 1000).toFixed(2)}s`
    return `${Math.round(value)}ms`
  }

  return value.toLocaleString()
}

function formatBytesSummary(value: number) {
  if (!value)
    return '0 B'
  return bytesToHumanSize(value).join(' ')
}

function sumDelta(rows: SplitDiffRow[]) {
  return rows.reduce((total, row) => total + row.delta, 0)
}
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else grid="~ cols-[max-content_1fr]" h-screen w-screen max-w-screen max-h-screen of-hidden>
    <PanelSideNav :items="compareSideNavItems" />
    <div of-auto h-screen max-h-screen relative p6 flex="~ col gap-4">
      <div flex="~ gap-2 items-center">
        <NuxtLink btn-action :to="{ path: `/` }">
          <div i-ph-arrow-bend-up-left-duotone />
          Re-select Session
        </NuxtLink>
      </div>

      <div flex="~ col" border="~ base rounded-lg" p3 min-h-0 flex-1>
        <div py3 px2 flex="~ items-center gap-2">
          <div :class="tabs.find(tab => tab.id === activeTab)?.icon" />
          {{ tabs.find(tab => tab.id === activeTab)?.label }}
        </div>
        <CompareSessionMeta :sessions="normalizedSessions" :summaries="sessionSummaries" />

        <div flex-1 min-h-0 of-auto pt3>
          <template v-if="activeTab === 'overview'">
            <div grid="~ cols-6 gap5" w-full>
              <div v-for="(item, index) of comparisonMetrics" :key="item.name" :class="index < 2 ? 'col-span-3' : 'col-span-2'" border="~ base rounded" p4 flex="~ col" gap2>
                <CompareMetricCard v-bind="item" />
              </div>
            </div>
          </template>

          <template v-else>
            <div flex="~ col gap-4">
              <div grid="~ cols-3 gap-3">
                <button
                  v-for="item of diffModeOptions"
                  :key="item.id"
                  type="button"
                  border="~ rounded"
                  p4
                  text-left
                  flex="~ col gap-3"
                  transition
                  :class="activeDiffMode === item.id ? 'border-active bg-active' : 'border-base hover:bg-active'"
                  @click="activeDiffMode = item.id"
                >
                  <div flex="~ items-center gap-2" text-sm>
                    <span font-600>{{ item.label }}</span>
                  </div>
                  <div flex="~ items-end gap-2">
                    <span text-3xl font-mono font-600>{{ item.count }}</span>
                    <CompareDeltaValue v-if="item.delta" :value="item.delta" :format="activeDiffFormat" signed />
                  </div>
                </button>
              </div>

              <section v-if="activeDiffOption" flex="~ col gap-2">
                <template v-if="activeDiffMode === 'changed'">
                  <CompareSplitRow
                    v-for="row of activeDiffOption.rows"
                    :key="row.key"
                    :status="row.status"
                    :previous-title="row.previousTitle"
                    :current-title="row.currentTitle"
                    :previous-title-meta="row.previousTitleMeta"
                    :current-title-meta="row.currentTitleMeta"
                    :previous-subtitle="row.previousSubtitle"
                    :current-subtitle="row.currentSubtitle"
                    :previous-stats="row.previousStats"
                    :current-stats="row.currentStats"
                    :previous-badges="row.previousBadges"
                    :current-badges="row.currentBadges"
                    :previous="row.previous"
                    :current="row.current"
                    :delta="row.delta"
                    :format="row.format"
                    :ratio-text="row.ratioText"
                  />
                </template>

                <template v-else-if="activeDiffMode === 'added'">
                  <div grid="~ cols-2 gap-3">
                    <CompareSingleSideRow
                      v-for="row of activeDiffOption.rows"
                      :key="row.key"
                      status="added"
                      session-label="Session B"
                      :title="row.currentTitle || row.key"
                      :title-meta="row.currentTitleMeta"
                      :subtitle="row.currentSubtitle"
                      :badges="row.currentBadges"
                      :stats="row.currentStats"
                      :value="row.current"
                      :delta="row.delta"
                      :format="row.format"
                      :ratio-text="row.ratioText"
                    />
                  </div>
                </template>

                <template v-else>
                  <div grid="~ cols-2 gap-3">
                    <CompareSingleSideRow
                      v-for="row of activeDiffOption.rows"
                      :key="row.key"
                      status="removed"
                      session-label="Session A"
                      :title="row.previousTitle || row.key"
                      :title-meta="row.previousTitleMeta"
                      :subtitle="row.previousSubtitle"
                      :badges="row.previousBadges"
                      :stats="row.previousStats"
                      :value="row.previous"
                      :delta="row.delta"
                      :format="row.format"
                      :ratio-text="row.ratioText"
                    />
                  </div>
                </template>
              </section>

              <div v-if="!activeDiffRows.length" h40 flex="~ items-center justify-center" op50 italic>
                {{ activeDiffEmptyText }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
