import { defineDiagnostics, reporterLog } from 'nostics'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [reporterLog],
  codes: {
    DTK0008: {
      why: 'Client authentication is disabled. Any browser can connect to the devtools and access your server and filesystem.',
    },
    DTK0010: {
      why: 'Static build is still experimental and not yet complete. Generated output may be missing features and can change without notice.',
    },
    DTK0011: {
      why: (p: { name: string }) => `RPC error on executing "${p.name}"`,
    },
    DTK0012: {
      why: 'RPC error on executing rpc',
    },
    DTK0013: {
      why: (p: { name: string, clientId: string }) => `Unauthorized access to method ${JSON.stringify(p.name)} from client [${p.clientId}]`,
    },
    DTK0014: {
      why: (p: { name: string }) => `Error setting up plugin ${p.name}`,
    },
    DTK0023: {
      why: 'viteServer is required in dev mode',
    },
    DTK0028: {
      why: 'Path is outside the workspace root',
    },
    DTK0029: {
      why: 'Path is outside the workspace root',
    },
    DTK0030: {
      why: (p: { id: string }) => `Dock entry with id "${p.id}" not found`,
    },
    DTK0031: {
      why: (p: { id: string }) => `Dock entry with id "${p.id}" is not a launcher`,
    },
    DTK0032: {
      why: (p: { id: string }) => `Error launching dock entry "${p.id}"`,
    },
  },
})
