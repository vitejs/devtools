import c from 'ansis'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

// DTK codes used by framework-neutral pieces (host classes, shared-state,
// auth). Retains DTK prefix for now so existing error-doc URLs keep
// resolving; a dedicated `TKB` renumber lands in the diagnostics
// migration commit.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    DTK0015: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    DTK0016: {
      message: 'Cannot change the id of a dock. Use register() to add new docks.',
    },
    DTK0017: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is not registered. Use register() to add new docks.`,
    },
    DTK0018: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" already registered`,
    },
    DTK0019: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" not registered`,
    },
    DTK0020: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered`,
    },
    DTK0021: {
      message: 'AsyncLocalStorage is not set, it likely to be an internal bug of the DevTools foundation',
    },
    DTK0022: {
      message: (p: { distDir: string }) => `distDir ${p.distDir} does not exist`,
    },
    DTK0024: {
      message: (p: { id: string }) => `Command "${p.id}" is already registered`,
    },
    DTK0025: {
      message: 'Cannot change the id of a command. Use register() to add new commands.',
    },
    DTK0026: {
      message: (p: { id: string }) => `Command "${p.id}" is not registered`,
    },
    DTK0009: {
      message: (p: { filepath: string }) => `Failed to parse storage file: ${p.filepath}, falling back to defaults.`,
      level: 'warn',
    },
    DTK0027: {
      message: (p: { key: string }) => `Shared state of "${p.key}" is not found, please provide an initial value for the first time`,
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
