import { describe, expect, it } from 'vitest'
import { simplifyModuleName } from '../guess-chunk-name'

describe('simplifyModuleName', () => {
  it('should return the simplified module name', () => {
    expect(simplifyModuleName('foo/bar')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/')).toBe('foo_bar')
    expect(simplifyModuleName('/foo/bar')).toBe('foo_bar')
    expect(simplifyModuleName('/foo/bar/')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index/')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.js')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.ts')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.mjs')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.cjs')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.jsx')).toBe('foo_bar')
    expect(simplifyModuleName('foo/bar/index.tsx')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.js')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.ts')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.mjs')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.cjs')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.jsx')).toBe('foo_bar')
    expect(simplifyModuleName('node_modules/foo/bar/index.tsx')).toBe('foo_bar')
  })
})
