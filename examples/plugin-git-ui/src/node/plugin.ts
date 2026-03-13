import type { JsonRenderElement, JsonRenderer, JsonRenderSpec, PluginWithDevTools } from '@vitejs/devtools-kit'
import { defineJsonRenderSpec, defineRpcFunction } from '@vitejs/devtools-kit'
import { exec } from 'tinyexec'

interface GitResult {
  stdout: string
  stderr: string
  ok: boolean
}

async function git(args: string[], cwd: string): Promise<GitResult> {
  try {
    const result = await exec('git', args, { nodeOptions: { cwd }, throwOnError: true })
    return { stdout: result.stdout, stderr: result.stderr, ok: true }
  }
  catch (e: any) {
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? String(e), ok: false }
  }
}

interface GitState {
  branch: string
  commits: Array<{ hash: string, message: string, author: string, date: string }>
  staged: Array<{ status: string, file: string }>
  unstaged: Array<{ status: string, file: string }>
}

async function getGitState(gitRoot: string): Promise<GitState> {
  const [branchResult, logResult, statusResult] = await Promise.all([
    git(['branch', '--show-current'], gitRoot),
    git(['log', '--oneline', '-20', '--format=%h\t%s\t%an\t%cr'], gitRoot),
    git(['status', '--porcelain'], gitRoot),
  ])
  const branch = branchResult.stdout
  const log = logResult.stdout
  const status = statusResult.stdout

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

function buildFileRows(
  files: Array<{ status: string, file: string }>,
  prefix: string,
  actionName: string,
  actionIcon: string,
): { children: string[], elements: Record<string, JsonRenderElement> } {
  const children: string[] = []
  const elements: Record<string, JsonRenderElement> = {}

  for (let i = 0; i < files.length; i++) {
    const { status, file } = files[i]
    const rowId = `${prefix}-row-${i}`
    const statusId = `${prefix}-status-${i}`
    const fileId = `${prefix}-file-${i}`
    const btnId = `${prefix}-btn-${i}`

    children.push(rowId)
    elements[rowId] = {
      type: 'Stack',
      props: { direction: 'horizontal', gap: 8, align: 'center' },
      children: [statusId, fileId, btnId],
    }
    elements[statusId] = {
      type: 'Badge',
      props: {
        text: status,
        variant: status === '?' ? 'warning' : status === 'D' ? 'error' : 'info',
      },
    }
    elements[fileId] = {
      type: 'Text',
      props: { content: file, variant: 'code' },
    }
    elements[btnId] = {
      type: 'Button',
      props: { icon: actionIcon, variant: 'ghost' },
      on: { press: { action: actionName, params: { file } } },
    }
  }

  return { children, elements }
}

function buildSpec(gitState: GitState): JsonRenderSpec {
  const stagedRows = buildFileRows(gitState.staged, 'staged', 'git-ui:unstage', 'ph:minus-circle')
  const unstagedRows = buildFileRows(gitState.unstaged, 'unstaged', 'git-ui:stage', 'ph:plus-circle')

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
        props: { label: 'Refresh', variant: 'secondary', icon: 'ph:arrows-clockwise' },
        on: { press: { action: 'git-ui:refresh' } },
      },
      'branch-info': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8, align: 'center' },
        children: ['branch-icon', 'branch-text', 'changes-badge'],
      },
      'branch-icon': {
        type: 'Icon',
        props: { name: 'ph:git-branch', size: 16 },
      },
      'branch-text': {
        type: 'Text',
        props: { content: gitState.branch || '(detached)', variant: 'code' },
      },
      'changes-badge': {
        type: 'Badge',
        props: {
          text: `${gitState.staged.length + gitState.unstaged.length} changes`,
          variant: (gitState.staged.length + gitState.unstaged.length) > 0 ? 'warning' : 'success',
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
        props: { label: 'Commit', variant: 'primary', icon: 'ph:check' },
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

      // Staged files
      'staged-card': {
        type: 'Card',
        props: { title: `Staged (${gitState.staged.length})`, collapsible: true },
        children: gitState.staged.length > 0 ? ['staged-files'] : ['staged-empty'],
      },
      'staged-files': {
        type: 'Stack',
        props: { direction: 'vertical', gap: 4 },
        children: stagedRows.children,
      },
      ...stagedRows.elements,
      'staged-empty': {
        type: 'Text',
        props: { content: 'No staged files', variant: 'caption' },
      },

      // Unstaged files
      'unstaged-card': {
        type: 'Card',
        props: { title: `Unstaged (${gitState.unstaged.length})`, collapsible: true },
        children: gitState.unstaged.length > 0 ? ['unstaged-header', 'unstaged-files'] : ['unstaged-empty'],
      },
      'unstaged-header': {
        type: 'Stack',
        props: { direction: 'horizontal', justify: 'end' },
        children: ['stage-all-btn'],
      },
      'stage-all-btn': {
        type: 'Button',
        props: { label: 'Stage All', variant: 'secondary', icon: 'ph:plus-circle' },
        on: { press: { action: 'git-ui:stage-all' } },
      },
      'unstaged-files': {
        type: 'Stack',
        props: { direction: 'vertical', gap: 4 },
        children: unstagedRows.children,
      },
      ...unstagedRows.elements,
      'unstaged-empty': {
        type: 'Text',
        props: { content: 'No unstaged files', variant: 'caption' },
      },

      // Commits
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
          rows: gitState.commits,
          maxHeight: '300px',
        },
      },
    },
  })
}

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
