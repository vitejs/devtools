import { defineRpcFunction } from '@vitejs/devtools-kit'

export const viteEnvInfo = defineRpcFunction({
  name: 'vite:env-info',
  type: 'query',
  setup: () => {
    return {
      handler: async () => {
        const { default: { helpers } } = await import('envinfo')

        const [cpu, os, memory, node, npm, pnpm, yarn] = await Promise.all([
          helpers.getCPUInfo().then(([,res]) => res),
          helpers.getOSInfo().then(([,res]) => res),
          helpers.getMemoryInfo().then(([,res]) => res),
          helpers.getNodeInfo().then(([,res]) => res),
          helpers.getnpmInfo().then(([,res]) => res),
          helpers.getpnpmInfo().then(([,res]) => res),
          helpers.getYarnInfo().then(([,res]) => res),
        ])

        return {
          cpu,
          os,
          memory,
          node,
          npm,
          pnpm,
          yarn,
        }
      },
    }
  },
})
