import type { DevToolsHost } from '../../../types/host'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { createHostContext } from '../../context'
import { buildMcpServerFromContext } from '../build-server'

function nullHost(): DevToolsHost {
  return {
    mountStatic: () => { /* no-op */ },
    resolveOrigin: () => 'mcp://test',
  }
}

async function bootPair() {
  const ctx = await createHostContext({ cwd: process.cwd(), mode: 'dev', host: nullHost() })

  const { server, dispose } = buildMcpServerFromContext(ctx, {
    serverName: 'test',
    serverVersion: '0.0.0-test',
    exposeSharedState: true,
  })

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)

  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await client.connect(clientTransport)

  return {
    ctx,
    client,
    cleanup: async () => {
      dispose()
      await client.close()
      await server.close()
    },
  }
}

describe('mcp adapter (in-memory)', () => {
  it('lists tools registered via ctx.agent.registerTool', async () => {
    const { ctx, client, cleanup } = await bootPair()
    try {
      ctx.agent.registerTool({
        id: 'greet',
        description: 'Say hello.',
        safety: 'read',
        handler: () => ({ greeting: 'hi' }),
      })

      const result = await client.listTools()
      expect(result.tools.map(t => t.name)).toContain('greet')
      const tool = result.tools.find(t => t.name === 'greet')!
      expect(tool.description).toBe('Say hello.')
      expect(tool.annotations?.readOnlyHint).toBe(true)
    }
    finally {
      await cleanup()
    }
  })

  it('calls a tool and returns the text content', async () => {
    const { ctx, client, cleanup } = await bootPair()
    try {
      ctx.agent.registerTool({
        id: 'echo',
        description: 'Echo.',
        handler: args => ({ echoed: args }),
      })

      const result = await client.callTool({ name: 'echo', arguments: { foo: 'bar' } })
      const content = result.content as Array<{ type: string, text: string }>
      expect(content[0]!.type).toBe('text')
      expect(JSON.parse(content[0]!.text)).toEqual({ echoed: { foo: 'bar' } })
    }
    finally {
      await cleanup()
    }
  })

  it('lists and reads registered resources', async () => {
    const { ctx, client, cleanup } = await bootPair()
    try {
      ctx.agent.registerResource({
        id: 'build-status',
        name: 'Build status',
        description: 'Current build status.',
        read: () => ({ json: { status: 'ok' } }),
      })

      const listed = await client.listResources()
      const resource = listed.resources.find(r => r.uri === 'devframe://resource/build-status')
      expect(resource).toBeDefined()
      expect(resource!.name).toBe('Build status')

      const read = await client.readResource({ uri: 'devframe://resource/build-status' })
      const c = read.contents[0] as { text: string, mimeType?: string }
      expect(c.mimeType).toBe('application/json')
      expect(JSON.parse(c.text)).toEqual({ status: 'ok' })
    }
    finally {
      await cleanup()
    }
  })

  it('surfaces shared-state keys as MCP resources', async () => {
    const { ctx, client, cleanup } = await bootPair()
    try {
      const state = await ctx.rpc.sharedState.get('my-plugin:counter' as any, {
        initialValue: { count: 7 },
      })

      const listed = await client.listResources()
      const key = 'my-plugin:counter'
      const encoded = encodeURIComponent(key)
      const resource = listed.resources.find(r => r.uri === `devframe://state/${encoded}`)
      expect(resource).toBeDefined()

      const read = await client.readResource({ uri: `devframe://state/${encoded}` })
      const c = read.contents[0] as { text: string }
      expect(JSON.parse(c.text)).toEqual({ count: 7 })
      // Satisfy linter by touching the state handle.
      expect(state.value()).toEqual({ count: 7 })
    }
    finally {
      await cleanup()
    }
  })
})
