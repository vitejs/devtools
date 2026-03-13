import type { JsonRenderSpec, PluginWithDevTools } from '@vitejs/devtools-kit'
import { exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'
import { defineJsonRenderSpec, defineRpcFunction } from '@vitejs/devtools-kit'

const execAsync = promisify(execCb)

async function run(cmd: string, cwd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { cwd, encoding: 'utf-8' })
    return stdout
  }
  catch {
    return ''
  }
}

interface GitState {
  branch: string
  commits: Array<{ hash: string, message: string, author: string, date: string }>
  staged: Array<{ status: string, file: string }>
  unstaged: Array<{ status: string, file: string }>
}

async function getGitState(cwd: string): Promise<GitState> {
  const [branch, log, status] = await Promise.all([
    run('git branch --show-current', cwd),
    run('git log --oneline -20 --format="%h\t%s\t%an\t%cr"', cwd),
    run('git status --porcelain', cwd),
  ])

  const staged: GitState['staged'] = []
  const unstaged: GitState['unstaged'] = []
  for (const line of status.split('\n').filter(Boolean)) {
    const x = line[0]
    const y = line[1]
    const file = line.slice(3)
    if (x !== ' ' && x !== '?')
      staged.push({ status: x, file })
    if (y !== ' ' && y !== '?')
      unstaged.push({ status: y, file })
    if (x === '?')
      unstaged.push({ status: '?', file })
  }

  return {
    branch: branch.trim(),
    commits: log.split('\n').filter(Boolean).map((l) => {
      const [hash, message, author, date] = l.split('\t')
      return { hash, message, author, date }
    }),
    staged,
    unstaged,
  }
}

function buildSpec(git: GitState): JsonRenderSpec {
  return defineJsonRenderSpec({
    root: 'root',
    state: {
      commitMessage: '',
    },
    elements: {
      'root': {
        type: 'Stack',
        props: { direction: 'vertical', gap: 12, padding: 4 },
        children: ['header', 'branch-info', 'commit-section', 'divider1', 'staged-card', 'unstaged-card', 'commits-card'],
      },
      'header': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8, align: 'center', justify: 'space-between' },
        children: ['title', 'refresh-btn'],
      },
      'title': {
        type: 'Text',
        props: { content: 'Git', variant: 'heading' },
      },
      'refresh-btn': {
        type: 'Button',
        props: { label: 'Refresh', variant: 'secondary' },
        on: { press: { action: 'git-ui:refresh' } },
      },
      'branch-info': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8, align: 'center' },
        children: ['branch-icon', 'branch-text', 'changes-badge'],
      },
      'branch-icon': {
        type: 'Text',
        props: { content: '⎇', variant: 'body' },
      },
      'branch-text': {
        type: 'Text',
        props: { content: git.branch || '(detached)', variant: 'code' },
      },
      'changes-badge': {
        type: 'Badge',
        props: {
          text: `${git.staged.length + git.unstaged.length} changes`,
          variant: (git.staged.length + git.unstaged.length) > 0 ? 'warning' : 'success',
        },
      },
      'commit-section': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8 },
        children: ['commit-input', 'commit-btn'],
      },
      'commit-input': {
        type: 'TextInput',
        props: {
          placeholder: 'Commit message...',
          value: { $bindState: '/commitMessage' } as any,
        },
      },
      'commit-btn': {
        type: 'Button',
        props: { label: 'Commit', variant: 'primary' },
        on: {
          press: {
            action: 'git-ui:commit',
            params: { message: { $state: '/commitMessage' } },
          },
        },
      },
      'divider1': {
        type: 'Divider',
        props: {},
      },
      'staged-card': {
        type: 'Card',
        props: { title: `Staged (${git.staged.length})`, collapsible: true },
        children: git.staged.length > 0 ? ['staged-table'] : ['staged-empty'],
      },
      'staged-table': {
        type: 'DataTable',
        props: {
          columns: [
            { key: 'status', label: 'Status', width: '60px' },
            { key: 'file', label: 'File' },
          ],
          rows: git.staged,
        },
      },
      'staged-empty': {
        type: 'Text',
        props: { content: 'No staged files', variant: 'caption' },
      },
      'unstaged-card': {
        type: 'Card',
        props: { title: `Unstaged (${git.unstaged.length})`, collapsible: true },
        children: git.unstaged.length > 0 ? ['unstaged-table'] : ['unstaged-empty'],
      },
      'unstaged-table': {
        type: 'DataTable',
        props: {
          columns: [
            { key: 'status', label: 'Status', width: '60px' },
            { key: 'file', label: 'File' },
          ],
          rows: git.unstaged,
        },
      },
      'unstaged-empty': {
        type: 'Text',
        props: { content: 'No unstaged files', variant: 'caption' },
      },
      'commits-card': {
        type: 'Card',
        props: { title: 'Recent Commits', collapsible: true },
        children: ['commits-table'],
      },
      'commits-table': {
        type: 'DataTable',
        props: {
          columns: [
            { key: 'hash', label: 'Hash', width: '80px' },
            { key: 'message', label: 'Message' },
            { key: 'author', label: 'Author', width: '120px' },
            { key: 'date', label: 'Date', width: '100px' },
          ],
          rows: git.commits,
          maxHeight: '300px',
        },
      },
    },
  })
}

const gitUiRefresh = defineRpcFunction({
  name: 'git-ui:refresh',
  type: 'event',
  setup: ctx => ({
    handler: async () => {
      const git = await getGitState(ctx.cwd)
      const uiState = await ctx.rpc.sharedState.get('git-ui:spec')
      uiState.mutate(() => buildSpec(git))

      const total = git.staged.length + git.unstaged.length
      ctx.docks.update({
        id: 'git-ui',
        type: 'json-render',
        title: 'Git',
        icon: 'ph:git-branch-duotone',
        badge: total > 0 ? String(total) : undefined,
      })
    },
  }),
})

const gitUiCommit = defineRpcFunction({
  name: 'git-ui:commit',
  type: 'event',
  setup: ctx => ({
    handler: async (params: { message?: string }) => {
      const message = params?.message
      if (!message) {
        ctx.logs.add({
          message: 'Commit message is empty',
          level: 'warning',
          category: 'git-ui',
        })
        return
      }

      try {
        // Escape the message for shell
        const escaped = message.replace(/"/g, '\\"')
        await run(`git commit -m "${escaped}"`, ctx.cwd)
        ctx.logs.add({
          message: `Committed: ${message}`,
          level: 'info',
          category: 'git-ui',
        })
      }
      catch (e) {
        ctx.logs.add({
          message: `Commit failed: ${e}`,
          level: 'error',
          category: 'git-ui',
        })
      }

      // Refresh after commit
      const git = await getGitState(ctx.cwd)
      const uiState = await ctx.rpc.sharedState.get('git-ui:spec')
      uiState.mutate(() => buildSpec(git))

      const total = git.staged.length + git.unstaged.length
      ctx.docks.update({
        id: 'git-ui',
        type: 'json-render',
        title: 'Git',
        icon: 'ph:git-branch-duotone',
        badge: total > 0 ? String(total) : undefined,
      })
    },
  }),
})

const rpcFunctions = [gitUiRefresh, gitUiCommit]

export function GitUIPlugin(): PluginWithDevTools {
  return {
    name: 'plugin-git-ui',
    devtools: {
      async setup(ctx) {
        const stateKey = 'git-ui:spec'

        // Register RPC functions
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        // Get initial git state
        const git = await getGitState(ctx.cwd)

        // Register shared state with initial spec
        await ctx.rpc.sharedState.get(stateKey, {
          initialValue: buildSpec(git),
        })

        // Register dock entry
        const total = git.staged.length + git.unstaged.length
        ctx.docks.register({
          type: 'json-render',
          id: 'git-ui',
          title: 'Git',
          icon: 'ph:git-branch-duotone',
          category: 'app',
          sharedStateKey: stateKey,
          badge: total > 0 ? String(total) : undefined,
        })
      },
    },
  }
}
