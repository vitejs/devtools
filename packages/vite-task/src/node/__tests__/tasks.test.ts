import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
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
  const { ctx, editor } = await createTaskHost(workspaceRoot)
  await loadTaskGraph(workspaceRoot)
  expect(await ctx.rpc.invokeLocal('vite-task:get-task-source', 'packages/lib#lint')).toEqual({ kind: 'script', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script')).rejects.toMatchObject({ name: 'VTKDT0006' })
  ctx.rpc.register(editor)
  expect(await ctx.rpc.invokeLocal('vite-task:get-task-source', 'packages/lib#lint')).toEqual({ kind: 'script', canOpen: true })

  writeFileSync(path, `\r\n${manifest}`)
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script')
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(`${path}:6:5`)

  writeFileSync(path, '{"scripts":{}}')
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'packages/lib#lint', 'script')).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(editor.handler).toHaveBeenCalledTimes(1)
})

it('uses the project loader on click and opens its current package entry file', async () => {
  writeFileSync(join(workspaceRoot, 'package.json'), '{"type":"module"}')
  symlinkSync(dirname(createRequire(import.meta.url).resolve('vite-plus/package.json')), join(workspaceRoot, 'node_modules/vite-plus'), 'dir')
  writeFileSync(join(workspaceRoot, 'vite.config.ts'), 'throw new Error("Do not evaluate me while inspecting the task")')
  const { ctx, editor } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  await loadTaskGraph(workspaceRoot)
  expect(await ctx.rpc.invokeLocal('vite-task:get-task-source', 'build')).toEqual({ kind: 'config', canOpen: true })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'config')).rejects.toThrow(/Do not evaluate me/)
  expect(editor.handler).not.toHaveBeenCalled()

  const config = join(workspaceRoot, 'vite.config.js')
  writeFileSync(join(workspaceRoot, 'tasks.js'), 'export default { build: \'build\' }')
  writeFileSync(config, `
    import { lazyPlugins } from 'vite-plus'
    import tasks from './tasks.js'
    console.log('User config output')
    export default { run: { tasks }, plugins: lazyPlugins(() => { throw new Error('Build-only factory') }) }
  `)
  await ctx.rpc.invokeLocal('vite-task:open-task-source', 'build', 'config')
  expect(editor.handler).toHaveBeenCalledExactlyOnceWith(config)
})

it.each([
  undefined,
  '{ invalid',
  '{"scripts":{"build":"wrong command"}}',
  '{"scripts":{"build":"build","build":"build"}}',
])('does not guess the source for unavailable or ambiguous manifest %s', async (content) => {
  if (content)
    writeFileSync(join(workspaceRoot, 'package.json'), content)
  const { ctx, editor } = await createTaskHost(workspaceRoot)
  ctx.rpc.register(editor)
  await loadTaskGraph(workspaceRoot)
  expect(await ctx.rpc.invokeLocal('vite-task:get-task-source', 'build')).toEqual({ kind: 'unknown', canOpen: false })
  await expect(ctx.rpc.invokeLocal('vite-task:open-task-source', '../other', 'config')).rejects.toMatchObject({ name: 'VTKDT0006' })
  expect(editor.handler).not.toHaveBeenCalled()
})

async function createTaskHost(cwd: string) {
  const ctx = await createHostContext({ cwd, mode: 'dev', host: { mountStatic: vi.fn() } })
  ctx.rpc.register(getTaskSource)
  ctx.rpc.register(openTaskSource)
  const editor = defineRpcFunction({ name: 'vite:core:open-in-editor', type: 'action', handler: vi.fn<(target: string) => void>() })
  return { ctx, editor }
}
