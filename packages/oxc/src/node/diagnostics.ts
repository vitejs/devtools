import { createConsoleReporter, defineDiagnostics } from 'nostics'

// OXDT — structured diagnostics for `@vitejs/devtools-oxc`.
//
// This is the reserved prefix scaffold. The node-side code imported from
// `oxc-inspector` still emits ad-hoc `console.warn` / `throw`; migrating those
// call sites onto these coded diagnostics is a tracked follow-up (see the oxc
// import PR). Add new codes sequentially (OXDT0001, OXDT0002, …).
export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {},
})
