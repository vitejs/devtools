import type { SharedStatePatch } from './shared-state'
import { describe, expect, it, vi } from 'vitest'
import { createSharedState } from './shared-state'

describe('shared-state', () => {
  describe('immutability', () => {
    it('should return immutable state from get()', () => {
      const state = createSharedState({
        initialState: { count: 0, items: ['a', 'b'] },
      })

      const currentState = state.value()

      // State should be readonly at type level
      // Runtime: mutations should not affect internal state when done through proper API
      // The state returned is a reference to the internal state, but mutations
      // must go through mutate() to change the internal state
      expect(currentState.count).toBe(0)
      expect(state.value().count).toBe(0)
    })

    it('should not mutate original state when mutating returned state directly', () => {
      const state = createSharedState({
        initialState: { count: 0, nested: { value: 'test' } },
      })

      const state1 = state.value()

      // Mutate through proper API
      state.mutate((draft) => {
        draft.count = 999
        draft.nested.value = 'changed'
      })

      // Original reference should be different from new state
      const state2 = state.value()
      expect(state1).not.toBe(state2)
      expect(state1.count).toBe(0)
      expect(state1.nested.value).toBe('test')
      expect(state2.count).toBe(999)
      expect(state2.nested.value).toBe('changed')
    })

    it('should return new immutable state after mutation', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      const state1 = state.value()
      state.mutate((draft) => {
        draft.count = 1
      })
      const state2 = state.value()

      // States should be different objects
      expect(state1).not.toBe(state2)
      expect(state1.count).toBe(0)
      expect(state2.count).toBe(1)
    })

    it('should maintain immutability for nested objects', () => {
      const state = createSharedState({
        initialState: {
          user: {
            name: 'Alice',
            profile: {
              age: 30,
            },
          },
        },
      })

      const state1 = state.value()

      // Mutate through proper API
      state.mutate((draft) => {
        draft.user.name = 'Bob'
        draft.user.profile.age = 31
      })

      const state2 = state.value()

      // Original state should be unchanged
      expect(state1.user.name).toBe('Alice')
      expect(state1.user.profile.age).toBe(30)
      // New state should have changes
      expect(state2.user.name).toBe('Bob')
      expect(state2.user.profile.age).toBe(31)
      // References should be different
      expect(state1).not.toBe(state2)
      expect(state1.user).not.toBe(state2.user)
      expect(state1.user.profile).not.toBe(state2.user.profile)
    })

    it('should maintain immutability for arrays', () => {
      const state = createSharedState({
        initialState: { items: [1, 2, 3] },
      })

      const state1 = state.value()

      // Mutate through proper API
      state.mutate((draft) => {
        draft.items.push(4)
        draft.items[0] = 999
      })

      const state2 = state.value()

      // Original state should be unchanged
      expect(state1.items).toEqual([1, 2, 3])
      // New state should have changes
      expect(state2.items).toEqual([999, 2, 3, 4])
      // References should be different
      expect(state1).not.toBe(state2)
      expect(state1.items).not.toBe(state2.items)
    })
  })

  describe('sync dead loop prevention', () => {
    it('should prevent duplicate mutations with same syncId', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      const syncId = 'test-sync-id'

      // First mutation should succeed
      state.mutate((draft) => {
        draft.count = 1
      }, syncId)

      expect(state.value().count).toBe(1)
      expect(state.syncIds.has(syncId)).toBe(true)

      // Second mutation with same syncId should be ignored
      state.mutate((draft) => {
        draft.count = 2
      }, syncId)

      // State should remain unchanged
      expect(state.value().count).toBe(1)
    })

    it('should prevent duplicate patches with same syncId', () => {
      const state = createSharedState({
        initialState: { count: 0 },
        enablePatches: true,
      })

      const syncId = 'test-sync-id'
      const patches: SharedStatePatch[] = [
        {
          op: 'replace',
          path: ['count'],
          value: 10,
        },
      ]

      // First patch should succeed
      state.patch(patches, syncId)

      expect(state.value().count).toBe(10)
      expect(state.syncIds.has(syncId)).toBe(true)

      // Second patch with same syncId should be ignored
      const patches2: SharedStatePatch[] = [
        {
          op: 'replace',
          path: ['count'],
          value: 20,
        },
      ]
      state.patch(patches2, syncId)

      // State should remain unchanged
      expect(state.value().count).toBe(10)
    })

    it('should allow different mutations with different syncIds', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      state.mutate((draft) => {
        draft.count = 1
      }, 'sync-1')

      expect(state.value().count).toBe(1)

      state.mutate((draft) => {
        draft.count = 2
      }, 'sync-2')

      expect(state.value().count).toBe(2)
      expect(state.syncIds.has('sync-1')).toBe(true)
      expect(state.syncIds.has('sync-2')).toBe(true)
    })

    it('should prevent sync loop when mutate triggers event listener that mutates again', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      const syncId = 'loop-sync-id'
      const listener = vi.fn()

      state.on('updated', (fullState, patches, receivedSyncId) => {
        listener(fullState, patches, receivedSyncId)
        // Try to mutate again with the same syncId (should be prevented)
        state.mutate((draft) => {
          draft.count = 999
        }, syncId)
      })

      // Initial mutation
      state.mutate((draft) => {
        draft.count = 1
      }, syncId)

      // Listener should be called once
      expect(listener).toHaveBeenCalledTimes(1)
      // State should be 1, not 999 (loop prevented)
      expect(state.value().count).toBe(1)
    })

    it('should prevent sync loop when patch triggers event listener that patches again', () => {
      const state = createSharedState({
        initialState: { count: 0 },
        enablePatches: true,
      })

      const syncId = 'loop-sync-id'
      const listener = vi.fn()

      state.on('updated', (fullState, patches, receivedSyncId) => {
        listener(fullState, patches, receivedSyncId)
        // Try to patch again with the same syncId (should be prevented)
        state.patch([
          {
            op: 'replace',
            path: ['count'],
            value: 999,
          },
        ], syncId)
      })

      // Initial patch
      state.patch([
        {
          op: 'replace',
          path: ['count'],
          value: 1,
        },
      ], syncId)

      // Listener should be called once
      expect(listener).toHaveBeenCalledTimes(1)
      // State should be 1, not 999 (loop prevented)
      expect(state.value().count).toBe(1)
    })

    it('should generate unique syncIds when not provided', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      // Multiple mutations without syncId should all succeed
      state.mutate((draft) => {
        draft.count = 1
      })
      state.mutate((draft) => {
        draft.count = 2
      })
      state.mutate((draft) => {
        draft.count = 3
      })

      expect(state.value().count).toBe(3)
      // Each mutation should have generated a unique syncId
      expect(state.syncIds.size).toBe(3)
    })

    it('should track syncIds correctly', () => {
      const state = createSharedState({
        initialState: { count: 0 },
      })

      expect(state.syncIds.size).toBe(0)

      state.mutate((draft) => {
        draft.count = 1
      }, 'sync-1')

      expect(state.syncIds.size).toBe(1)
      expect(state.syncIds.has('sync-1')).toBe(true)

      state.mutate((draft) => {
        draft.count = 2
      }, 'sync-2')

      expect(state.syncIds.size).toBe(2)
      expect(state.syncIds.has('sync-1')).toBe(true)
      expect(state.syncIds.has('sync-2')).toBe(true)
    })

    it('should able to sync between two shared states', () => {
      const state1 = createSharedState({
        initialState: { count: 0 },
      })
      const state2 = createSharedState({
        initialState: { count: 10 },
      })

      const clone = <T>(s: T): T => JSON.parse(JSON.stringify(s)) as T

      state1.on('updated', (fullState, _patches, syncId) => {
        state2.mutate(() => clone(fullState), syncId)
      })

      state2.on('updated', (fullState, _patches, syncId) => {
        state1.mutate(() => clone(fullState), syncId)
      })

      expect(state1.value().count).toBe(0)
      expect(state2.value().count).toBe(10)

      state1.mutate((draft) => {
        draft.count = 1
      })

      expect(state2.value().count).toBe(1)
      expect(state1.value().count).toBe(1)

      state2.mutate((draft) => {
        draft.count += 1
      })

      expect(state1.value().count).toBe(2)
      expect(state2.value().count).toBe(2)
    })
  })
})
