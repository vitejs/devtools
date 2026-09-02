<script setup lang="ts">
import CodeDiffEditor from '@vitejs/devtools-ui/components/Code/CodeDiffEditor.vue'
import { settings } from '~/state/settings'

defineProps<{
  from: string
  to: string
  oneColumn: boolean
  diff: boolean
}>()
</script>

<template>
  <CodeDiffEditor
    v-bind="$props"
    v-model:diff-panel-size="settings.codeviewerDiffPanelSize"
    :line-wrap="settings.codeviewerLineWrap"
  />
</template>
