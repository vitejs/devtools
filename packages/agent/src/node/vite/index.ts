import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteInspectModuleInfo, ViteInspectModuleTransformInfo, ViteInspectPluginMetric } from '@vitejs/devtools-vite'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { z } from 'zod'
import { diagnostics } from '../diagnostics'

const scope = { vite: z.string().min(1), env: z.string().min(1) }
const page = { offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(20) }

function paginate<T>(items: T[], offset: number, limit: number) {
  return { items: items.slice(offset, offset + limit), total: items.length, offset, limit, hasMore: offset + limit < items.length }
}

function inspect(context: ViteDevToolsNodeContext) {
  if (!context.rpc.definitions.has('vite:inspect:get-metadata'))
    throw diagnostics.AGDT0002()
  return context.rpc
}

export const viteAgentTools = [
  defineRpcFunction({
    name: 'vite:agent:environments',
    args: [],
    type: 'query',
    returns: z.unknown(),
    agent: { description: 'Vite development session: start here to investigate dev-time modules, transforms or plugin activity. Discover instance ids, project roots and environments; pass the chosen vite and env to all other Vite agent tools. available=false means inspection is inactive. Data reflects observed activity in this server session.' },
    setup: context => ({
      handler: async () => {
        if (!context.rpc.definitions.has('vite:inspect:get-metadata'))
          return { available: false, instances: [] }
        const metadata = await (await context.rpc.getHandler('vite:inspect:get-metadata'))()
        return { available: true, instances: metadata.instances.map((instance: { vite: string, root: string, environments: string[] }) => ({ vite: instance.vite, root: instance.root, environments: instance.environments })) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:agent:modules',
    type: 'query',
    returns: z.unknown(),
    args: [z.object({ ...scope, query: z.string().default(''), sortBy: z.enum(['id', 'duration']).default('duration'), ...page })],
    agent: { description: 'Vite development session: search observed modules to investigate dev-time dependencies and transform costs. First select vite and env with environments. Filter by id substring before pagination; sort by id or recorded transform milliseconds. Only observed modules are included, so an empty list may mean the app has not requested them yet.' },
    setup: context => ({
      handler: async ({ vite, env, query = '', sortBy = 'duration', offset = 0, limit = 20 }) => {
        const modules: ViteInspectModuleInfo[] = await (await inspect(context).getHandler('vite:inspect:get-modules-list'))({ vite, env })
        const items = modules.filter(module => module.id.includes(query))
          .map(module => ({ id: module.id, imports: module.deps.length, importers: module.importers.length, durationMs: module.totalTime, virtual: module.virtual }))
          .sort((a, b) => (sortBy === 'duration' ? b.durationMs - a.durationMs : 0) || a.id.localeCompare(b.id))
        return { vite, env, ...paginate(items, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:agent:module',
    type: 'query',
    returns: z.unknown(),
    args: [z.object({ ...scope, module: z.string().min(1), ...page })],
    agent: { description: 'Vite development session: inspect current imports and importers for an exact id from Vite modules. First select vite and env with environments. Both edge lists are paginated; module=null means the id is absent from observed data. Use Vite transforms for its recorded resolved id and transformation steps.' },
    setup: context => ({
      handler: async ({ vite, env, module, offset = 0, limit = 20 }) => {
        const modules: ViteInspectModuleInfo[] = await (await inspect(context).getHandler('vite:inspect:get-modules-list'))({ vite, env })
        const found = modules.find(item => item.id === module)
        return { vite, env, module: found ? { id: found.id, virtual: found.virtual, durationMs: found.totalTime, imports: paginate(found.deps, offset, limit), importers: paginate(found.importers, offset, limit) } : null }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:agent:transforms',
    type: 'query',
    returns: z.unknown(),
    args: [z.object({ ...scope, module: z.string().min(1), includeCode: z.boolean().default(false), codeOffset: z.number().int().min(0).default(0), ...page, limit: z.number().int().min(1).max(20).default(10) })],
    agent: { description: 'Vite development session: inspect recorded load/transform steps and the resolved module id to investigate dev-time code changes. Select vite and env with environments; use an id from Vite modules. Reads existing records without triggering a transform. Code is omitted unless includeCode=true; select a step with offset and limit=1, then advance codeOffset in 4000 UTF-16 code-unit increments while codeHasMore. Empty steps mean no recorded transformations.' },
    setup: context => ({
      handler: async ({ vite, env, module, includeCode = false, codeOffset = 0, offset = 0, limit = 10 }) => {
        const info: ViteInspectModuleTransformInfo = await (await inspect(context).getHandler('vite:inspect:get-module-transform-info'))({ vite, env }, module)
        const steps = info.transforms.map((step, index) => ({
          index,
          plugin: step.name,
          pluginId: step.plugin_id,
          durationMs: Math.max(0, step.end - step.start),
          error: step.error?.message,
          codeLength: step.result?.length ?? 0,
          ...(includeCode ? { code: step.result?.slice(codeOffset, codeOffset + 4000) ?? null, codeOffset, codeHasMore: (step.result?.length ?? 0) > codeOffset + 4000 } : {}),
        }))
        return { vite, env, module, resolvedId: info.resolvedId, ...paginate(steps, offset, limit) }
      },
    }),
  }),
  defineRpcFunction({
    name: 'vite:agent:plugins',
    type: 'query',
    returns: z.unknown(),
    args: [z.object({ ...scope, query: z.string().default(''), ...page })],
    agent: { description: 'Vite development session: investigate plugin resolve and transform activity already observed by this dev server. First select vite and env with environments. Filter by plugin name; results are ranked by accumulated hook milliseconds. Times may overlap and do not establish wall-clock savings or the cause of an HMR issue.' },
    setup: context => ({
      handler: async ({ vite, env, query = '', offset = 0, limit = 20 }) => {
        const plugins: ViteInspectPluginMetric[] = await (await inspect(context).getHandler('vite:inspect:get-plugin-metrics'))({ vite, env })
        const items = plugins.filter(plugin => plugin.name.includes(query)).map(plugin => ({
          id: plugin.plugin_id,
          name: plugin.name,
          resolve: { calls: plugin.resolveId.invokeCount, durationMs: plugin.resolveId.totalTime },
          transform: { calls: plugin.transform.invokeCount, durationMs: plugin.transform.totalTime },
          durationMs: plugin.resolveId.totalTime + plugin.transform.totalTime,
        })).sort((a, b) => b.durationMs - a.durationMs || a.name.localeCompare(b.name))
        return { vite, env, ...paginate(items, offset, limit) }
      },
    }),
  }),
] as const
