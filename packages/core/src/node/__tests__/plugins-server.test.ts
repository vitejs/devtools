import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { renderDockImportsMap } from '../plugins/server'

describe('renderDockImportsMap', () => {
  it('uses default importName when omitted', () => {
    const docks: DevToolsDockEntry[] = [
      {
        type: 'action',
        id: 'action-entry',
        title: 'Action Entry',
        icon: 'ph:rocket-duotone',
        action: {
          importFrom: 'my-plugin/action',
        },
      },
      {
        type: 'iframe',
        id: 'iframe-with-script',
        title: 'Iframe With Script',
        icon: 'ph:browser-duotone',
        url: '/.my-plugin/',
        clientScript: {
          importFrom: 'my-plugin/iframe-script',
        },
      },
      {
        type: 'custom-render',
        id: 'custom-render',
        title: 'Custom Render',
        icon: 'ph:code-duotone',
        renderer: {
          importFrom: 'my-plugin/renderer',
          importName: 'renderPanel',
        },
      },
      {
        type: 'iframe',
        id: 'plain-iframe',
        title: 'Plain Iframe',
        icon: 'ph:app-window-duotone',
        url: '/.plain/',
      },
    ]

    const code = renderDockImportsMap(docks)

    expect(code).toContain('["action:action-entry"]')
    expect(code).toContain('["iframe:iframe-with-script"]')
    expect(code).toContain('["custom-render:custom-render"]')
    expect(code).not.toContain('["iframe:plain-iframe"]')

    const defaultImportCount = code.split('r["default"]').length - 1
    expect(defaultImportCount).toBe(2)
    expect(code).toContain('r["renderPanel"]')
  })
})
