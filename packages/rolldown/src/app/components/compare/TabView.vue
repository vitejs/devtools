<script setup lang="ts">
import type {
  SessionCompareChangeStatus,
  SessionCompareContext,
  SessionCompareDetails,
  SessionCompareMetricValue,
} from '~~/shared/types'
import { computed, ref, watch } from 'vue'
import { bytesToHumanSize } from '~/utils/format'

type CompareTab = 'overview' | 'plugins' | 'chunks' | 'assets' | 'packages'
type DiffMode = 'changed' | 'added' | 'removed'
type DiffFormat = 'bytes' | 'duration' | 'number'
type SummaryTone = 'increase' | 'decrease'

interface CompareTabItem {
  id: string
  label: string
  icon: string
}

type NormalizedSessionCompareContext = SessionCompareContext & { createdAt: Date, title: string }

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

const props = defineProps<{
  tab: CompareTab
  tabs: CompareTabItem[]
  sessions: NormalizedSessionCompareContext[]
  details: SessionCompareDetails | null
}>()

const TABLE_LIMIT = 300

const activeDiffMode = ref<DiffMode>('changed')
const activeTabMeta = computed(() => props.tabs.find(tab => tab.id === props.tab))

const comparisonMetrics = computed(() => {
  const [sessionA, sessionB] = props.sessions
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
      current: props.details?.sessionStats.current.packages ?? 0,
      previous: props.details?.sessionStats.previous.packages ?? 0,
    },
    {
      name: 'Duplicated Packages',
      description: 'Total number of duplicated packages',
      icon: 'i-ph-package-duotone',
      current: props.details?.sessionStats.current.duplicatedPackages ?? 0,
      previous: props.details?.sessionStats.previous.duplicatedPackages ?? 0,
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
  const [sessionA] = props.sessions

  switch (props.tab) {
    case 'assets':
      return props.sessions.map((session, index) => [
        {
          label: 'Assets',
          value: session.assets.toLocaleString(),
          icon: 'i-ph-package-duotone',
          tone: getSummaryTone(index, session.assets, sessionA?.assets),
        },
        {
          label: 'Bundle',
          value: formatBytesSummary(session.bundle_size),
          icon: 'i-ph-hard-drives-duotone',
          tone: getSummaryTone(index, session.bundle_size, sessionA?.bundle_size),
        },
        {
          label: 'Initial JS',
          value: formatBytesSummary(session.initial_js),
          icon: 'i-ph-file-js-duotone',
          tone: getSummaryTone(index, session.initial_js, sessionA?.initial_js),
        },
      ])
    case 'chunks':
      return props.sessions.map((session, index) => [
        {
          label: 'Chunks',
          value: session.chunks.toLocaleString(),
          icon: 'i-ph-shapes-duotone',
          tone: getSummaryTone(index, session.chunks, sessionA?.chunks),
        },
        {
          label: 'Modules',
          value: session.modules.toLocaleString(),
          icon: 'i-ph-graph-duotone',
          tone: getSummaryTone(index, session.modules, sessionA?.modules),
        },
        {
          label: 'Initial JS',
          value: formatBytesSummary(session.initial_js),
          icon: 'i-ph-file-js-duotone',
          tone: getSummaryTone(index, session.initial_js, sessionA?.initial_js),
        },
      ])
    case 'packages': {
      const packageStatsA = getPackageSummaryStats(0)
      return props.sessions.map((_session, index) => {
        const packageStats = getPackageSummaryStats(index)
        return [
          {
            label: 'Packages',
            value: packageStats.packages.toLocaleString(),
            icon: 'i-ph-package-duotone',
            tone: getSummaryTone(index, packageStats.packages, packageStatsA.packages),
          },
          {
            label: 'Duplicated',
            value: packageStats.duplicatedPackages.toLocaleString(),
            icon: 'i-ph-copy-duotone',
            tone: getSummaryTone(index, packageStats.duplicatedPackages, packageStatsA.duplicatedPackages),
          },
          {
            label: 'Code Size',
            value: formatBytesSummary(packageStats.codeSize),
            icon: 'i-ph-file-code-duotone',
            tone: getSummaryTone(index, packageStats.codeSize, packageStatsA.codeSize),
          },
        ]
      })
    }
    case 'plugins': {
      const pluginStatsA = getPluginSummaryStats(0, sessionA)
      return props.sessions.map((session, index) => {
        const pluginStats = getPluginSummaryStats(index, session)
        return [
          {
            label: 'Plugins',
            value: pluginStats.plugins.toLocaleString(),
            icon: 'i-ph-plugs-duotone',
            tone: getSummaryTone(index, pluginStats.plugins, pluginStatsA.plugins),
          },
          {
            label: 'Calls',
            value: pluginStats.calls.toLocaleString(),
            icon: 'i-ph-arrow-counter-clockwise-duotone',
            tone: getSummaryTone(index, pluginStats.calls, pluginStatsA.calls),
          },
          {
            label: 'Duration',
            value: formatValue(pluginStats.duration, 'duration'),
            icon: 'i-ph-clock-duotone',
            tone: getSummaryTone(index, pluginStats.duration, pluginStatsA.duration),
          },
        ]
      })
    }
    default:
      return undefined
  }
})

watch(() => props.tab, () => {
  activeDiffMode.value = 'changed'
})

const assetDiffs = computed(() => changedEntries(props.details?.assets))
const chunkDiffs = computed(() => changedEntries(props.details?.chunks))
const packageDiffs = computed(() => changedEntries(props.details?.packages))
const pluginDiffs = computed(() => changedEntries(props.details?.plugins))

const assetRows = computed<SplitDiffRow[]>(() => assetDiffs.value.map(item => createSplitRow({
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

const chunkRows = computed<SplitDiffRow[]>(() => chunkDiffs.value.map(item => createSplitRow({
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

const packageRows = computed<SplitDiffRow[]>(() => packageDiffs.value.map(item => createSplitRow({
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

const pluginRows = computed<SplitDiffRow[]>(() => pluginDiffs.value.map(item => createSplitRow({
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
  previousBadges: [],
  currentBadges: [],
})))

const activeRows = computed(() => {
  switch (props.tab) {
    case 'assets':
      return assetRows.value
    case 'chunks':
      return chunkRows.value
    case 'packages':
      return packageRows.value
    case 'plugins':
      return pluginRows.value
    default:
      return []
  }
})

const changedRows = computed(() => activeRows.value.filter(item => item.status === 'changed'))
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
      icon: 'i-ph-arrows-left-right-duotone',
      description: 'Matched entries with metric changes on both sides.',
      count: changedRows.value.length,
      delta: sumDelta(changedRows.value),
      rows: changedRows.value.slice(0, TABLE_LIMIT),
    },
    {
      id: 'added',
      label: 'Added',
      icon: 'i-ph-plus-circle-duotone',
      description: 'Entries that only exist in the current session.',
      count: addedRows.value.length,
      delta: sumDelta(addedRows.value),
      rows: addedRows.value.slice(0, TABLE_LIMIT),
    },
    {
      id: 'removed',
      label: 'Removed',
      icon: 'i-ph-minus-circle-duotone',
      description: 'Entries that existed before but are missing now.',
      count: removedRows.value.length,
      delta: sumDelta(removedRows.value),
      rows: removedRows.value.slice(0, TABLE_LIMIT),
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

function changedEntries<T extends { status: SessionCompareChangeStatus }>(items: T[] | undefined) {
  return (items ?? [])
    .filter(item => item.status !== 'unchanged')
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
      hidden: shouldHideZeroStat(resolve, baseline?.resolve),
    },
    {
      value: formatValue(load, 'duration'),
      label: 'load',
      tone: getStatTone(load, baseline?.load),
      hidden: shouldHideZeroStat(load, baseline?.load),
    },
    {
      value: formatValue(transform, 'duration'),
      label: 'transform',
      tone: getStatTone(transform, baseline?.transform),
      hidden: shouldHideZeroStat(transform, baseline?.transform),
    },
  ].filter(stat => !stat.hidden)
}

function shouldHideZeroStat(value: number, baseline: number | undefined) {
  return value === 0 && (baseline == null || baseline === 0)
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

function getSummaryTone(index: number, value: number, baseline: number | undefined): SummaryTone | undefined {
  if (index === 0 || baseline == null || value === baseline)
    return undefined
  return value > baseline ? 'increase' : 'decrease'
}

function getPackageSummaryStats(index: number) {
  const stats = index === 0
    ? props.details?.sessionStats.previous
    : props.details?.sessionStats.current

  return {
    packages: stats?.packages ?? 0,
    duplicatedPackages: stats?.duplicatedPackages ?? 0,
    codeSize: sumCompareSide(props.details?.packages, index, item => item.previous, item => item.current),
  }
}

function getPluginSummaryStats(index: number, session: NormalizedSessionCompareContext | undefined) {
  return {
    plugins: session?.meta?.plugins.length ?? 0,
    calls: sumCompareSide(props.details?.plugins, index, item => item.previousCalls, item => item.currentCalls),
    duration: sumCompareSide(props.details?.plugins, index, item => item.previous, item => item.current),
  }
}

function sumCompareSide<T>(items: T[] | undefined, index: number, getPrevious: (item: T) => number, getCurrent: (item: T) => number) {
  return (items ?? []).reduce((total, item) => total + (index === 0 ? getPrevious(item) : getCurrent(item)), 0)
}

function sumDelta(rows: SplitDiffRow[]) {
  return rows.reduce((total, row) => total + row.delta, 0)
}
</script>

<template>
  <div flex="~ col" border="~ base rounded-lg" p3 min-h-0 flex-1>
    <div py3 px2 flex="~ items-center gap-2">
      <div :class="activeTabMeta?.icon" />
      {{ activeTabMeta?.label }}
    </div>
    <CompareSessionMeta :sessions="props.sessions" :summaries="sessionSummaries" />

    <div flex-1 min-h-0 of-auto pt3>
      <template v-if="props.tab === 'overview'">
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
              :title="item.description"
              :class="activeDiffMode === item.id ? 'border-active bg-active' : 'border-base hover:bg-active'"
              @click="activeDiffMode = item.id"
            >
              <div flex="~ items-center gap-2" text-sm>
                <span :class="item.icon" op60 />
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
                  session-label="Session B"
                  :title="row.currentTitle || row.key"
                  :title-meta="row.currentTitleMeta"
                  :subtitle="row.currentSubtitle"
                  :badges="row.currentBadges"
                  :stats="row.currentStats"
                  :delta="row.delta"
                  :format="row.format"
                />
              </div>
            </template>

            <template v-else>
              <div grid="~ cols-2 gap-3">
                <CompareSingleSideRow
                  v-for="row of activeDiffOption.rows"
                  :key="row.key"
                  session-label="Session A"
                  :title="row.previousTitle || row.key"
                  :title-meta="row.previousTitleMeta"
                  :subtitle="row.previousSubtitle"
                  :badges="row.previousBadges"
                  :stats="row.previousStats"
                  :delta="row.delta"
                  :format="row.format"
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
</template>
