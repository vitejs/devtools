import { describe, expect, it } from 'vitest'
import { isBrowserExtensionOrigin, registerBrowserExtensionOrigin } from './browser-extension-origin'

describe('browser extension origins', () => {
  it.each([
    'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
    'moz-extension://7f9ba3c8-4d5f-4ee4-b25d-7adb7d8cb501',
  ])('accepts %s', (origin) => {
    expect(isBrowserExtensionOrigin(origin)).toBe(true)
  })

  it.each([
    undefined,
    'http://localhost:5173',
    'https://example.com',
    'chrome-extension://extension-id/panel.html',
    'chrome-extension://',
  ])('rejects %s', (origin) => {
    expect(isBrowserExtensionOrigin(origin)).toBe(false)
  })

  it('registers the exact extension origin once', () => {
    const origins = ['https://example.com']
    const extensionOrigin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

    expect(registerBrowserExtensionOrigin(origins, extensionOrigin)).toBe(true)
    expect(registerBrowserExtensionOrigin(origins, extensionOrigin)).toBe(true)
    expect(origins).toEqual([
      'https://example.com',
      extensionOrigin,
    ])
  })
})
