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
    DTK0023: {
      message: 'viteServer is required in dev mode',
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
