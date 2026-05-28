import { defineDiagnostics, reporterLog } from 'nostics'

// Kit-side diagnostics. The hub-domain codes (DTK0050-DTK0057) have
// moved upstream into `@devframes/hub` as DF8100-DF8403 since hub now
// owns the docks/terminals/commands hosts. Kit-only codes can be added
// here in the DTK0050+ range as needed.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [reporterLog],
  codes: {},
})
