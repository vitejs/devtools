<script setup lang="ts">
import type * as Monaco from 'modern-monaco/editor-core'
import { isDark } from '@vitejs/devtools-ui/composables/dark'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { applyMonacoTheme, createReadOnlyMonacoEditor, getMonaco, getMonacoWordWrap } from '~/composables/monaco'
import { settings } from '~/state/settings'

const props = defineProps<{
  code: string
}>()

const codeEl = useTemplateRef('codeEl')
let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let model: Monaco.editor.ITextModel | null = null
let contentSizeDisposable: Monaco.IDisposable | null = null

function updateEditorHeight() {
  if (!editor || !codeEl.value)
    return

  const contentHeight = Math.max(editor.getContentHeight(), 80)
  codeEl.value.style.height = `${contentHeight}px`
  editor.layout()
}

onMounted(async () => {
  if (!codeEl.value)
    return

  monaco = await getMonaco()

  model = monaco.editor.createModel(props.code, 'javascript')
  editor = createReadOnlyMonacoEditor(monaco, codeEl.value, {
    scrollbar: {
      vertical: 'hidden',
      verticalScrollbarSize: 0,
    },
    wordWrap: getMonacoWordWrap(settings.value.codeviewerLineWrap),
  })

  editor.setModel(model)
  contentSizeDisposable = editor.onDidContentSizeChange(updateEditorHeight)
  applyMonacoTheme(monaco)
  updateEditorHeight()
})

watch(
  () => props.code,
  (value) => {
    if (!editor || !model || value === model.getValue())
      return
    model.setValue(value)
    editor.setScrollTop(0)
    editor.setScrollLeft(0)
    updateEditorHeight()
  },
)

watch(
  () => settings.value.codeviewerLineWrap,
  (enabled) => {
    editor?.updateOptions({
      wordWrap: getMonacoWordWrap(enabled),
    })
  },
  { immediate: true },
)

watch(isDark, () => {
  if (monaco)
    applyMonacoTheme(monaco)
})

onBeforeUnmount(() => {
  contentSizeDisposable?.dispose()
  editor?.dispose()
  model?.dispose()
})
</script>

<template>
  <div ref="codeEl" class="code-viewer" />
</template>
