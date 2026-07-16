<script setup lang="ts">
import type * as Monaco from 'modern-monaco/editor-core'
import { parse, iterator } from '@humanwhocodes/momoa'
import type { MemberNode, ObjectNode, StringNode } from '@humanwhocodes/momoa'
import { useAsyncState } from '@vueuse/core'
import { applyMonacoTheme, createReadOnlyMonacoEditor, getMonaco } from '~/composables/monaco'

const rpc = useRpc()

const { state: configData, isReady } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-fmt-config-file'),
  null,
)

const CONFIG_REF_BASE = 'https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html'
const DEFAULT_DOC_URL = 'https://oxc.rs/docs/guide/usage/formatter.html'

const KNOWN_OPTIONS = new Set([
  'arrowParens',
  'bracketSameLine',
  'bracketSpacing',
  'embeddedLanguageFormatting',
  'endOfLine',
  'htmlWhitespaceSensitivity',
  'ignorePatterns',
  'insertFinalNewline',
  'jsxSingleQuote',
  'objectWrap',
  'overrides',
  'printWidth',
  'proseWrap',
  'quoteProps',
  'semi',
  'singleAttributePerLine',
  'singleQuote',
  'sortImports',
  'sortPackageJson',
  'sortTailwindcss',
  'tabWidth',
  'trailingComma',
  'useTabs',
  'vueIndentScriptAndStyle',
  '$schema',
  'experimentalSortPackageJson',
])

const colorMode = useColorMode()
const isDark = computed(
  () =>
    colorMode.value === 'dark' ||
    (colorMode.value === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches),
)
const editorRef = ref<HTMLDivElement | null>(null)
const currentDocUrl = ref(DEFAULT_DOC_URL)
const iframeLoading = ref(true)
let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let model: Monaco.editor.ITextModel | null = null
let cursorDisposable: Monaco.IDisposable | null = null

interface SectionRange {
  from: number
  to: number
}

type ConfigRanges = Record<string, SectionRange | null>

let configRanges: ConfigRanges | null = null

function getMemberRange(member: MemberNode, content: string): { from: number; to: number } {
  const keyRange = member.name.range ?? [member.name.loc.start.offset, member.name.loc.end.offset]
  const valueRange = member.value.range ?? [
    member.value.loc.start.offset,
    member.value.loc.end.offset,
  ]
  const from = Math.min(keyRange[0], valueRange[0])
  let to = Math.max(keyRange[1], valueRange[1])
  const afterValue = content.slice(to)
  const commaMatch = afterValue.match(/^\s*,/)
  if (commaMatch) to += commaMatch[0].length
  return { from, to }
}

function initConfigRanges(content: string) {
  try {
    const ast = parse(content, { ranges: true, mode: 'json5' })
    const root = ast.body
    if (root.type !== 'Object') return

    const result: ConfigRanges = {}
    const rootObject = root as ObjectNode

    for (const { node, parent } of iterator(ast, ({ phase }) => phase === 'enter')) {
      if (node.type === 'Member') {
        const member = node as MemberNode
        const name =
          member.name.type === 'String'
            ? (member.name as StringNode).value
            : (member.name as { name: string }).name

        if (parent !== rootObject) continue

        const { from, to } = getMemberRange(member, content)
        result[name] = { from, to }
      }
    }

    configRanges = result
  } catch {
    configRanges = null
  }
}

function getDocUrlAtCursor(pos: number, _content: string): string {
  if (!configRanges) return DEFAULT_DOC_URL

  for (const [key, range] of Object.entries(configRanges)) {
    if (range && pos >= range.from && pos <= range.to) {
      if (KNOWN_OPTIONS.has(key)) {
        const anchor = key === '$schema' ? 'schema' : key
        return `${CONFIG_REF_BASE}#${anchor.toLowerCase()}`
      }
      return DEFAULT_DOC_URL
    }
  }

  return DEFAULT_DOC_URL
}

function updateDocUrlFromCursor() {
  if (!editor || !model) return
  const position = editor.getPosition()
  if (!position) return
  const content = model.getValue()
  const pos = model.getOffsetAt(position)
  const url = getDocUrlAtCursor(pos, content)
  if (currentDocUrl.value !== url) {
    currentDocUrl.value = url
    iframeLoading.value = true
  }
}

const initialized = ref(false)

async function initEditor() {
  if (!editorRef.value || initialized.value || !isReady.value) return

  const content = configData.value ?? '{}'
  initConfigRanges(content)

  // Claim the slot synchronously so the reactive watcher can't kick off a
  // second init while `getMonaco` is awaited.
  initialized.value = true

  monaco = await getMonaco(isDark.value)

  if (!editorRef.value) return

  model = monaco.editor.createModel(content, 'json')
  editor = createReadOnlyMonacoEditor(monaco, editorRef.value)
  editor.setModel(model)

  applyMonacoTheme(monaco, isDark.value)

  cursorDisposable = editor.onDidChangeCursorPosition(() => updateDocUrlFromCursor())

  updateDocUrlFromCursor()
}

watch([editorRef, isReady], () => initEditor(), { immediate: true })

watch(isDark, dark => {
  if (monaco) applyMonacoTheme(monaco, dark)
})

onBeforeUnmount(() => {
  cursorDisposable?.dispose()
  editor?.dispose()
  model?.dispose()
  editor = null
  model = null
})
</script>

<template>
  <div class="h-[calc(100vh-4rem)] max-w-7xl p-4 mx-auto">
    <Back to="/" />
    <div
      class="flex flex-col h-full lg:flex-row border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-950"
    >
      <div
        class="flex-1 min-h-0 min-w-0 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-700"
      >
        <div ref="editorRef" class="h-full min-h-[200px] lg:min-h-0" />
      </div>
      <div class="flex-1 min-h-[200px] lg:min-h-0 min-w-0 relative">
        <iframe
          :src="currentDocUrl"
          class="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="Formatter configuration documentation"
          @load="iframeLoading = false"
        />
        <Transition
          enter-active-class="transition-opacity duration-150"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-show="iframeLoading"
            class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 pointer-events-none"
          >
            <span
              class="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-500 dark:border-neutral-600 dark:border-t-primary-400"
              aria-hidden="true"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style>
.monaco-editor,
.monaco-editor .overflow-guard {
  width: 100% !important;
  height: 100% !important;
}
</style>
