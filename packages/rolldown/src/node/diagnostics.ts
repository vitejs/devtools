import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {
    RDDT0001: {
      why: 'Rolldown logs directory `.rolldown` not found, you might want to run build with `build.rolldownOptions.devtools` enabled first.',
    },
    RDDT0002: {
      why: (p: { line: number, error: string, preview: string }) => `Rolldown log reader skipped bad line ${p.line}: ${p.error}\n${p.preview}`,
    },
    RDDT0003: {
      why: (p: { error: string }) => `Failed to start the Rolldown build process: ${p.error}`,
      fix: 'Ensure `vite` is installed in this project and can run `vite build` from the project root.',
    },
    RDDT0004: {
      why: (p: { id: string }) => `Invalid Rolldown session id "${p.id}".`,
      fix: 'Session ids must be a single directory name without path separators or `..` segments.',
    },
  },
})
