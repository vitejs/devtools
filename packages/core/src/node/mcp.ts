/* eslint-disable no-console */

import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { AgentResource, AgentTool, DevframeNodeContext } from 'devframe/types'
import process from 'node:process'
import { createMcpServer } from 'devframe/adapters/mcp'
import { defineDevframe } from 'devframe/types'
import packageJson from '../../package.json' with { type: 'json' }

export interface McpOptions {
  root?: string
}

function redirectConsoleOutputToStderr() {
  const originalLog = console.log
  const originalInfo = console.info
  const originalDebug = console.debug
  console.log = (...args: unknown[]) => {
    console.error(...args)
  }
  console.info = (...args: unknown[]) => {
    console.error(...args)
  }
  console.debug = (...args: unknown[]) => {
    console.error(...args)
  }
  return () => {
    console.log = originalLog
    console.info = originalInfo
    console.debug = originalDebug
  }
}

function waitForStdioClose() {
  return new Promise<void>((resolve) => {
    const done = () => resolve()
    process.stdin.once('end', done)
    process.stdin.once('close', done)
    process.once('SIGINT', done)
    process.once('SIGTERM', done)
  })
}

function registerToolProxy(
  target: DevframeNodeContext,
  source: ViteDevToolsNodeContext,
  tool: AgentTool,
) {
  return target.agent.registerTool({
    id: tool.id,
    title: tool.title,
    description: tool.description,
    safety: tool.safety,
    tags: tool.tags,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    examples: tool.examples,
    handler: args => source.agent.invoke(tool.id, args ?? {}),
  })
}

function registerResourceProxy(
  target: DevframeNodeContext,
  source: ViteDevToolsNodeContext,
  resource: AgentResource,
) {
  return target.agent.registerResource({
    id: resource.id,
    name: resource.name,
    description: resource.description,
    mimeType: resource.mimeType,
    uri: resource.uri,
    read: () => source.agent.read(resource.id),
  })
}

function mirrorAgentSurface(target: DevframeNodeContext, source: ViteDevToolsNodeContext) {
  const handles: Array<{ unregister: () => void }> = []

  const sync = () => {
    while (handles.length) {
      handles.pop()!.unregister()
    }

    const manifest = source.agent.list()
    for (const tool of manifest.tools) {
      handles.push(registerToolProxy(target, source, tool))
    }
    for (const resource of manifest.resources) {
      handles.push(registerResourceProxy(target, source, resource))
    }
  }

  sync()
  source.agent.events.on('agent:manifest:changed', sync)
}

function createViteDevToolsMcpDefinition(options: McpOptions) {
  return defineDevframe({
    id: 'vite-devtools',
    name: 'Vite DevTools',
    version: packageJson.version,
    async setup(ctx) {
      const { startStandaloneDevTools } = await import('./standalone')
      const { registerBuiltinAgents } = await import('./agents')

      const { context } = await startStandaloneDevTools({
        cwd: options.root,
        builtinDevTools: false,
      })
      await registerBuiltinAgents(context)

      mirrorAgentSurface(ctx, context)
    },
  })
}

export async function startMcpServer(options: McpOptions = {}) {
  const restoreConsole = redirectConsoleOutputToStderr()
  let handle: Awaited<ReturnType<typeof createMcpServer>> | undefined
  try {
    handle = await createMcpServer(createViteDevToolsMcpDefinition(options), {
      transport: 'stdio',
      serverName: 'vite-devtools',
      serverVersion: packageJson.version,
    })
    await waitForStdioClose()
  }
  finally {
    await handle?.stop()
    restoreConsole()
  }
}
