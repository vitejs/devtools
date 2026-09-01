import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

describe('rpc module augmentation', () => {
  it('types getDevToolsRpcClient calls through the kit registry', () => {
    const root = resolve(import.meta.dirname, '..')
    const fixture = resolve(import.meta.dirname, 'fixtures/rpc-augmentation.ts')
    const program = ts.createProgram([fixture], {
      baseUrl: root,
      ignoreDeprecations: '6.0',
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      paths: {
        '@vitejs/devtools-kit': ['packages/kit/src/index.ts'],
        '@vitejs/devtools-kit/client': ['packages/kit/src/client/index.ts'],
      },
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ESNext,
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    const output = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    })

    expect(output).toBe('')
  })
})
