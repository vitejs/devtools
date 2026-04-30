import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

/**
 * Start the MCP server on stdio. Returns a stop function.
 * @internal
 */
export async function startStdioTransport(server: Server): Promise<() => Promise<void>> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  return async () => {
    await server.close()
  }
}
