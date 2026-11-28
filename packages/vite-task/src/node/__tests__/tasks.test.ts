import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { defineRpcFunction } from 'devframe'
import { createHostContext } from 'devframe/node'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { isVitePlusVersionSupported } from '../../shared/version'
import { getTaskSource, openTaskSource } from '../rpc'
import { loadRunPlan, loadTaskGraph } from '../tasks'

const command = vi.hoisted(() => vi.fn<(executable: string, args: string[]) => Promise<{ stdout: string }>>())
vi.mock('tinyexec', () => ({ x: command }))

let workspaceRoot: string
let graph: Record<string, unknown>
let plan: Record<string, unknown>

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'vite-task-test-'))
  const bin = join(workspaceRoot, 'node_modules', '.bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(bin, process.platform === 'win32' ? 'vp.cmd' : 'vp'), '')
  const header = { $schema: 'file:///schema.json', version: 1, workspaceRoot }
  graph = {
    ...header,
    packages: { '.': {}, 'packages/lib': { name: '@test/lib' }, 'apps/site': {} },
    tasks: {
      'build': { name: 'build', package: '.', command: 'build' },
      'packages/lib#lint': { name: 'lint', package: 'packages/lib', command: 'lint' },
      'apps/site#test': { name: 'test', package: 'apps/site', command: 'test' },
    },
  }
  plan = { ...header, plan: {} }
  command.mockReset().mockImplementation(async (_, args) => ({
    stdout: args[0] === '--version' ? 'vp v1.6.0' : JSON.stringify(args.includes('--dry-run') ? plan : graph),
  }))
})

afterEach(() => rmSync(workspaceRoot, { recursive: true, force: true }))

it('loads independent plans with the CLI selector for each task', async () => {
  await loadTaskGraph(workspaceRoot)
  const plans = await Promise.all(['build', 'packages/lib#lint', 'apps/site#test'].map(task =>
    loadRunPlan(workspaceRoot, { task, verbose: true })))
  expect(plans).toEqual([plan, plan, plan])
  expect(command.mock.calls.map(([, args]) => args)).toEqual([
    ['--version'],
    ['run', '--json'],
    ['run', '--dry-run', '--json', '-vv', 'build'],
    ['run', '--dry-run', '--json', '-vv', '@test/lib#lint'],
    ['run', '--dry-run', '--json', '-vv', '--filter', './apps/site', '--fail-if-no-match', 'test'],
  ])
})

it.each(['', '  ', '--help', 'unknown'])('rejects task %j before running a dry run', async (task) => {
  await expect(loadRunPlan(workspaceRoot, { task, verbose: false })).rejects.toMatchObject({ name: 'VTKDT0005' })
  expect(command.mock.calls.map(([, args]) => args)).toEqual(task === 'unknown' ? [['--version'], ['run', '--json']] : [])
})

it.each([{ version: 2 }, { tasks: null }, { packages: [] }])('rejects an unsupported graph with %o', async (fields) => {
  Object.assign(graph, fields)
  await expect(loadTaskGraph(workspaceRoot)).rejects.toMatchObject({ name: 'VTKDT0004' })
})

it('rejects a dry run without a plan object', async () => {
  delete plan.plan
  await expect(loadRunPlan(workspaceRoot, { task: 'build', verbose: false })).rejects.toMatchObject({ name: 'VTKDT0004' })
})

it.each([
  ['1.5.9', false],
  ['1.6.0-rc', false],
  ['1.6.0', true],
  ['1.6.1-rc', true],
] as const)('checks the minimum version for %s', (version, supported) => {
  expect(isVitePlusVersionSupported(version)).toBe(supported)
})

it('opens the exact script key in its package and rechecks its current location', async () => {
  const dir = join(workspaceRoot, 'packages/lib')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'package.json')
  const manifest = '{\r\n  "lint": "metadata",\r\n  "scripts": {\r\n    "prelint": "lint",\r\n    "l\\u0069nt": "lint"\r\n  }\r\n}'
  writeFileSync(path, manifest)
  writeFileSync(join(workspaceRoot, 'package.json'), '{"scripts":{"lint":"lint"}}')
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  expect(await getSource('packages/lib#lint')).toEqual({ kind: 'script', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script', 'lint')).rejects.toMatchObject({ name: 'VTKDT0006' })
  ctx.rpc.register(editor)
  expect(await getSource('packages/lib#lint')).toEqual({ kind: 'script', canOpen: true })

  writeFileSync(path, `\uFEFF\r\n${manifest}`)
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script', 'lint')
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(`${path}:6:5`)

  writeFileSync(path, '{"scripts":{"lint":"changed"}}')
  expect(await getSource('packages/lib#lint')).toEqual({ kind: 'script', canOpen: false })
  writeFileSync(path, '{"scripts":{}}')
  expect(await getSource('packages/lib#lint')).toEqual({ kind: 'script', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script', 'lint')).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(editor.handler).toHaveBeenCalledTimes(1)
})

it('opens a first-line script key in a UTF-8 manifest with a BOM', async () => {
  const path = join(workspaceRoot, 'package.json')
  writeFileSync(path, '\uFEFF{"scripts":{"build":"build"}}')
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  expect(await getSource('build')).toEqual({ kind: 'script', canOpen: true })
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'script', 'build')
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(`${path}:1:13`)
})

it('opens a configuration task at a manifestless root and keeps missing members unknown', async () => {
  const config = join(workspaceRoot, 'vite.config.mts')
  const member = join(workspaceRoot, 'packages/lib')
  mkdirSync(member, { recursive: true })
  writeFileSync(join(member, 'vite.config.ts'), '')
  writeFileSync(config, '')
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  expect(await getSource('build')).toEqual({ kind: 'config', canOpen: true })
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'config', 'build')
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(config)
  expect(await getSource('packages/lib#lint')).toEqual({ kind: 'unknown', canOpen: false })
})

it('opens the only config in the selected package without evaluating it', async () => {
  const dir = join(workspaceRoot, 'packages/lib')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{}')
  writeFileSync(join(workspaceRoot, 'vite.config.ts'), 'export default {}')
  writeFileSync(join(dir, 'vite.config.ts.bak'), '')
  const task = 'packages/lib#lint'
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  const source = () => getSource(task)
  const open = () => ctx.rpc.invokeLocal('vite-task:open-task-source', task, 'config', 'lint')

  expect(await source()).toEqual({ kind: 'config', canOpen: false })
  const config = join(dir, 'vite.config.ts')
  writeFileSync(config, 'throw new Error("Opening this file must not evaluate it")')
  expect(await source()).toEqual({ kind: 'config', canOpen: true })
  await open()
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(config)

  writeFileSync(join(dir, 'vite.config.js'), '')
  await expect(open()).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(await source()).toEqual({ kind: 'config', canOpen: false })
  expect(editor.handler).toHaveBeenCalledTimes(1)
})

it('keeps an older view bound to the script it displayed after another graph refresh', async () => {
  const path = join(workspaceRoot, 'package.json')
  writeFileSync(path, '{"scripts":{"build":"build"}}')
  const { ctx, editor, snapshot } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  const first = snapshot.tasks.build!
  writeFileSync(path, '{"scripts":{"build":"new build"}}')
  graph.tasks = { build: { name: 'build', package: '.', command: 'new build' } }
  const second = (await loadTaskGraph(workspaceRoot)).tasks.build!

  expect(await ctx.rpc.invokeLocal('vite-task:get-task-source', 'build', first.sourceKind!, first.command)).toEqual({ kind: 'script', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'script', first.command)).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(editor.handler).not.toHaveBeenCalled()
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'script', second.command)
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(`${path}:1:13`)
})

it('keeps the newer task index when overlapping graph requests finish in reverse order', async () => {
  const path = join(workspaceRoot, 'package.json')
  writeFileSync(path, '{"scripts":{"build":"build"}}')
  const { ctx, editor } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  let finishOlder!: (value: { stdout: string }) => void
  const oldJson = JSON.stringify(graph)
  command.mockImplementationOnce(() => new Promise((resolve) => {
    finishOlder = resolve
  }))
  const older = loadTaskGraph(workspaceRoot)
  await vi.waitFor(() => expect(finishOlder).toBeTypeOf('function'))

  writeFileSync(path, '{"scripts":{"build":"new build"}}')
  graph.tasks = { build: { name: 'build', package: '.', command: 'new build' } }
  const current = (await loadTaskGraph(workspaceRoot)).tasks.build!
  finishOlder({ stdout: oldJson })
  await older
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'script', current.command)
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(`${path}:1:13`)
})

it('uses the filesystem casing rules to count standard config files', async () => {
  const mixedCase = join(workspaceRoot, 'Vite.config.js')
  writeFileSync(mixedCase, '')
  const matchesStandardName = existsSync(join(workspaceRoot, 'vite.config.js'))
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  const source = () => getSource('build')
  expect((await source()).canOpen).toBe(matchesStandardName)
  writeFileSync(join(workspaceRoot, 'vite.config.ts'), '')
  expect((await source()).canOpen).toBe(!matchesStandardName)
  if (matchesStandardName) {
    await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'config', 'build')).rejects.toMatchObject({ name: 'VTKDT0006' })
    expect(editor.handler).not.toHaveBeenCalled()
  }
})

it.each([
  '{ invalid',
  '{"scripts":{"build":"wrong command"}}',
  '{"scripts":{"build":"build","build":"build"}}',
])('does not guess the source for unavailable or ambiguous manifest %s', async (content) => {
  writeFileSync(join(workspaceRoot, 'package.json'), content)
  const { ctx, editor, getSource } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  expect(await getSource('build')).toEqual({ kind: 'unknown', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', '../other', 'config', 'build')).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(editor.handler).not.toHaveBeenCalled()
})

async function createTaskHost(cwd: string) {
  const ctx = await createHostContext({ cwd, mode: 'dev', host: { mountStatic: vi.fn() } })
  ctx.rpc.register(getTaskSource)
  ctx.rpc.register(openTaskSource)
  const editor = defineRpcFunction({ name: 'vite:core:open-in-editor', type: 'action', handler: vi.fn<(target: string) => void>() })
  const snapshot = await loadTaskGraph(cwd)
  function getSource(id: string) {
    const task = snapshot.tasks[id]!
    return ctx.rpc.invokeLocal('vite-task:get-task-source', id, task.sourceKind!, task.command)
  }
  return { ctx, editor, getSource, snapshot }
}
