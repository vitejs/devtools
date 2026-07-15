import { createConsoleReporter, defineDiagnostics } from 'nostics'

// Kit-side diagnostics. The former hub-domain codes (DTK0050-DTK0057)
// moved upstream into `@devframes/hub` as DF8100-DF8403 since hub now
// owns the docks/terminals/commands hosts, so the DTK0050+ range is free
// again for kit-only codes.
export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {
    DTK0050: {
      why: (p: { packages: string }) => `Failed to install ${p.packages}.`,
      fix: 'Install the package(s) manually with your package manager, then restart the dev server.',
    },
    DTK0051: {
      why: (p: { base: string }) => `Failed to serve the RPC connection meta at "${p.base}".`,
      fix: 'The devframe SPA mounted at this base cannot discover the RPC endpoint. Check the dev server logs for the underlying cause and reload.',
    },
  },
})
