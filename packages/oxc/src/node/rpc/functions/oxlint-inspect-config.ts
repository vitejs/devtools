import { inspectConfig } from '@oxlint-config-inspector/core'
import { realpath } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import { diagnostics } from '../../diagnostics'
import { defineOxcRpc } from '../_define'

const SUPPORTED_CONFIG_FILES = new Set([
  '.oxlintrc.json',
  '.oxlintrc.jsonc',
  'oxlint.config.cjs',
  'oxlint.config.js',
  'oxlint.config.mjs',
  'oxlint.config.ts',
  'vite.config.ts',
])

export const oxlintInspectConfig = defineOxcRpc({
  name: 'devtools-oxc:inspect-lint-config',
  type: 'query',
  jsonSerializable: true,
  setup: ctx => ({
    handler: async (configPath: string) => {
      const requestedPath = typeof configPath === 'string' ? configPath : String(configPath)
      const resolvedPath = resolve(ctx.cwd, requestedPath)
      const workspacePath = relative(ctx.cwd, resolvedPath)

      if (
        !requestedPath ||
        isAbsolute(requestedPath) ||
        workspacePath === '..' ||
        workspacePath.startsWith(`..${sep}`) ||
        isAbsolute(workspacePath)
      ) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: 'The config path must be relative to the workspace.',
        })
      }

      if (!SUPPORTED_CONFIG_FILES.has(basename(resolvedPath))) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: 'This config format is not supported.',
        })
      }

      let rootPath: string
      let configFile: string
      try {
        ;[rootPath, configFile] = await Promise.all([realpath(ctx.cwd), realpath(resolvedPath)])
      } catch (cause) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: cause instanceof Error ? cause.message : String(cause),
          cause,
        })
      }

      const realWorkspacePath = relative(rootPath, configFile)
      if (
        realWorkspacePath === '..' ||
        realWorkspacePath.startsWith(`..${sep}`) ||
        isAbsolute(realWorkspacePath)
      ) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: 'The config path resolves outside the workspace.',
        })
      }

      let result
      try {
        result = await inspectConfig({
          cache: false,
          configFile,
          cwd: rootPath,
        })
      } catch (cause) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: cause instanceof Error ? cause.message : String(cause),
          cause,
        })
      }

      if (!result || result.stats.builtinRules === 0) {
        throw diagnostics.OXDT0004({
          configPath: requestedPath,
          reason: result ? 'Oxlint returned no builtin rules.' : 'The config could not be loaded.',
        })
      }

      return result
    },
  }),
})
