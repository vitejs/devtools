<script setup lang="ts">
import type * as Monaco from 'modern-monaco/editor-core'
import { isDark } from '@vitejs/devtools-ui/composables/dark'
import { Pane, Splitpanes } from 'splitpanes'
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { applyMonacoTheme, getMonaco, guessMonacoLanguage, setupMonacoScrollSync, syncMonacoEditorScrolls } from '~/composables/monaco'
import { settings } from '~/state/settings'
import { calculateDiffWithWorker } from '~/worker/diff'

const props = defineProps<{
  from: string
  to: string
  oneColumn: boolean
  diff: boolean
}>()

const fromEl = useTemplateRef('fromEl')
const toEl = useTemplateRef('toEl')

let monaco: typeof Monaco | null = null
let fromEditor: Monaco.editor.IStandaloneCodeEditor | null = null
let toEditor: Monaco.editor.IStandaloneCodeEditor | null = null
let fromModel: Monaco.editor.ITextModel | null = null
let toModel: Monaco.editor.ITextModel | null = null
let fromDecorations: Monaco.editor.IEditorDecorationsCollection | null = null
let toDecorations: Monaco.editor.IEditorDecorationsCollection | null = null
let disposeScrollSync: (() => void) | null = null
let diffVersion = 0

function createReadOnlyEditor(container: HTMLElement) {
  if (!monaco)
    throw new Error('Monaco is not initialized')

  return monaco.editor.create(container, {
    automaticLayout: true,
    fontFamily: '\'Input Mono\', \'FiraCode\', monospace',
    fontSize: 13,
    lineNumbers: 'on',
    minimap: { enabled: false },
    readOnly: true,
    renderLineHighlight: 'none',
    scrollBeyondLastLine: false,
    wordWrap: settings.value.codeviewerLineWrap ? 'on' : 'off',
  })
}

function setModelValue(model: Monaco.editor.ITextModel, value: string) {
  if (model.getValue() !== value)
    model.setValue(value)
}

function applyDiffDecorations(changes: Array<[number, string]>) {
  if (!monaco || !fromModel || !toModel || !fromDecorations || !toDecorations)
    return

  const fromEntries: Monaco.editor.IModelDeltaDecoration[] = []
  const toEntries: Monaco.editor.IModelDeltaDecoration[] = []

  const addedLines = new Set<number>()
  const removedLines = new Set<number>()

  let fromIndex = 0
  let toIndex = 0

  for (const [type, change] of changes) {
    if (type === 1) {
      const start = toModel.getPositionAt(toIndex)
      toIndex += change.length
      const end = toModel.getPositionAt(toIndex)

      if (start.lineNumber !== end.lineNumber || start.column !== end.column) {
        toEntries.push({
          range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
          options: {
            inlineClassName: 'diff-added-inline',
          },
        })
      }

      for (let i = start.lineNumber; i <= end.lineNumber; i++)
        addedLines.add(i)
    }
    else if (type === -1) {
      const start = fromModel.getPositionAt(fromIndex)
      fromIndex += change.length
      const end = fromModel.getPositionAt(fromIndex)

      if (start.lineNumber !== end.lineNumber || start.column !== end.column) {
        fromEntries.push({
          range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
          options: {
            inlineClassName: 'diff-removed-inline',
          },
        })
      }

      for (let i = start.lineNumber; i <= end.lineNumber; i++)
        removedLines.add(i)
    }
    else {
      fromIndex += change.length
      toIndex += change.length
    }
  }

  for (const line of removedLines) {
    fromEntries.push({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        className: 'diff-removed',
        isWholeLine: true,
      },
    })
  }

  for (const line of addedLines) {
    toEntries.push({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        className: 'diff-added',
        isWholeLine: true,
      },
    })
  }

  fromDecorations.set(fromEntries)
  toDecorations.set(toEntries)
}

onMounted(async () => {
  if (!fromEl.value || !toEl.value)
    return

  monaco = await getMonaco()

  fromEditor = createReadOnlyEditor(fromEl.value)
  toEditor = createReadOnlyEditor(toEl.value)

  fromModel = monaco.editor.createModel(props.from, guessMonacoLanguage(props.from))
  toModel = monaco.editor.createModel(props.to, guessMonacoLanguage(props.to))

  fromEditor.setModel(fromModel)
  toEditor.setModel(toModel)

  fromDecorations = fromEditor.createDecorationsCollection()
  toDecorations = toEditor.createDecorationsCollection()

  disposeScrollSync = setupMonacoScrollSync(fromEditor, toEditor)

  applyMonacoTheme(monaco)

  if (!props.oneColumn)
    syncMonacoEditorScrolls(toEditor, fromEditor)
})

watch(
  () => settings.value.codeviewerLineWrap,
  (enabled) => {
    const wordWrap = enabled ? 'on' : 'off'
    fromEditor?.updateOptions({ wordWrap })
    toEditor?.updateOptions({ wordWrap })
  },
  { immediate: true },
)

watch(isDark, () => {
  if (monaco)
    applyMonacoTheme(monaco)
})

watch(
  () => props.oneColumn,
  async (oneColumn) => {
    if (!fromEditor || !toEditor)
      return

    fromEl.value!.style.display = oneColumn ? 'none' : ''

    await nextTick()

    fromEditor.layout()
    toEditor.layout()

    if (!oneColumn)
      syncMonacoEditorScrolls(toEditor, fromEditor)
  },
  { immediate: true },
)

watch(
  () => [props.from, props.to, props.diff] as const,
  async ([from, to, diffEnabled]) => {
    if (!monaco || !fromModel || !toModel || !fromDecorations || !toDecorations)
      return

    const currentVersion = ++diffVersion

    setModelValue(fromModel, from)
    setModelValue(toModel, to)

    monaco.editor.setModelLanguage(fromModel, guessMonacoLanguage(from))
    monaco.editor.setModelLanguage(toModel, guessMonacoLanguage(to))

    fromDecorations.set([])
    toDecorations.set([])

    if (!diffEnabled || !from)
      return

    const changes = await calculateDiffWithWorker(from, to)
    if (currentVersion !== diffVersion)
      return

    applyDiffDecorations(changes)
  },
  { immediate: true },
)

const leftPanelSize = computed(() => {
  return props.oneColumn
    ? 0
    : settings.value.codeviewerDiffPanelSize
})

function onUpdate(size: number) {
  fromEditor?.layout()
  toEditor?.layout()

  if (props.oneColumn)
    return

  settings.value.codeviewerDiffPanelSize = size
}

onBeforeUnmount(() => {
  disposeScrollSync?.()
  fromEditor?.dispose()
  toEditor?.dispose()
  fromModel?.dispose()
  toModel?.dispose()
})
</script>

<template>
  <Splitpanes @resize="onUpdate($event.prevPane.size)">
    <Pane v-show="!oneColumn" min-size="10" :size="leftPanelSize">
      <div ref="fromEl" h-inherit />
    </Pane>
    <Pane min-size="10" :size="100 - leftPanelSize">
      <div ref="toEl" h-inherit />
    </Pane>
  </Splitpanes>
</template>

<style lang="postcss">
.diff-added {
  --uno: bg-green-400/15;
}
.diff-removed {
  --uno: bg-red-400/15;
}
.diff-added-inline {
  --uno: bg-green-400/30;
}
.diff-removed-inline {
  --uno: bg-red-400/30;
}
</style>
