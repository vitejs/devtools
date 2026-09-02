import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {
    VTDT0001: {
      why: (p: { error: string }) => `Failed to install \`@vitest/ui\`: ${p.error}`,
      fix: 'Install it manually with your package manager, e.g. `npm i -D @vitest/ui`, then launch again.',
    },
    VTDT0002: {
      why: (p: { url: string, timeout: number }) => `Vitest UI server did not become reachable at ${p.url} within ${p.timeout}ms.`,
      fix: 'Check the Vitest UI terminal session for startup errors, then launch again.',
    },
  },
})
