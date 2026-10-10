import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RolldownEventsReader } from '@vitejs/devtools-rolldown/node'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { createSessionCompareDetails, getLogsManager, getPackageMeta } from '@vitejs/devtools-rolldown/node'
import { z } from 'zod'
import { diagnostics } from '../diagnostics'
import { traceDependency } from './dependency-trace'

const sessionId = z.string().min(1).refine(value => !/[\\/]/.test(value) && !value.includes('..'), 'Expected a session id from list-sessions')
const session = sessionId.default('latest')
const pinnedSession = sessionId.refine(id => id !== 'latest', 'Use a concrete session id when comparing builds')
const page = {
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
}
const query = z.string().default('')

function paginate<T>(items: T[], offset: number, limit: number) {
  return { total: items.length, offset, limit, hasMore: offset + limit < items.length, items: items.slice(offset, offset + limit) }
}

async function loadSession(context: ViteDevToolsNodeContext, requested = 'latest') {
  const manager = getLogsManager(context)
  const sessions = (await manager.list()).sort((a, b) => b.timestamp - a.timestamp)
  const selected = requested === 'latest' ? sessions[0] : sessions.find(session => session.id === requested)
  if (!selected)
    throw diagnostics.AGDT0001({ id: requested })
  return { id: selected.id, reader: await manager.loadAssetSession(selected.id) }
}

function totals(id: string, reader: RolldownEventsReader) {
  const chunks = reader.manager.chunks
  const assets = Array.from(reader.manager.assets.values())
  return {
    session: id,
    inputs: reader.meta?.inputs ?? [],
    buildDurationMs: reader.manager.build_end_time > 0 ? Math.max(0, reader.manager.build_end_time - reader.manager.build_start_time) : null,
    modules: reader.manager.modules.size,
    chunks: chunks.size,
    assets: assets.length,
    bundleBytes: assets.reduce((sum, asset) => sum + asset.size, 0),
    initialJsBytes: assets.filter(asset => asset.chunk_id != null && chunks.get(asset.chunk_id)?.is_initial)
      .reduce((sum, asset) => sum + asset.size, 0),
  }
}

export const rolldownAgentTools = [
  defineRpcFunction({
    name: 'vite:rolldown:agent:project',
    type: 'query',
    agent: { description: 'Rolldown build analysis: confirm the connected project directory before selecting recorded builds. Match cwd to the requested project; workspaceRoot identifies its workspace.' },
    setup: context => ({ handler: () => ({ cwd: context.cwd, workspaceRoot: context.workspaceRoot }) }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:list-sessions',
    type: 'query',
    args: [z.object(page)],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded builds: discover session ids for build-output analysis and comparisons, newest first. These are existing logs; this tool does not run a build. If empty, enable Rolldown recording and generate a build.' },
    setup: context => ({
      handler: async ({ offset = 0, limit = 20 }) => {
        const sessions = (await getLogsManager(context).list()).sort((a, b) => b.timestamp - a.timestamp)
        return paginate(sessions.map(({ id, timestamp, alias, meta }) => ({ id, timestamp, alias, inputs: meta.inputs })), offset, limit)
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:summary',
    type: 'query',
    args: [z.object({ session })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: start here to investigate output size and build composition. Returns emitted-byte totals, module/chunk counts and available data. session defaults to latest; pin the returned session id for follow-up Rolldown queries.' },
    setup: context => ({
      handler: async ({ session }) => {
        const { id, reader } = await loadSession(context, session)
        return {
          ...totals(id, reader),
          available: { packageGraph: reader.manager.packageGraphReady, plugins: reader.meta?.plugins?.length ?? 0 },
          notes: ['Output sizes are uncompressed emitted bytes. Plugin hook times can overlap and are not wall-clock build time.'],
        }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:assets',
    type: 'query',
    args: [z.object({ session, query, scope: z.enum(['all', 'initial', 'async', 'static']).default('all'), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: find large emitted files by filename substring and initial/async/static scope, ranked by uncompressed bytes. session defaults to latest. Filters precede pagination; pass a filename to the Rolldown modules tool as asset to inspect its contents.' },
    setup: context => ({
      handler: async ({ session, query = '', scope = 'all', offset = 0, limit = 20 }) => {
        const { id, reader } = await loadSession(context, session)
        const assets = Array.from(reader.manager.assets.values()).map((asset) => {
          const chunk = asset.chunk_id == null ? undefined : reader.manager.chunks.get(asset.chunk_id)
          return { filename: asset.filename, bytes: asset.size, scope: asset.chunk_id == null ? 'static' : chunk?.is_initial ? 'initial' : 'async', moduleCount: chunk?.modules.length ?? 0 }
        }).filter(asset => asset.filename.includes(query) && (scope === 'all' || scope === asset.scope)).sort((a, b) => b.bytes - a.bytes || a.filename.localeCompare(b.filename))
        return { session: id, ...paginate(assets, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:modules',
    type: 'query',
    args: [z.object({ session, query, asset: z.string().optional(), sortBy: z.enum(['id', 'importers']).default('id'), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: find module ids by substring, optionally restricted to an emitted asset, to investigate bundle composition. session defaults to latest. Sort by id or importer count; use the Rolldown module or trace-dependency tool for graph details.' },
    setup: context => ({
      handler: async ({ session, query = '', asset, sortBy = 'id', offset = 0, limit = 20 }) => {
        const { id, reader } = await loadSession(context, session)
        const chunkId = asset ? reader.manager.assets.get(asset)?.chunk_id : undefined
        const included = asset ? new Set(chunkId == null ? [] : reader.manager.chunks.get(chunkId)?.modules ?? []) : undefined
        const modules = Array.from(reader.manager.modules.values())
          .filter(module => module.id.includes(query) && (!included || included.has(module.id)))
          .map(module => ({ id: module.id, imports: module.imports?.length ?? 0, importers: module.importers?.length ?? 0 }))
          .sort((a, b) => (sortBy === 'importers' ? b.importers - a.importers : 0) || a.id.localeCompare(b.id))
        return { session: id, ...paginate(modules, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:module',
    type: 'query',
    args: [z.object({ session, module: z.string().min(1), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: inspect paginated imports and importers for an exact module id obtained from Rolldown modules. session defaults to latest. Returns null when absent; use Rolldown trace-dependency for multi-hop paths.' },
    setup: context => ({
      handler: async ({ session, module, offset = 0, limit = 20 }) => {
        const { id, reader } = await loadSession(context, session)
        const info = reader.manager.modules.get(module)
        return info ? { session: id, id: module, imports: paginate(info.imports ?? [], offset, limit), importers: paginate(info.importers ?? [], offset, limit) } : null
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:packages',
    type: 'query',
    args: [z.object({ session, query, duplicatedOnly: z.boolean().default(false), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: find dependencies by package name/id and optionally filter duplicate versions or copies. session defaults to latest. Ranked by transformed code bytes, before final output optimization. supported=false means package graph data is unavailable.' },
    setup: context => ({
      handler: async ({ session, query = '', duplicatedOnly = false, offset = 0, limit = 20 }) => {
        const { id, reader } = await loadSession(context, session)
        const meta = getPackageMeta(reader)
        const packages = meta.packages.filter(pkg => (pkg.name.includes(query) || pkg.id.includes(query)) && (!duplicatedOnly || pkg.duplicated))
          .map(pkg => ({ id: pkg.id, name: pkg.name, version: pkg.version, transformedBytes: pkg.transformedCodeSize, files: pkg.files.length, duplicated: !!pkg.duplicated, used: pkg.isUsed }))
          .sort((a, b) => b.transformedBytes - a.transformedBytes || a.id.localeCompare(b.id))
        return { session: id, supported: meta.isSupported, sizeBasis: 'transformed-code-bytes', ...paginate(packages, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:plugins',
    type: 'query',
    args: [z.object({ session, query, hook: z.enum(['total', 'resolve', 'load', 'transform']).default('total'), sortBy: z.enum(['duration', 'calls']).default('duration'), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: investigate build-plugin hook activity by plugin name and hook, ranked by duration or call count. session defaults to latest. Durations sum recorded hook milliseconds and may overlap; they do not measure wall-clock savings.' },
    setup: context => ({
      handler: async ({ session, query = '', hook = 'total', sortBy = 'duration', offset = 0, limit = 20 }) => {
        const { id, reader } = await loadSession(context, session)
        const plugins = Array.from((await reader.readPluginBuildMetricsSummary()).values())
          .filter(plugin => plugin.plugin_name.includes(query))
          .map(plugin => ({ id: plugin.plugin_id, name: plugin.plugin_name, durationMs: plugin[hook].duration, calls: plugin[hook].count }))
          .sort((a, b) => (sortBy === 'duration' ? b.durationMs - a.durationMs : b.calls - a.calls) || a.id - b.id)
        return { session: id, hook, durationBasis: 'sum-of-recorded-hook-calls', ...paginate(plugins, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:trace-dependency',
    type: 'query',
    args: [z.object({ session, target: z.object({ type: z.enum(['module', 'package', 'asset']), id: z.string().min(1) }), direction: z.enum(['importers', 'imports']).default('importers'), maxDepth: z.number().int().min(1).max(32).default(8), limit: z.number().int().min(1).max(100).default(5) })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded build: trace dependency paths to investigate how a module, package or emitted file is connected to entries. session defaults to latest; use an exact module id, package name/id or filename from Rolldown queries. Importer paths run toward the target. Each path reports its stopping reason; truncated signals omitted paths. Paths do not establish which exports survive tree shaking.' },
    setup: context => ({
      handler: async ({ session, target, direction = 'importers', maxDepth = 8, limit = 5 }) => {
        const { id, reader } = await loadSession(context, session)
        return { session: id, ...traceDependency(reader, { target, direction, maxDepth, limit }) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:rolldown:agent:compare',
    type: 'query',
    args: [z.object({ before: pinnedSession, after: pinnedSession, kind: z.enum(['assets', 'chunks', 'packages', 'plugins']).default('assets'), ...page })],
    returns: z.unknown(),
    agent: { description: 'Rolldown recorded builds: compare output and plugin metrics across two concrete session ids from list-sessions; latest is not accepted. Deltas are after minus before. Changed items are ranked by absolute delta before pagination. Assets use emitted bytes, packages use transformed bytes, chunks use emitted bytes with a transformed fallback, and plugins use accumulated hook milliseconds.' },
    setup: context => ({
      handler: async ({ before, after, kind = 'assets', offset = 0, limit = 20 }) => {
        const [baseline, current] = await Promise.all([loadSession(context, before), loadSession(context, after)])
        const details = await createSessionCompareDetails(baseline.reader, current.reader)
        const previous = totals(baseline.id, baseline.reader)
        const next = totals(current.id, current.reader)
        const changes = details[kind].filter(item => item.status !== 'unchanged')
        return {
          before: previous,
          after: next,
          delta: { bundleBytes: next.bundleBytes - previous.bundleBytes, initialJsBytes: next.initialJsBytes - previous.initialJsBytes, buildDurationMs: next.buildDurationMs == null || previous.buildDurationMs == null ? null : next.buildDurationMs - previous.buildDurationMs },
          kind,
          metric: kind === 'plugins' ? 'accumulated-hook-ms' : kind === 'packages' ? 'transformed-code-bytes' : kind === 'chunks' ? 'emitted-bytes-or-transformed-fallback' : 'emitted-bytes',
          packageGraphSupported: { before: baseline.reader.manager.packageGraphReady, after: current.reader.manager.packageGraphReady },
          ...paginate(changes, offset, limit),
          notes: ['Hashed filenames are matched heuristically; renamed outputs can appear as additions/removals. Timing differences alone do not establish a regression.'],
        }
      },
    }),
  }),
] as const
