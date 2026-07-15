import type { TextmateTheme } from 'modern-monaco'
import type * as Monaco from 'modern-monaco/editor-core'
import { init } from 'modern-monaco'
import VitesseDark from 'shiki/themes/vitesse-dark.mjs'
import VitesseLight from 'shiki/themes/vitesse-light.mjs'

// Reuse the exact Vitesse themes Shiki already ships (also used by `createShiki`)
// so the editor keeps the look the previous `codemirror-theme-vitesse` gave it,
// without depending on a CDN theme fetch at runtime.
const lightTheme = VitesseLight as unknown as TextmateTheme
const darkTheme = VitesseDark as unknown as TextmateTheme

const lightThemeId = lightTheme.name
const darkThemeId = darkTheme.name

function getThemeId(dark: boolean) {
  return dark ? darkThemeId : lightThemeId
}

let monacoPromise: Promise<typeof Monaco> | null = null

export async function getMonaco(dark: boolean) {
  monacoPromise ??= init({
    defaultTheme: dark ? darkTheme : lightTheme,
    themes: [lightTheme, darkTheme],
  })
  return monacoPromise
}

export function applyMonacoTheme(monaco: typeof Monaco, dark: boolean) {
  monaco.editor.setTheme(getThemeId(dark))
}

const readonlyEditorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: "'Input Mono', 'FiraCode', monospace",
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
  return monaco.editor.create(container, {
    ...readonlyEditorOptions,
    ...options,
    scrollbar: {
      ...readonlyEditorOptions.scrollbar,
      ...options.scrollbar,
    },
  })
}
