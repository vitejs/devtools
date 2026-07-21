import { createConsoleReporter, defineDiagnostics } from 'nostics'

// OXDT — structured diagnostics for `@vitejs/devtools-oxc`.
export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [/* #__PURE__ */ createConsoleReporter()],
  codes: {
    OXDT0001: {
      why: (p: { reason: string }) => `Failed to create a lint result: ${p.reason}`,
      fix: 'Check that oxlint is installed, its configuration is valid, and the project directory is writable.',
    },
    OXDT0002: {
      why: (p: { resultId: string }) => `Invalid lint result ID "${p.resultId}".`,
      fix: 'Use the numeric ID shown in the lint result list.',
    },
    OXDT0003: {
      why: (p: { resultId: string; reason: string }) =>
        `Failed to delete lint result "${p.resultId}": ${p.reason}`,
      fix: 'Check that the lint result exists and the project directory is writable.',
    },
  },
})
