import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import { DevToolsInjection } from '../injection'

function injectedTags(plugin = DevToolsInjection()) {
  const transform = plugin.transformIndexHtml as { handler: () => unknown }
  return transform.handler() as Array<{ tag: string, attrs: Record<string, string>, children?: string, injectTo: string }>
}

describe('devToolsInjection', () => {
  it('injects an inline module that loads the hub-ui embedded bootstrap at runtime', () => {
    const tag = injectedTags()[0]!
    // Inline module (no static `src`) so Vite never pre-transforms the
    // hub-served `<base>embedded.js` through its own module pipeline.
    expect(tag.tag).toBe('script')
    expect(tag.attrs).toEqual({ type: 'module' })
    expect(tag.injectTo).toBe('body')
    expect(tag.children).toContain(`${DEVTOOLS_MOUNT_PATH}embedded.js`)
    expect(tag.children).toContain('document.body.appendChild(s)')
    expect(tag.children).toContain(`s.dataset.visibility = "normal"`)
  })

  it('forwards the visibility hint to the embedded bootstrap', () => {
    const tag = injectedTags(DevToolsInjection({ visibility: 'passive' }))[0]!
    expect(tag.children).toContain(`s.dataset.visibility = "passive"`)
  })
})
