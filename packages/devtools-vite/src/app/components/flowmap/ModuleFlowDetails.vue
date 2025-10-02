<script setup lang="ts">
import type { RolldownChunkInfo, RolldownModuleFlowNode, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'
import PluginName from '../display/PluginName.vue'

const props = defineProps<{
  selected: RolldownChunkInfo | RolldownModuleFlowNode | null
  session: SessionContext
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const codeDisplay = computed(() => {
  if (!props.selected)
    return null
  if (!('type' in props.selected))
    return null
  if (props.selected.type === 'transform') {
    return {
      type: 'transform',
      plugin_name: props.selected.plugin_name,
      from: props.selected.content_from,
      to: props.selected.content_to,
    }
  }
  else if (props.selected.type === 'load') {
    return {
      type: 'load',
      from: '',
      plugin_name: props.selected.plugin_name,
      to: props.selected.content,
    }
  }
  return null
})

const nodeDetails = computed(() => {
  if (!props.selected || !('type' in props.selected))
    return null

  const node = props.selected
  const type = node.type

  if (type === 'resolve') {
    return {
      title: 'Resolve',
      fields: [
        { label: 'Plugin', value: node.plugin_name },
        { label: 'Module Request', value: node.module_request },
        { label: 'Resolved ID', value: node.resolved_id || 'Not resolved' },
        { label: 'Importer', value: node.importer || 'None' },
        { label: 'Import Kind', value: node.import_kind },
        { label: 'Duration', value: `${node.duration.toFixed(2)}ms` },
      ],
    }
  }
  else if (type === 'no_changes_collapsed' || type === 'no_changes_hide') {
    return {
      title: 'No Changes',
      fields: [
        { label: 'Type', value: type === 'no_changes_collapsed' ? 'Collapsed' : 'Hidden' },
        { label: 'Count', value: node.count.toString() },
        { label: 'Total Duration', value: `${node.duration.toFixed(2)}ms` },
      ],
    }
  }
  else if (type === 'load') {
    return {
      title: 'Load',
      fields: [
        { label: 'Plugin', value: node.plugin_name },
        { label: 'Duration', value: `${node.duration.toFixed(2)}ms` },
        { label: 'Has Content', value: node.content ? 'Yes' : 'No' },
      ],
    }
  }
  else if (type === 'transform') {
    return {
      title: 'Transform',
      fields: [
        { label: 'Plugin', value: node.plugin_name },
        { label: 'Duration', value: `${node.duration.toFixed(2)}ms` },
        { label: 'Lines Added', value: node.diff_added?.toString() || '0' },
        { label: 'Lines Removed', value: node.diff_removed?.toString() || '0' },
      ],
    }
  }

  return null
})

function handleClose() {
  emit('close')
}
</script>

<template>
  <div
    bg-glass w-full h-full
    :class="codeDisplay?.from && codeDisplay?.to ? '' : 'border-dashed'"
    border="~ base rounded-lg" of-hidden flex="~ col"
  >
    <template v-if="selected?.type === 'chunk'">
      <div p4 h-full of-auto style="overscroll-behavior: contain">
        <DataChunkDetails
          :chunk="selected"
          :session="session"
        />
      </div>
    </template>
    <template v-else-if="selected?.type === 'asset'">
      <div p4 h-full of-auto style="overscroll-behavior: contain">
        <DataAssetDetails
          :asset="selected"
          :session="session"
          :lazy="true"
        />
      </div>
    </template>
    <template v-else-if="codeDisplay?.from && codeDisplay?.to">
      <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2">
        <PluginName :name="codeDisplay?.plugin_name ?? ''" />
        <span v-if="codeDisplay?.type" op50 text-xs>
          {{ codeDisplay?.type === 'load' ? 'Load' : 'Transform' }}
        </span>
        <div flex-auto />
        <DisplayIconButton
          title="Line Wrapping"
          class-icon="i-carbon-text-wrap"
          :active="settings.codeviewerLineWrap"
          @click="settings.codeviewerLineWrap = !settings.codeviewerLineWrap"
        />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <CodeDiffEditor
        :from="codeDisplay?.from ?? ''"
        :to="codeDisplay?.to ?? ''"
        :diff="true"
        :one-column="false"
      />
    </template>
    <template v-else-if="nodeDetails">
      <div flex="~ col" h-full of-auto p4>
        <div flex="~ items-center gap-2" mb4 pb2 border="b base">
          <h3 text-lg font-semibold>
            {{ nodeDetails.title }}
          </h3>
          <div flex-auto />
          <DisplayCloseButton @click.stop="handleClose" />
        </div>
        <div flex="~ col gap-3">
          <div
            v-for="field in nodeDetails.fields"
            :key="field.label"
            flex="~ col gap-1"
          >
            <div text-sm op50>
              {{ field.label }}
            </div>
            <div font-mono text-sm break-all>
              {{ field.value }}
            </div>
          </div>
        </div>
      </div>
    </template>
    <span v-else op50 italic ma>
      No data
    </span>
  </div>
</template>
