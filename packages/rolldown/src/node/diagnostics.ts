import { defineDiagnostics, reporterLog } from 'nostics'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [reporterLog],
  codes: {
    RDDT0001: {
      why: 'Rolldown logs directory `.rolldown` not found, you might want to run build with `build.rolldownOptions.devtools` enabled first.',
    },
    RDDT0002: {
      why: (p: { line: number, error: string, preview: string }) => `Rolldown log reader skipped bad line ${p.line}: ${p.error}\n${p.preview}`,
    },
  },
})
