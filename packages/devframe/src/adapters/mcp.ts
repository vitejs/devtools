// Public entry for the devframe MCP adapter. Translates the agent-host
// surface of a DevtoolDefinition into an MCP server.
//
// Usage:
//   import { createMcpServer } from 'devframe/adapters/mcp'
//   await createMcpServer(definition, { transport: 'stdio' })
//
// Requires `@modelcontextprotocol/sdk` to be installed as a peer
// dependency. Importing this entry without the SDK throws at load time
// with the usual Node module-not-found error.
//
// @experimental The agent-native surface is experimental and may change
// without a major version bump until it stabilizes.

export {
  createMcpServer,
  type CreateMcpServerOptions,
  type McpServerHandle,
} from '../node/mcp/build-server'
