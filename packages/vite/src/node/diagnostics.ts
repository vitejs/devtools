import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {
    VDT0001: {
      why: 'Vite inspect context is not available for this DevTools context.',
    },
    VDT0002: {
      why: (p: { target: string, id: string }) => `Vite inspect target "${p.id}" was not found in ${p.target}.`,
    },
  },
})
