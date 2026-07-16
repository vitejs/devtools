<script setup lang="ts">
import CodeDiffEditor from '@vitejs/devtools-ui/components/Code/CodeDiffEditor.vue'
import { settings } from '~/state/settings'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <CodeDiffEditor
    v-bind="$attrs"
    v-model:diff-panel-size="settings.codeviewerDiffPanelSize"
    :line-wrap="settings.codeviewerLineWrap"
  />
</template>
