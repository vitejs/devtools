<script setup lang="ts">
import type { RolldownChunkInfo, RolldownModuleFlowNode, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'
import PluginName from '../display/PluginName.vue'

const props = defineProps<{
  selected: RolldownChunkInfo | RolldownModuleFlowNode | null
  session: SessionContext
  chunks: RolldownChunkInfo[]
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
          :chunks="chunks"
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
        <DisplayCloseButton @click="handleClose" />
      </div>
      <CodeDiffEditor
        :from="codeDisplay?.from ?? ''"
        :to="codeDisplay?.to ?? ''"
        :diff="true"
        :one-column="false"
      />
    </template>
    <!-- TODO: show more info with selected node -->
    <span v-else op50 italic ma>
      Select a node to view
    </span>
  </div>
</template>
