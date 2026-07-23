import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isNormalModeEnabled, isPassive, resolveModeFile, setNormalMode } from './passive-mode'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'vite-devtools-passive-'))
  // A real project has a node_modules; the flag anchors to it.
  mkdirSync(join(root, 'node_modules'), { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('passive-mode', () => {
  it('anchors the flag file inside the nearest node_modules', () => {
    expect(resolveModeFile(root)).toBe(join(root, 'node_modules', '.vite-devtools', 'mode.json'))
  })

  it('walks up to a parent node_modules when the root has none', () => {
    const nested = join(root, 'packages', 'app')
    mkdirSync(nested, { recursive: true })
    expect(resolveModeFile(nested)).toBe(join(root, 'node_modules', '.vite-devtools', 'mode.json'))
  })

  it('defaults to not enabled and reports passive', () => {
    expect(isNormalModeEnabled(root)).toBe(false)
    expect(isPassive(root, true)).toBe(true)
  })

  it('persists normal mode, flipping passive off', () => {
    setNormalMode(root, true)
    expect(existsSync(resolveModeFile(root))).toBe(true)
    expect(isNormalModeEnabled(root)).toBe(true)
    expect(isPassive(root, true)).toBe(false)
  })

  it('removes the flag when disabled', () => {
    setNormalMode(root, true)
    setNormalMode(root, false)
    expect(existsSync(resolveModeFile(root))).toBe(false)
    expect(isNormalModeEnabled(root)).toBe(false)
  })

  it('always reports not-passive when the option is disabled', () => {
    expect(isPassive(root, false)).toBe(false)
    setNormalMode(root, true)
    expect(isPassive(root, false)).toBe(false)
  })
})
