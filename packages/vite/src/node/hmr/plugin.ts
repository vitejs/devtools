import type { EnvironmentModuleNode, Plugin } from 'vite'
import type { HmrGraphEdge, HmrGraphNode } from '../../shared/types'
import type { HmrTracker } from './tracker'
import { isAbsolute, relative } from 'pathe'
import { searchForWorkspaceRoot } from 'vite'

export function createHmrTrackerPlugin(tracker: HmrTracker): Plugin {
  let root: string
  return {
    name: 'vite:devtools:hmr-tracker',
    configResolved(config) {
      root = searchForWorkspaceRoot(config.root)
    },
    hotUpdate({ type: changeType, file, modules, timestamp }) {
      if (modules.length === 0)
        return
      const rel = (p: string) => isAbsolute(p) ? relative(root, p) : p
      const decode = (s: string) => {
        try {
          return decodeURIComponent(s)
        }
        catch {
          return s
        }
      }
      const modId = (m: EnvironmentModuleNode) => rel(decode(m.id ?? m.url))

      // Walk the module graph to build propagation path
      const boundaries = new Set<string>()
      const graphNodes = new Map<string, HmrGraphNode>()
      const graphEdges: HmrGraphEdge[] = []
      const visited = new Set<EnvironmentModuleNode>()

      function nodeData(mod: EnvironmentModuleNode, role: HmrGraphNode['type']): HmrGraphNode {
        const id = modId(mod)
        const node: HmrGraphNode = { id, type: role, moduleType: mod.type, selfAccepting: !!mod.isSelfAccepting, importersCount: mod.importers.size }
        const deps = [...mod.acceptedHmrDeps].map(d => modId(d))
        if (deps.length)
          node.acceptedDeps = deps
        if (mod.acceptedHmrExports !== null && mod.acceptedHmrExports !== undefined)
          node.acceptedExports = [...mod.acceptedHmrExports]
        return node
      }

      function walk(mod: EnvironmentModuleNode) {
        if (visited.has(mod))
          return
        visited.add(mod)

        const id = modId(mod)

        if (mod.isSelfAccepting) {
          boundaries.add(id)
          graphNodes.set(id, nodeData(mod, 'boundary'))
          return
        }

        for (const importer of mod.importers) {
          const importerId = modId(importer)
          graphEdges.push({ from: importerId, to: id })

          if (importer.acceptedHmrDeps.has(mod)) {
            boundaries.add(importerId)
            graphNodes.set(importerId, nodeData(importer, 'boundary'))
          }
          else {
            if (!graphNodes.has(importerId))
              graphNodes.set(importerId, nodeData(importer, 'intermediate'))
            walk(importer)
          }
        }
      }

      const relFile = rel(file)
      for (const mod of modules) {
        graphNodes.set(modId(mod), nodeData(mod, 'source'))
      }
      for (const mod of modules) {
        walk(mod)
      }

      tracker.record({
        timestamp,
        type: 'update',
        changeType,
        files: [relFile],
        modules: modules.map(m => modId(m)),
        boundaries: [...boundaries],
        graph: { nodes: [...graphNodes.values()], edges: graphEdges },
      })
    },
  }
}
