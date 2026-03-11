import type { TextmateTheme } from 'modern-monaco'
import type * as Monaco from 'modern-monaco/editor-core'
import { isDark } from '@vitejs/devtools-ui/composables/dark'
import { init } from 'modern-monaco'

const lightTheme: TextmateTheme = {
  type: 'light',
  name: 'rolldown-light',
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#8e8f8b',
    'editor.selectionBackground': '#44444410',
    'editorLineNumber.foreground': '#8e8f8b80',
    'editorLineNumber.activeForeground': '#8e8f8b',
    'editorGutter.background': '#00000000',
    'editor.lineHighlightBackground': '#00000000',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#a0ada0' } },
    { scope: 'string', settings: { foreground: '#b56959' } },
    { scope: ['constant.numeric', 'number'], settings: { foreground: '#296aa3' } },
    { scope: ['keyword', 'storage'], settings: { foreground: '#1c6b48' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#6c7834' } },
    { scope: ['entity.name.class', 'entity.name.type'], settings: { foreground: '#2993a3' } },
    { scope: ['variable', 'identifier'], settings: { foreground: '#ad944c' } },
    { scope: ['variable.other.property', 'meta.property-name'], settings: { foreground: '#b58451' } },
  ],
}

const darkTheme: TextmateTheme = {
  type: 'dark',
  name: 'rolldown-dark',
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#858585',
    'editor.selectionBackground': '#44444450',
    'editorLineNumber.foreground': '#88888880',
    'editorLineNumber.activeForeground': '#888888',
    'editorGutter.background': '#00000000',
    'editor.lineHighlightBackground': '#00000000',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#758575' } },
    { scope: 'string', settings: { foreground: '#d48372' } },
    { scope: ['constant.numeric', 'number'], settings: { foreground: '#6394bf' } },
    { scope: ['keyword', 'storage'], settings: { foreground: '#4d9375' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#a1b567' } },
    { scope: ['entity.name.class', 'entity.name.type'], settings: { foreground: '#54b1bf' } },
    { scope: ['variable', 'identifier'], settings: { foreground: '#c2b36e' } },
    { scope: ['variable.other.property', 'meta.property-name'], settings: { foreground: '#dd8e6e' } },
  ],
}

const lightThemeId = lightTheme.name
const darkThemeId = darkTheme.name

function getThemeId() {
  return isDark.value ? darkThemeId : lightThemeId
}

let monacoPromise: Promise<typeof Monaco> | null = null

export async function getMonaco() {
  monacoPromise ??= init({
    defaultTheme: isDark.value ? darkTheme : lightTheme,
    themes: [lightTheme, darkTheme],
  })
  return monacoPromise
}

export function applyMonacoTheme(monaco: typeof Monaco) {
  monaco.editor.setTheme(getThemeId())
}

export function getMonacoWordWrap(enabled: boolean): Monaco.editor.IStandaloneEditorConstructionOptions['wordWrap'] {
  return enabled ? 'on' : 'off'
}

const readonlyEditorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: '\'Input Mono\', \'FiraCode\', monospace',
  fontSize: 13,
  lineNumbers: 'on',
  minimap: { enabled: false },
  readOnly: true,
  renderLineHighlight: 'none',
  scrollBeyondLastLine: false,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    horizontal: 'auto',
    horizontalScrollbarSize: 6,
    useShadows: false,
    vertical: 'auto',
    verticalScrollbarSize: 6,
  },
}

export function createReadOnlyMonacoEditor(
  monaco: typeof Monaco,
  container: HTMLElement,
  options: Monaco.editor.IStandaloneEditorConstructionOptions = {},
) {
  const scrollbar = {
    ...readonlyEditorOptions.scrollbar,
    ...options.scrollbar,
  }
  return monaco.editor.create(container, {
    ...readonlyEditorOptions,
    ...options,
    scrollbar,
  })
}

export function setModelLanguageIfNeeded(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  language: string,
) {
  if (model.getLanguageId() !== language)
    monaco.editor.setModelLanguage(model, language)
}

export function guessMonacoLanguage(code: string) {
  if (code.trimStart().startsWith('<'))
    return 'html'
  if (/^import\s/.test(code))
    return 'javascript'
  if (/^[.#].+\{/.test(code))
    return 'css'
  return 'javascript'
}

function mapScroll(primaryPos: number, primaryMax: number, targetMax: number) {
  if (primaryMax <= 0 || targetMax <= 0)
    return 0
  return (targetMax / primaryMax) * primaryPos
}

export function syncMonacoEditorScrolls(
  primary: Monaco.editor.IStandaloneCodeEditor,
  target: Monaco.editor.IStandaloneCodeEditor,
) {
  const pMaxX = Math.max(primary.getScrollWidth() - primary.getLayoutInfo().width, 0)
  const pMaxY = Math.max(primary.getScrollHeight() - primary.getLayoutInfo().height, 0)
  const tMaxX = Math.max(target.getScrollWidth() - target.getLayoutInfo().width, 0)
  const tMaxY = Math.max(target.getScrollHeight() - target.getLayoutInfo().height, 0)

  const scrollLeft = mapScroll(primary.getScrollLeft(), pMaxX, tMaxX)
  const scrollTop = mapScroll(primary.getScrollTop(), pMaxY, tMaxY)

  target.setScrollPosition({
    scrollLeft: Number.isFinite(scrollLeft) ? scrollLeft : 0,
    scrollTop: Number.isFinite(scrollTop) ? scrollTop : 0,
  })
}

export function setupMonacoScrollSync(
  editor1: Monaco.editor.IStandaloneCodeEditor,
  editor2: Monaco.editor.IStandaloneCodeEditor,
) {
  let activeEditor = 1

  const node1 = editor1.getDomNode()
  const node2 = editor2.getDomNode()

  const onMouseEnter1 = () => {
    activeEditor = 1
  }
  const onMouseEnter2 = () => {
    activeEditor = 2
  }

  node1?.addEventListener('mouseenter', onMouseEnter1)
  node2?.addEventListener('mouseenter', onMouseEnter2)

  const disposables: Monaco.IDisposable[] = [
    editor1.onDidScrollChange(() => {
      if (activeEditor === 1)
        syncMonacoEditorScrolls(editor1, editor2)
    }),
    editor2.onDidScrollChange(() => {
      if (activeEditor === 2)
        syncMonacoEditorScrolls(editor2, editor1)
    }),
    editor1.onDidChangeCursorPosition(() => syncMonacoEditorScrolls(editor1, editor2)),
    editor2.onDidChangeCursorPosition(() => syncMonacoEditorScrolls(editor2, editor1)),
  ]

  return () => {
    node1?.removeEventListener('mouseenter', onMouseEnter1)
    node2?.removeEventListener('mouseenter', onMouseEnter2)
    disposables.forEach(d => d.dispose())
  }
}
