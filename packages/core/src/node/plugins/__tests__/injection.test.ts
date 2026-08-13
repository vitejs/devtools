import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import { DevToolsInjection } from '../injection'

function injectedTags(plugin = DevToolsInjection()) {
  const transform = plugin.transformIndexHtml as { handler: () => unknown }
  return transform.handler() as Array<{ tag: string, attrs: Record<string, string>, injectTo: string }>
}

describe('devToolsInjection', () => {
  it('injects the hub-ui embedded bootstrap as one external module script', () => {
    expect(injectedTags()).toEqual([
      {
        tag: 'script',
        attrs: {
          'type': 'module',
          'src': `${DEVTOOLS_MOUNT_PATH}embedded.js`,
          'data-visibility': 'normal',
        },
        injectTo: 'body',
      },
    ])
  })

  it('forwards the visibility hint to the embedded bootstrap', () => {
    const tags = injectedTags(DevToolsInjection({ visibility: 'passive' }))
    expect(tags[0]?.attrs['data-visibility']).toBe('passive')
  })
})
