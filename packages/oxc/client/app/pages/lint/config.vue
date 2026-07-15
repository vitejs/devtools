<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { parse, iterator } from '@humanwhocodes/momoa'
import type { MemberNode, ObjectNode, StringNode } from '@humanwhocodes/momoa'
import { vitesseLight, vitesseDark } from 'codemirror-theme-vitesse'
import { useAsyncState } from '@vueuse/core'

const rpc = useRpc()

const { state: configData, isReady } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-lint-config-file'),
  null,
)

const OXC_RULES_BASE = 'https://oxc.rs/docs/guide/usage/linter/rules'
const CONFIG_REF_BASE = 'https://oxc.rs/docs/guide/usage/linter/config-file-reference.html'
const DEFAULT_DOC_URL = 'https://oxc.rs/docs/guide/usage/linter.html'

const CONFIG_SECTION_URLS = {
  categories: `${CONFIG_REF_BASE}#categories`,
  plugins: `${CONFIG_REF_BASE}#plugins`,
  ignorePatterns: `${CONFIG_REF_BASE}#ignorepatterns`,
  env: `${CONFIG_REF_BASE}#env`,
  extends: `${CONFIG_REF_BASE}#extends`,
  globals: `${CONFIG_REF_BASE}#globals`,
  jsPlugins: `${CONFIG_REF_BASE}#jsplugins`,
  overrides: `${CONFIG_REF_BASE}#overrides`,
  settings: `${CONFIG_REF_BASE}#settings`,
  $schema: `${CONFIG_REF_BASE}#schema`,
} as const

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
const themeCompartment = new Compartment()
let view: InstanceType<typeof EditorView> | null = null

interface RuleRange {
  key: string
  from: number
  to: number
}

interface SectionRange {
  from: number
  to: number
}

interface ConfigRanges {
  categories: SectionRange | null
  plugins: SectionRange | null
  ignorePatterns: SectionRange | null
  env: SectionRange | null
  extends: SectionRange | null
  globals: SectionRange | null
  jsPlugins: SectionRange | null
  overrides: SectionRange | null
  settings: SectionRange | null
  rules: { from: number; to: number; members: RuleRange[] } | null
  $schema: SectionRange | null
}

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
  const ast = parse(content, { ranges: true, mode: 'json5' })
  const root = ast.body
  if (root.type !== 'Object') return

  const result: ConfigRanges = {
    categories: null,
    plugins: null,
    ignorePatterns: null,
    env: null,
    extends: null,
    globals: null,
    jsPlugins: null,
    overrides: null,
    settings: null,
    rules: null,
    $schema: null,
  }

  const SECTION_KEYS = [
    'categories',
    'plugins',
    'ignorePatterns',
    'env',
    'extends',
    'globals',
    'jsPlugins',
    'overrides',
    'settings',
    '$schema',
  ] as const

  const rootObject = root as ObjectNode

  for (const { node, parent } of iterator(ast, ({ phase }) => phase === 'enter')) {
    if (node.type === 'Member') {
      const member = node as MemberNode
      const name =
        member.name.type === 'String'
          ? (member.name as StringNode).value
          : (member.name as { name: string }).name

      const { from, to } = getMemberRange(member, content)

      if (parent !== rootObject) continue

      if (SECTION_KEYS.includes(name as (typeof SECTION_KEYS)[number]))
        result[name as (typeof SECTION_KEYS)[number]] = { from, to }
      else if (name === 'rules' && member.value.type === 'Object') {
        const rulesObject = member.value as ObjectNode
        const members: RuleRange[] = rulesObject.members.map(m => {
          const key =
            m.name.type === 'String'
              ? (m.name as StringNode).value
              : (m.name as { name: string }).name
          const { from, to } = getMemberRange(m, content)
          return { key, from, to }
        })
        result.rules = {
          from,
          to,
          members,
        }
      }
    }
  }

  configRanges = result
}

function getRuleDocUrl(ruleKey: string): string {
  const slash = ruleKey.indexOf('/')
  const scope = slash === -1 ? 'eslint' : ruleKey.slice(0, slash).replace(/-/g, '_')
  const value = slash === -1 ? ruleKey : ruleKey.slice(slash + 1)
  return `${OXC_RULES_BASE}/${scope}/${value}.html`
}

function getDocUrlAtCursor(pos: number, content: string): string {
  if (!configRanges) return DEFAULT_DOC_URL

  const { rules, ...sections } = configRanges

  for (const [key, range] of Object.entries(sections)) {
    if (range && pos >= range.from && pos <= range.to) {
      const url = CONFIG_SECTION_URLS[key as keyof typeof CONFIG_SECTION_URLS]
      if (url) return url
    }
  }

  if (rules && pos >= rules.from && pos <= rules.to) {
    for (const { key, from, to } of rules.members) {
      if (pos >= from && pos <= to) return getRuleDocUrl(key)
    }
    const lineFrom = content.lastIndexOf('\n', pos) + 1
    const lineTo = content.indexOf('\n', pos)
    const line = content.slice(lineFrom, lineTo === -1 ? content.length : lineTo)
    const keyMatch = line.match(/"([^"]+)"\s*:/)
    const ruleKey = keyMatch?.[1]
    if (ruleKey) return getRuleDocUrl(ruleKey)
  }

  return DEFAULT_DOC_URL
}

function updateDocUrlFromCursor(editorView: InstanceType<typeof EditorView>) {
  const content = editorView.state.doc.toString()
  const pos = editorView.state.selection.main.head
  const url = getDocUrlAtCursor(pos, content)
  if (currentDocUrl.value !== url) {
    currentDocUrl.value = url
    iframeLoading.value = true
  }
}

const initialized = ref(false)

function initEditor() {
  if (!editorRef.value || initialized.value || !isReady.value) return

  const content = configData.value ?? '{}'
  initConfigRanges(content)

  view = new EditorView({
    parent: editorRef.value,
    doc: content,
    extensions: [
      basicSetup,
      json(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      themeCompartment.of(isDark.value ? vitesseDark : vitesseLight),
      EditorView.updateListener.of(update => {
        if (update.selectionSet) {
          updateDocUrlFromCursor(update.view)
        }
      }),
      EditorView.domEventHandlers({
        click: (_event, editorView) => {
          updateDocUrlFromCursor(editorView)
        },
      }),
    ],
  })

  updateDocUrlFromCursor(view)
  initialized.value = true
}

watch([editorRef, isReady], () => initEditor(), { immediate: true })

watch(isDark, dark => {
  view?.dispatch({ effects: themeCompartment.reconfigure(dark ? vitesseDark : vitesseLight) })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
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
        <div ref="editorRef" class="h-full min-h-[200px] lg:min-h-0 overflow-auto" />
      </div>
      <div class="flex-1 min-h-[200px] lg:min-h-0 min-w-0 relative">
        <iframe
          :src="currentDocUrl"
          class="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="Rule documentation"
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
.cm-editor {
  height: 100%;
}
</style>
