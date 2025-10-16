import type { ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { createDevToolsContext } from '../context'

async function emptyHandler() { /* empty */ }
const resultOk = async () => ({ result: 'ok' })
const resultDifferent = async () => ({ result: 'different' })
const statusOk = async () => ({ status: 'ok' })
const statusAlsoOk = async () => ({ status: 'also ok' })
const recoveredTrue = async () => ({ recovered: true })
const setupWith = <T>(handler: () => Promise<T>) => async () => ({ handler })
async function failingHandler() {
  throw new Error('Intentional test error')
}

describe('registration Safety Integration Tests', () => {
  // Mock Vite config
  const mockViteConfig = {
    root: process.cwd(),
    command: 'build',
    plugins: [],
  } as unknown as ResolvedConfig

  describe('scenario 1: RPC Collision Detection', () => {
    it('should detect and prevent duplicate RPC function registrations', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      // Register first function
      ctx.rpc.register({
        name: 'test-analyze',
        type: 'action',
        setup: setupWith(resultOk),
      })

      // Attempt to register duplicate
      const registerDuplicate = () =>
        ctx.rpc.register({
          name: 'test-analyze',
          type: 'action',
          setup: setupWith(resultDifferent),
        })
      expect(registerDuplicate).toThrow(/test-analyze.*already registered/)

      // Verify original function is intact
      expect(ctx.rpc.definitions.has('test-analyze')).toBe(true)
    })

    it('should allow different plugins to register different function names', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)
      const initialSize = ctx.rpc.definitions.size

      ctx.rpc.register({
        name: 'plugin-a-function',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      ctx.rpc.register({
        name: 'plugin-b-function',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      expect(ctx.rpc.definitions.size).toBe(initialSize + 2)
    })
  })

  describe('scenario 2: Dock Update Method', () => {
    it('should fail to update non-existent dock', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      const updateNonexistentDock = () =>
        ctx.docks.update({
          type: 'iframe',
          id: 'nonexistent-panel',
          title: 'Test Panel',
          icon: 'icon',
          url: 'http://localhost:3000',
        })
      expect(updateNonexistentDock).toThrow(/nonexistent-panel.*not registered.*Use register\(\)/)
    })

    it('should successfully update existing dock', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      // Register
      ctx.docks.register({
        type: 'iframe',
        id: 'my-panel',
        title: 'Original Title',
        icon: 'original',
        url: 'http://localhost:3000',
      })

      // Update
      ctx.docks.update({
        type: 'iframe',
        id: 'my-panel',
        title: 'Updated Title',
        icon: 'updated',
        url: 'http://localhost:3001',
      })

      // Verify
      const docks = ctx.docks.values()
      const myPanel = docks.find(d => d.id === 'my-panel')
      expect(myPanel?.title).toBe('Updated Title')
      expect((myPanel as any)?.url).toBe('http://localhost:3001')
    })
  })

  describe('scenario 3: RPC Error Handling Without Context Crash', () => {
    it('should handle RPC errors gracefully without crashing context', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)
      const initialSize = ctx.rpc.definitions.size

      // Register stable function
      ctx.rpc.register({
        name: 'stable-function',
        type: 'query',
        setup: setupWith(statusOk),
      })

      // Register failing function
      ctx.rpc.register({
        name: 'failing-function',
        type: 'action',
        setup: setupWith(failingHandler),
      })

      // Register another stable function
      ctx.rpc.register({
        name: 'another-stable-function',
        type: 'query',
        setup: setupWith(statusAlsoOk),
      })

      // Verify context is operational
      expect(ctx.rpc.definitions.size).toBe(initialSize + 3)

      // Verify stable functions are registered
      expect(ctx.rpc.definitions.has('stable-function')).toBe(true)
      expect(ctx.rpc.definitions.has('another-stable-function')).toBe(true)

      // Verify we can still register new functions after having a failing one
      ctx.rpc.register({
        name: 'post-error-function',
        type: 'action',
        setup: setupWith(recoveredTrue),
      })

      expect(ctx.rpc.definitions.has('post-error-function')).toBe(true)
    })

    it('should allow context operations after registration errors', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)
      const initialSize = ctx.rpc.definitions.size

      ctx.rpc.register({
        name: 'first',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      // Cause collision error
      try {
        ctx.rpc.register({
          name: 'first',
          type: 'action',
          setup: setupWith(emptyHandler),
        })
      }
      catch {
        // Expected error
      }

      // Context should still be operational
      ctx.rpc.register({
        name: 'second',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      expect(ctx.rpc.definitions.size).toBe(initialSize + 2)
    })
  })

  describe('scenario 4: Cross-Host Collision Detection', () => {
    it('should detect collisions across all host types', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      // Test RPC collision
      ctx.rpc.register({
        name: 'test-func',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      const registerRpcDuplicate = () =>
        ctx.rpc.register({
          name: 'test-func',
          type: 'action',
          setup: setupWith(emptyHandler),
        })
      expect(registerRpcDuplicate).toThrow(/test-func/)

      // Test Dock collision
      ctx.docks.register({
        type: 'iframe',
        id: 'test-dock',
        title: 'Dock 1',
        icon: 'icon1',
        url: 'http://localhost:3001',
      })

      expect(() => {
        ctx.docks.register({
          type: 'iframe',
          id: 'test-dock',
          title: 'Dock 2',
          icon: 'icon2',
          url: 'http://localhost:3002',
        })
      }).toThrow(/test-dock/)
    })

    it('should allow same ID across different host types', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      // Same ID "shared" can exist in both RPC and Docks
      ctx.rpc.register({
        name: 'shared',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      ctx.docks.register({
        type: 'iframe',
        id: 'shared',
        title: 'Shared Dock',
        icon: 'icon',
        url: 'http://localhost:3000',
      })

      expect(ctx.rpc.definitions.has('shared')).toBe(true)
      expect(ctx.docks.views.has('shared')).toBe(true)
    })

    it('should provide clear error messages for each host type', async () => {
      const ctx = await createDevToolsContext(mockViteConfig)

      ctx.rpc.register({
        name: 'rpc-test',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      ctx.docks.register({
        type: 'iframe',
        id: 'dock-test',
        title: 'Dock',
        icon: 'icon',
        url: 'http://localhost:3000',
      })

      // RPC error should mention "RPC function"
      const registerRpcAgain = () =>
        ctx.rpc.register({
          name: 'rpc-test',
          type: 'action',
          setup: setupWith(emptyHandler),
        })
      expect(registerRpcAgain).toThrow(/RPC function/)

      // Dock error should mention "Dock"
      expect(() => {
        ctx.docks.register({
          type: 'iframe',
          id: 'dock-test',
          title: 'Dock 2',
          icon: 'icon',
          url: 'http://localhost:3001',
        })
      }).toThrow(/Dock/)
    })
  })
})
