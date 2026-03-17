import type { JsonRenderElement, JsonRenderSpec } from '@vitejs/devtools-kit'
import type { GitState } from './git'

const statusMeta: Record<string, { label: string, title: string, variant: string }> = {
  'M': { label: 'M', title: 'Modified', variant: 'warning' },
  'A': { label: 'A', title: 'Added', variant: 'success' },
  'D': { label: 'D', title: 'Deleted', variant: 'error' },
  'R': { label: 'R', title: 'Renamed', variant: 'info' },
  'C': { label: 'C', title: 'Copied', variant: 'info' },
  'U': { label: 'U', title: 'Unmerged', variant: 'error' },
  '?': { label: '?', title: 'Untracked', variant: 'default' },
}

function getStatusMeta(status: string) {
  return statusMeta[status] ?? { label: status, title: status, variant: 'default' }
}

function buildFileRows(
  files: Array<{ status: string, file: string }>,
  prefix: string,
  actionName: string,
  actionIcon: string,
  interactive: boolean,
): { children: string[], elements: Record<string, JsonRenderElement> } {
  const children: string[] = []
  const elements: Record<string, JsonRenderElement> = {}

  for (let i = 0; i < files.length; i++) {
    const { status, file } = files[i]!
    const meta = getStatusMeta(status)
    const rowId = `${prefix}-row-${i}`
    const statusId = `${prefix}-status-${i}`
    const fileId = `${prefix}-file-${i}`

    children.push(rowId)
    const rowChildren = [statusId, fileId]

    if (interactive) {
      const spacerId = `${prefix}-spacer-${i}`
      const btnId = `${prefix}-btn-${i}`
      rowChildren.push(spacerId, btnId)
      elements[spacerId] = {
        type: 'Stack',
        props: { direction: 'horizontal', flex: 1 },
      }
      elements[btnId] = {
        type: 'Button',
        props: { icon: actionIcon, variant: 'ghost' },
        on: { press: { action: actionName, params: { file } } },
      }
    }

    elements[rowId] = {
      type: 'Stack',
      props: { direction: 'horizontal', gap: 8, align: 'center' },
      children: rowChildren,
    }
    elements[statusId] = {
      type: 'Badge',
      props: {
        text: meta.label,
        title: meta.title,
        variant: meta.variant,
        minWidth: '24px',
      },
    }
    elements[fileId] = {
      type: 'Text',
      props: { content: file, variant: 'code' },
    }
  }

  return { children, elements }
}

export function buildSpec(gitState: GitState, options?: { interactive?: boolean }): JsonRenderSpec {
  const interactive = options?.interactive ?? true
  const stagedRows = buildFileRows(gitState.staged, 'staged', 'git-ui:unstage', 'ph:minus-circle', interactive)
  const unstagedRows = buildFileRows(gitState.unstaged, 'unstaged', 'git-ui:stage', 'ph:plus-circle', interactive)

  const rootChildren = ['header', 'branch-info']
  if (interactive)
    rootChildren.push('commit-section')
  rootChildren.push('divider1', 'staged-card', 'unstaged-card', 'commits-card')

  return {
    root: 'root',
    state: {
      commitMessage: '',
    },
    elements: {
      'root': {
        type: 'Stack',
        props: { direction: 'vertical', gap: 12, padding: 4 },
        children: rootChildren,
      },
      'header': {
        type: 'Stack',
        props: { direction: 'horizontal', gap: 8, align: 'center', justify: 'space-between' },
        children: interactive ? ['title', 'refresh-btn'] : ['title'],
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
        children: gitState.unstaged.length > 0
          ? (interactive ? ['unstaged-header', 'unstaged-files'] : ['unstaged-files'])
          : ['unstaged-empty'],
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
  }
}
