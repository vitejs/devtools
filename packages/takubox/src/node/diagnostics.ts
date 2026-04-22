import c from 'ansis'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

// `TKB` codes cover the framework-neutral host / shared-state / auth
// surface owned by takubox. Vite-specific codes stay under the `DTK`
// prefix in `@vitejs/devtools`.
//
// Numbers intentionally start at 0001 — they do not correspond to the
// historical DTK numbers. See `docs/errors/TKB*.md` + the
// `DTK -> TKB` redirect table in the migration guide for the mapping.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    TKB0001: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    TKB0002: {
      message: 'Cannot change the id of a dock. Use register() to add new docks.',
    },
    TKB0003: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is not registered. Use register() to add new docks.`,
    },
    TKB0004: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" already registered`,
    },
    TKB0005: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" not registered`,
    },
    TKB0006: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered`,
    },
    TKB0007: {
      message: 'AsyncLocalStorage is not set, it likely to be an internal bug of the DevTools foundation',
    },
    TKB0008: {
      message: (p: { distDir: string }) => `distDir ${p.distDir} does not exist`,
    },
    TKB0009: {
      message: (p: { id: string }) => `Command "${p.id}" is already registered`,
    },
    TKB0010: {
      message: 'Cannot change the id of a command. Use register() to add new commands.',
    },
    TKB0011: {
      message: (p: { id: string }) => `Command "${p.id}" is not registered`,
    },
    TKB0012: {
      message: (p: { filepath: string }) => `Failed to parse storage file: ${p.filepath}, falling back to defaults.`,
      level: 'warn',
    },
    TKB0013: {
      message: (p: { key: string }) => `Shared state of "${p.key}" is not found, please provide an initial value for the first time`,
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
