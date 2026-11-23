import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { isVitePlusVersionSupported } from '../../shared/version'
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
