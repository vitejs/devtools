import { describe, expect, it } from 'vitest'
import { openHelpers, openInEditor, openInFinder } from '../open-helpers'

describe('recipes/open-helpers', () => {
  it('exposes `openInEditor` as a devframe-namespaced action', () => {
    expect(openInEditor.name).toBe('devframe:open-in-editor')
    expect(openInEditor.type).toBe('action')
    expect(openInEditor.args).toHaveLength(1)
    expect(typeof openInEditor.handler).toBe('function')
  })

  it('exposes `openInFinder` as a devframe-namespaced action', () => {
    expect(openInFinder.name).toBe('devframe:open-in-finder')
    expect(openInFinder.type).toBe('action')
    expect(openInFinder.args).toHaveLength(1)
    expect(typeof openInFinder.handler).toBe('function')
  })

  it('bundles both helpers in `openHelpers`', () => {
    expect(openHelpers).toHaveLength(2)
    expect(openHelpers).toContain(openInEditor)
    expect(openHelpers).toContain(openInFinder)
  })
})
