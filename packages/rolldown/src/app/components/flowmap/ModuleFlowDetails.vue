<script setup lang="ts">
import type { RolldownChunkInfo, RolldownModuleFlowNode, RolldownResolveInfo, SessionContext } from '~~/shared/types'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import DisplayIconButton from '@vitejs/devtools-ui/components/Display/DisplayIconButton.vue'
import PluginName from '@vitejs/devtools-ui/components/Display/DisplayPluginName.vue'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'

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

const resolveInfo = computed<RolldownResolveInfo | null>(() => {
  if (!props.selected || !('type' in props.selected))
    return null
  return props.selected.type === 'resolve' ? props.selected : null
})

const importerModule = computed(() => {
  const importer = resolveInfo.value?.importer
  if (!importer)
    return undefined
  return props.session.modulesList.find(m => m.id === importer)
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
    <template v-if="selected?.type === 'chunk'">
      <div class="p4 h-full of-auto" style="overscroll-behavior: contain">
        <DataChunkDetails
          :chunk="selected"
          :session="session"
        />
      </div>
    </template>
    <template v-else-if="selected?.type === 'asset'">
      <div class="p4 h-full of-auto" style="overscroll-behavior: contain">
        <DataAssetDetails
          :asset="selected"
          :session="session"
          :lazy="true"
        />
      </div>
    </template>
    <template v-else-if="codeDisplay?.from && codeDisplay?.to">
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
    <template v-else-if="resolveInfo">
      <div class="pl4 p2 font-mono border-b border-base flex items-center gap-2">
        <PluginName :name="resolveInfo.plugin_name" />
        <span class="op50 text-xs">Resolve</span>
        <div class="flex-auto" />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div class="p4 h-full of-auto flex flex-col gap-3" style="overscroll-behavior: contain">
        <div class="flex flex-col gap-1">
          <span class="op50 text-xs uppercase tracking-wide">Resolved ID</span>
          <DisplayModuleId
            v-if="resolveInfo.resolved_id"
            :id="resolveInfo.resolved_id"
            :session="session"
            link
            class="font-mono text-sm"
          />
          <span v-else class="op50 italic text-sm">null (not resolved)</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="op50 text-xs uppercase tracking-wide">Module Request</span>
          <code class="font-mono text-sm bg-active px2 py1 rounded">{{ resolveInfo.module_request }}</code>
        </div>
        <div v-if="resolveInfo.importer" class="flex flex-col gap-1">
          <span class="op50 text-xs uppercase tracking-wide">Importer</span>
          <DisplayModuleId
            :id="resolveInfo.importer"
            :session="session"
            :link="!!importerModule"
            class="font-mono text-sm"
          />
        </div>
        <div class="flex gap-6">
          <div class="flex flex-col gap-1">
            <span class="op50 text-xs uppercase tracking-wide">Import Kind</span>
            <code class="font-mono text-sm">{{ resolveInfo.import_kind }}</code>
          </div>
          <div class="flex flex-col gap-1">
            <span class="op50 text-xs uppercase tracking-wide">Duration</span>
            <DisplayDuration :duration="resolveInfo.duration" :color="true" :factor="5" />
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="selected && 'type' in selected && (selected.type === 'transform' || selected.type === 'load')">
      <div class="pl4 p2 font-mono border-b border-base flex items-center gap-2">
        <PluginName :name="selected.plugin_name" />
        <span class="op50 text-xs">{{ selected.type === 'load' ? 'Load' : 'Transform' }}</span>
        <div class="flex-auto" />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div class="p4 h-full flex flex-col gap-3 items-center justify-center">
        <div class="i-ph-empty-duotone text-4xl op30" />
        <span class="op50 text-sm">
          {{ selected.type === 'load' ? 'No content loaded' : 'No changes made' }}
        </span>
        <div class="flex gap-4 items-center">
          <DisplayDuration :duration="selected.duration" :color="true" :factor="5" />
          <template v-if="selected.type === 'transform'">
            <div class="font-mono text-xs flex gap-1 items-center">
              <span class="text-green">+{{ selected.diff_added }}</span>
              <span class="text-red">-{{ selected.diff_removed }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
    <template v-else-if="selected && 'type' in selected && (selected.type === 'no_changes_collapsed' || selected.type === 'no_changes_hide')">
      <div class="pl4 p2 font-mono border-b border-base flex items-center gap-2">
        <span class="text-sm">Collapsed Plugins</span>
        <div class="flex-auto" />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div class="p4 h-full flex flex-col gap-3 items-center justify-center">
        <div class="i-ph-stack-duotone text-4xl op30" />
        <span class="op50 text-sm text-center">
          {{ selected.count }} plugins did not change the content
        </span>
        <div class="flex gap-2 items-center">
          <span class="op50 text-xs">Total duration:</span>
          <DisplayDuration :duration="selected.duration" :color="true" :factor="5" />
        </div>
      </div>
    </template>
    <span v-else class="op50 italic ma">
      No data
    </span>
  </div>
</template>
