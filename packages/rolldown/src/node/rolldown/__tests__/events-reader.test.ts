import type { Event } from '@rolldown/debug'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../events-reader'

describe('rolldown events reader', () => {
  it('does not process the same log bytes twice during concurrent reads', async () => {
    const reader = RolldownEventsReader.get('/mock/logs.json')
    let resolveRead!: () => void
    const readComplete = new Promise<void>((resolve) => {
      resolveRead = resolve
    })
    const event = { action: 'BuildStart', timestamp: '1772529438599', session_id: '5173' } satisfies Event

    const readChanges = vi.fn(async () => {
      reader.manager.handleEvent(event)
      await readComplete
    })
    Object.defineProperty(reader, 'readChanges', { value: readChanges })

    try {
      const reads = [
        reader.read(),
        reader.read(),
        reader.read(),
      ]

      expect(readChanges).toHaveBeenCalledTimes(1)
      resolveRead()
      await Promise.all(reads)

      expect(reader.manager.eventCount).toBe(1)

      await reader.read()
      expect(readChanges).toHaveBeenCalledTimes(2)
    }
    finally {
      reader.dispose()
    }
  })

  it('includes PackageGraphReady in package summary reads', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rolldown-events-reader-'))
    const filepath = join(dir, 'logs.json')
    const reader = RolldownEventsReader.get(filepath)

    await writeFile(filepath, `${JSON.stringify({
      action: 'PackageGraphReady',
      timestamp: '1772529438599',
      session_id: '5173',
      packages: [{
        package_id: 'pkg:foo@1.0.0',
        name: 'foo',
        version: '1.0.0',
        package_json_path: '/repo/node_modules/foo/package.json',
        package_root: '/repo/node_modules/foo',
        is_used: true,
        dependency_type: 'direct',
        size: 42,
        modules: ['/repo/node_modules/foo/index.js'],
        chunk_ids: [1],
      }],
    })}\n`)

    try {
      await reader.readPackageSummary()

      expect(reader.manager.packageGraphReady).toBe(true)
      expect(reader.manager.packages.get('pkg:foo@1.0.0')).toMatchObject({
        name: 'foo',
        version: '1.0.0',
        package_root: '/repo/node_modules/foo',
      })
    }
    finally {
      reader.dispose()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
