<script setup lang="ts">
import type { ViteFlowNode } from './NodeModuleInfo.vue'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import DisplayIconButton from '@vitejs/devtools-ui/components/Display/DisplayIconButton.vue'
import PluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'
import { computed } from 'vue'
import { settings } from '~/state/settings'

const props = defineProps<{
  selected: ViteFlowNode | null
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
    class="bg-glass w-full h-full border border-base rounded-lg of-hidden flex flex-col"
    :class="codeDisplay?.from && codeDisplay?.to ? '' : 'border-dashed'"
  >
    <template v-if="codeDisplay?.from && codeDisplay?.to">
      <div class="pl4 p2 font-mono border-b border-base flex items-center gap-2">
        <PluginName :name="codeDisplay?.plugin_name ?? ''" />
        <span v-if="codeDisplay?.type" class="op50 text-xs">
          {{ codeDisplay?.type === 'load' ? 'Load' : 'Transform' }}
        </span>
        <div class="flex-auto" />
        <DisplayIconButton
          title="Line Wrapping"
          class-icon="i-ph-arrow-u-down-left-duotone"
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
    <!-- TODO: show more info with selected node -->
    <span v-else class="op50 italic ma">
      No data
    </span>
  </div>
</template>
