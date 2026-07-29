import css from 'shiki/langs/css.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import json from 'shiki/langs/json.mjs'
import json5 from 'shiki/langs/json5.mjs'
import jsonc from 'shiki/langs/jsonc.mjs'
import markdown from 'shiki/langs/markdown.mjs'
import mdx from 'shiki/langs/mdx.mjs'
import svelte from 'shiki/langs/svelte.mjs'
import ts from 'shiki/langs/ts.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import vue from 'shiki/langs/vue.mjs'
import ThemeDark from 'shiki/themes/vitesse-dark.mjs'
import ThemeLight from 'shiki/themes/vitesse-light.mjs'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export const createShiki = createHighlighterCoreSync({
  themes: [ThemeLight, ThemeDark],
  langs: [css, javascript, json, json5, jsonc, markdown, mdx, ts, tsx, vue, svelte],
  engine: createJavaScriptRegexEngine(),
})
