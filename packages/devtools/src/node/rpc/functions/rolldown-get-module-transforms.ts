import type { RolldownModuleTransformInfo } from '~~/shared/types'
import { diffLines } from 'diff'
import { defineRpcFunction } from '../utils'

export const rolldownGetModuleTransforms = defineRpcFunction({
  name: 'vite:rolldown:get-module-transforms',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session, module }: { session: string, module: string }) => {
        const reader = await manager.loadSession(session)
        const events = reader.manager.events
        const moduleInfo = reader.manager.modules.get(module)
        const transforms = moduleInfo?.build_metrics?.transforms ?? []

        if (!events.length) {
          return transforms.map<RolldownModuleTransformInfo>(transform => ({
            ...transform,
            diff_added: 0,
            diff_removed: 0,
          }))
        }

        const normalizedTransforms: RolldownModuleTransformInfo[] = transforms.map((transform) => {
          let diff_added = 0
          let diff_removed = 0
          if (transform.content_from !== transform.content_to && transform.content_from != null && transform.content_to != null) {
            const delta = diffLines(transform.content_from, transform.content_to)
            diff_added = delta.filter(d => d.added).map(d => d.value).join('').split(/\n/g).length
            diff_removed = delta.filter(d => d.removed).map(d => d.value).join('').split(/\n/g).length
          }
          return {
            ...transform,
            diff_added,
            diff_removed,
          }
        })

        return normalizedTransforms.sort((a, b) => a.plugin_id - b.plugin_id)
      },
    }
  },
})
