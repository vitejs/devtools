import c from 'ansis'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    DTK0008: {
      message: 'Client authentication is disabled. Any browser can connect to the devtools and access your server and filesystem.',
      level: 'warn',
    },
    DTK0009: {
      message: (p: { filepath: string }) => `Failed to parse storage file: ${p.filepath}, falling back to defaults.`,
      level: 'warn',
    },
    DTK0010: {
      message: 'Static build is still experimental and not yet complete. Generated output may be missing features and can change without notice.',
      level: 'warn',
    },
    DTK0011: {
      message: (p: { name: string }) => `RPC error on executing "${p.name}"`,
    },
    DTK0012: {
      message: 'RPC error on executing rpc',
    },
    DTK0013: {
      message: (p: { name: string, clientId: string }) => `Unauthorized access to method ${JSON.stringify(p.name)} from client [${p.clientId}]`,
    },
    DTK0014: {
      message: (p: { name: string }) => `Error setting up plugin ${p.name}`,
    },
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
      message: 'AsyncLocalStorage is not set, it likely to be an internal bug of Vite DevTools',
    },
    DTK0022: {
      message: (p: { distDir: string }) => `distDir ${p.distDir} does not exist`,
    },
    DTK0023: {
      message: 'viteServer is required in dev mode',
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
    DTK0027: {
      message: (p: { key: string }) => `Shared state of "${p.key}" is not found, please provide an initial value for the first time`,
    },
    DTK0028: {
      message: 'Path is outside the workspace root',
    },
    DTK0029: {
      message: 'Path is outside the workspace root',
    },
    DTK0030: {
      message: (p: { id: string }) => `Dock entry with id "${p.id}" not found`,
    },
    DTK0031: {
      message: (p: { id: string }) => `Dock entry with id "${p.id}" is not a launcher`,
    },
    DTK0032: {
      message: (p: { id: string }) => `Error launching dock entry "${p.id}"`,
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
