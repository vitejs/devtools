import type { JsonRenderer, PluginWithDevTools } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { exec } from 'tinyexec'
import { getGitState, git } from './git'
import { buildSpec } from './spec'

async function refreshUi(ctx: { cwd: string, docks: any }, ui: JsonRenderer) {
  const gitState = await getGitState(ctx.cwd)
  await ui.updateSpec(buildSpec(gitState))
  const total = gitState.staged.length + gitState.unstaged.length
  ctx.docks.update({
    id: 'git-ui',
    type: 'json-render',
    title: 'Git',
    icon: 'ph:git-branch-duotone',
    ui,
    badge: total > 0 ? String(total) : undefined,
  })
}

function createRpcFunctions(gitRoot: string, getUi: () => JsonRenderer) {
  return [
    defineRpcFunction({
      name: 'git-ui:refresh',
      type: 'action',
      setup: ctx => ({
        handler: async () => {
          await refreshUi(ctx, getUi())
        },
      }),
    }),

    defineRpcFunction({
      name: 'git-ui:stage',
      type: 'action',
      setup: ctx => ({
        handler: async (params: { file?: string }) => {
          if (!params?.file)
            return
          const result = await git(['add', '--', params.file], gitRoot)
          if (result.ok) {
            ctx.logs.add({ message: `Staged: ${params.file}`, level: 'info', category: 'git-ui', notify: true })
          }
          else {
            ctx.logs.add({ message: `Stage failed: ${result.stderr}`, level: 'error', category: 'git-ui', notify: true })
          }
          await refreshUi(ctx, getUi())
        },
      }),
    }),

    defineRpcFunction({
      name: 'git-ui:unstage',
      type: 'action',
      setup: ctx => ({
        handler: async (params: { file?: string }) => {
          if (!params?.file)
            return
          const result = await git(['restore', '--staged', '--', params.file], gitRoot)
          if (result.ok) {
            ctx.logs.add({ message: `Unstaged: ${params.file}`, level: 'info', category: 'git-ui', notify: true })
          }
          else {
            ctx.logs.add({ message: `Unstage failed: ${result.stderr}`, level: 'error', category: 'git-ui', notify: true })
          }
          await refreshUi(ctx, getUi())
        },
      }),
    }),

    defineRpcFunction({
      name: 'git-ui:stage-all',
      type: 'action',
      setup: ctx => ({
        handler: async () => {
          const result = await git(['add', '-A'], gitRoot)
          if (result.ok) {
            ctx.logs.add({ message: 'Staged all files', level: 'info', category: 'git-ui', notify: true })
          }
          else {
            ctx.logs.add({ message: `Stage all failed: ${result.stderr}`, level: 'error', category: 'git-ui', notify: true })
          }
          await refreshUi(ctx, getUi())
        },
      }),
    }),

    defineRpcFunction({
      name: 'git-ui:commit',
      type: 'action',
      setup: ctx => ({
        handler: async (params: { message?: string }) => {
          const message = params?.message
          if (!message) {
            ctx.logs.add({ message: 'Commit message is empty', level: 'warn', category: 'git-ui', notify: true })
            return
          }

          const result = await git(['commit', '-m', message], gitRoot)
          if (result.ok) {
            ctx.logs.add({ message: `Committed: ${message}`, level: 'info', category: 'git-ui', notify: true })
          }
          else {
            ctx.logs.add({ message: `Commit failed: ${result.stderr}`, level: 'error', category: 'git-ui', notify: true })
          }

          await refreshUi(ctx, getUi())
        },
      }),
    }),
  ]
}

export function GitUIPlugin(): PluginWithDevTools {
  return {
    name: 'plugin-git-ui',
    devtools: {
      async setup(ctx) {
        const gitRoot = (await exec('git', ['rev-parse', '--show-toplevel'], { nodeOptions: { cwd: ctx.cwd }, throwOnError: true })).stdout.trim() || ctx.cwd
        const gitState = await getGitState(gitRoot)
        const ui = ctx.createJsonRenderer(buildSpec(gitState))

        const total = gitState.staged.length + gitState.unstaged.length
        ctx.docks.register({
          type: 'json-render',
          id: 'git-ui',
          title: 'Git',
          icon: 'ph:git-branch-duotone',
          category: 'app',
          ui,
          badge: total > 0 ? String(total) : undefined,
        })

        const rpcFunctions = createRpcFunctions(gitRoot, () => ui)
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }
      },
    },
  }
}
