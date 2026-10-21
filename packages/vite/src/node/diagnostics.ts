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
    VDT0003: {
      why: (p: { operation: string }) => `Vite inspect storage failed while ${p.operation}.`,
      fix: 'Restart the Vite dev server. If the error persists, clear the Vite cache directory and reinstall dependencies.',
    },
    VDT0004: {
      why: (p: { archive: string }) => `Vite inspect could not write the ${p.archive} archive to disk and now keeps new records in memory.`,
      fix: 'Check that the Vite cache directory is writable and has free disk space, then restart the Vite dev server to resume writing to disk.',
    },
  },
})
