import { resolveConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { DevToolsInjection } from '../injection'

describe('devToolsInjection', () => {
  it('defines Vue feature flags for non-Vue hosts', async () => {
    const config = await resolveConfig({
      configFile: false,
      plugins: [DevToolsInjection()],
    }, 'serve')

    expect(config.define).toMatchObject({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    })
  })

  it('preserves Vue feature flags defined by the host', async () => {
    const config = await resolveConfig({
      configFile: false,
      define: {
        __VUE_OPTIONS_API__: 'false',
        __VUE_PROD_DEVTOOLS__: 'true',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
      },
      plugins: [DevToolsInjection()],
    }, 'serve')

    expect(config.define).toMatchObject({
      __VUE_OPTIONS_API__: 'false',
      __VUE_PROD_DEVTOOLS__: 'true',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
    })
  })
})
