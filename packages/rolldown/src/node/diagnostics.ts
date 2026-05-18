import { colors as c } from 'devframe/utils/colors'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    RDDT0001: {
      message: 'Rolldown logs directory `.rolldown` not found, you might want to run build with `build.rolldownOptions.devtools` enabled first.',
      level: 'warn',
    },
    RDDT0002: {
      message: (p: { line: number, error: string, preview: string }) => `Rolldown log reader skipped bad line ${p.line}: ${p.error}\n${p.preview}`,
      level: 'warn',
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
