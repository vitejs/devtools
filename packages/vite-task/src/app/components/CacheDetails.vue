<script setup lang="ts">
import type { StepCache } from '../../shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import { computed } from 'vue'
import { cacheChangeHue, cacheLabel } from '../utils/task-plan'
import CacheFileList from './CacheFileList.vue'
import CacheStatusBadge from './CacheStatusBadge.vue'
import TaskFilePath from './TaskFilePath.vue'

const props = withDefaults(defineProps<{ cache: StepCache, mode?: 'summary' | 'details' }>(), { mode: 'details' })
const label = computed(() => cacheLabel(props.cache.status))

const inputs = computed(() => Object.entries(props.cache.baseline?.fingerprint?.inputs ?? {}).map(([path, fingerprint]) => ({ path, fingerprint })))
const outputs = computed(() => Array.isArray(props.cache.baseline?.outputs) ? props.cache.baseline.outputs.map(path => ({ path })) : [])

function format(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}
</script>

<template>
  <template v-if="mode === 'summary'">
    <span v-if="label || cache.baseline" class="inline-flex items-center gap2 text-xs">
      <CacheStatusBadge :status="cache.status" />
      <DisplayDuration v-if="cache.baseline" v-tooltip="'Duration of the cached run'" :duration="cache.baseline.durationMs" />
    </span>
  </template>
  <div v-else class="w-fit max-w-[min(100%,48rem)] text-xs">
    <p v-if="cache.message" class="break-words">
      {{ cache.message }}
    </p>
    <p v-if="cache.changesPartial" class="text-amber mb0">
      Only some reasons are listed.
    </p>
    <details v-if="cache.changes?.length" open class="mt2">
      <summary class="cursor-pointer text-sm">
        <span class="op60">Changes ({{ cache.changes.length }})</span>
      </summary>
      <ul aria-label="Changes" class="list-none p0 mt2 mb0 flex flex-col gap1">
        <li v-for="(change, index) in cache.changes" :key="index" class="rounded border border-base px2 py1 text-sm hover:bg-active">
          <div class="flex items-center gap1.5">
            <i v-if="change.kind === 'file'" class="i-ph-cube-duotone text-teal text-sm shrink-0" role="img" aria-label="File" title="File" />
            <span v-else class="op-fade">{{ change.kind }}</span>
            <TaskFilePath v-if="change.path" :path="change.path" compact />
            <code v-else class="break-all">{{ change.name || change.setting }}</code>
            <DisplayBadge v-if="change.change" :text="change.change" :color="cacheChangeHue(change.change)" class="ml-auto shrink-0" />
          </div>
          <div v-if="change.from !== undefined" class="mt1 font-mono break-all whitespace-pre-wrap">
            <span class="text-red" aria-label="From">− </span>{{ format(change.from) }}
          </div>
          <div v-if="change.to !== undefined" class="mt1 font-mono break-all whitespace-pre-wrap">
            <span class="text-green" aria-label="To">+ </span>{{ format(change.to) }}
          </div>
        </li>
      </ul>
    </details>
    <div v-if="cache.baseline" class="mt2">
      <div v-if="cache.baseline.fingerprint?.env?.length" class="flex flex-wrap items-baseline gap2 px1 py2">
        <span class="op65">Environment</span>
        <code v-for="name in cache.baseline.fingerprint.env" :key="name" class="break-all">{{ name }}</code>
      </div>
      <CacheFileList v-if="inputs.length" label="Inputs" :files="inputs" />
      <p v-if="!cache.baseline.fingerprint" class="my2 op65">
        No input fingerprint was reported for this cached run.
      </p>
      <CacheFileList v-if="outputs.length" label="Outputs" :files="outputs" />
      <p v-else-if="typeof cache.baseline.outputs === 'string'" class="my2 op65">
        {{ cache.baseline.outputs === 'notDownloaded' ? 'Remote outputs have not been downloaded.' : cache.baseline.outputs }}
      </p>
    </div>
  </div>
</template>
