import type { DevToolsHost } from '../../types/host'
import { describe, expect, it } from 'vitest'
import { createHostContext } from '../context'

function nullHost(): DevToolsHost {
  return {
    mountStatic: () => { /* no-op */ },
    resolveOrigin: () => 'http://localhost:0',
  }
}

describe('agent introspection RPCs', () => {
  it('registers devframe:agent:list-tools and returns the tool manifest', async () => {
    const ctx = await createHostContext({ cwd: process.cwd(), mode: 'dev', host: nullHost() })

    ctx.agent.registerTool({
      id: 'hello',
      description: 'Say hello.',
      handler: () => 'hi',
    })

    const tools = await ctx.rpc.invokeLocal('devframe:agent:list-tools' as any) as any[]
    expect(tools).toHaveLength(1)
    expect(tools[0]).toMatchObject({
      id: 'hello',
      kind: 'tool',
      description: 'Say hello.',
    })
  })

  it('routes devframe:agent:invoke-tool through the agent host', async () => {
    const ctx = await createHostContext({ cwd: process.cwd(), mode: 'dev', host: nullHost() })

    let received: unknown
    ctx.agent.registerTool({
      id: 'capture',
      description: 'Capture args.',
      handler: (args) => {
        received = args
        return 'ok'
      },
    })

    const result = await ctx.rpc.invokeLocal('devframe:agent:invoke-tool' as any, 'capture', { payload: 42 })
    expect(result).toBe('ok')
    expect(received).toEqual({ payload: 42 })
  })

  it('registers list-resources + read-resource', async () => {
    const ctx = await createHostContext({ cwd: process.cwd(), mode: 'dev', host: nullHost() })

    ctx.agent.registerResource({
      id: 'build-summary',
      name: 'Build summary',
      read: () => ({ text: 'Build OK' }),
    })

    const resources = await ctx.rpc.invokeLocal('devframe:agent:list-resources' as any) as any[]
    expect(resources).toHaveLength(1)
    expect(resources[0]).toMatchObject({
      id: 'build-summary',
      uri: 'devframe://resource/build-summary',
      name: 'Build summary',
    })

    const content = await ctx.rpc.invokeLocal('devframe:agent:read-resource' as any, 'build-summary') as any
    expect(content).toEqual({ text: 'Build OK' })
  })
})
