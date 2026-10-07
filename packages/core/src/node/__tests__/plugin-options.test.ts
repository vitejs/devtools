import type { Plugin } from 'vite'
import { describe, expect, it } from 'vitest'
import { DevTools } from '../plugins'

describe('devTools() options', () => {
  it('accepts config options such as clientAuth', async () => {
    const plugins = await DevTools({ clientAuth: false, clientAuthTokens: ['token'] })
    const configPlugin = plugins.find(p => p.name === 'vite:devtools') as Plugin
    const viteConfig = { plugins, server: { host: undefined } } as any
    const hook = configPlugin.configResolved as { handler: (config: any) => void }
    hook.handler(viteConfig)

    expect(viteConfig.devtools.config.clientAuth).toBe(false)
    expect(viteConfig.devtools.config.clientAuthTokens).toEqual(['token'])
  })
})
