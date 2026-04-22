import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createStorage } from '../storage'

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('createStorage', () => {
  it('falls back to initial value when persisted JSON is invalid', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'vite-devtools-storage-'))
    const filepath = join(dir, 'state.json')
    fs.writeFileSync(filepath, '{invalid json', 'utf-8')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const state = createStorage({
        filepath,
        initialValue: { count: 1 },
        debounce: 0,
      })

      expect(state.value()).toEqual({ count: 1 })
      expect(warnSpy).toHaveBeenCalled()

      state.mutate((draft) => {
        draft.count = 2
      })

      await wait(20)

      const saved = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
      expect(saved).toEqual({ count: 2 })
    }
    finally {
      warnSpy.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
