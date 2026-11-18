import { defineDiagnostics } from 'nostics'

export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    VTKDT0001: {
      why: (p: { executable: string }) => `Local Vite Plus executable not found at "${p.executable}".`,
      fix: 'Install vite-plus 1.6.0 or newer in the workspace root.',
    },
    VTKDT0002: {
      why: (p: { version: string }) => `Vite Plus ${p.version} does not meet the required version >=1.6.0.`,
      fix: 'Update the workspace vite-plus dependency to 1.6.0 or newer.',
    },
    VTKDT0003: {
      why: (p: { command: string, reason: string }) => `Failed to run "${p.command}": ${p.reason}`,
      fix: 'Check the local Vite Plus installation and workspace task configuration.',
    },
    VTKDT0004: {
      why: (p: { command: string }) => `Vite Plus returned invalid JSON for "${p.command}".`,
      fix: 'Check the Vite Plus version and ensure workspace configuration does not print to stdout.',
    },
    VTKDT0005: {
      why: (p: { task: string }) => `Invalid task name "${p.task}".`,
      fix: 'Select a non-empty task name from the task graph that does not start with a dash.',
    },
  },
})
