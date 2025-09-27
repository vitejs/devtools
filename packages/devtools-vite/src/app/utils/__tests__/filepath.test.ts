import { describe, expect, it } from 'vitest'
import { isBuiltInModule, parseReadablePath } from '../filepath'

describe('isBuiltInModule', () => {
  it('should return undefined with undefined name', () => {
    expect(isBuiltInModule(undefined)).toBeUndefined()
  })

  it('should return true with a built-in module name', () => {
    expect(isBuiltInModule('nuxt')).toBeTruthy()
  })

  it('should return false with a not built-in module name', () => {
    expect(isBuiltInModule('foo')).toBeFalsy()
  })
})

describe('parseReadablePath', () => {
  it('should return path with package names', () => {
    expect(parseReadablePath('vite', '/')).toEqual({ moduleName: 'vite', path: 'vite' })
    expect(parseReadablePath('@vitejs/devtools', '/')).toEqual({ moduleName: '@vitejs/devtools', path: '@vitejs/devtools' })
    expect(parseReadablePath('@vitejs\\devtools', '/')).toEqual({ moduleName: '@vitejs/devtools', path: '@vitejs/devtools' })
    expect(parseReadablePath('@vitejs%2Fdevtools', '/')).toEqual({ moduleName: '@vitejs/devtools', path: '@vitejs/devtools' })
  })

  it('should return path with : unless Windows path', () => {
    expect(parseReadablePath('nuxt:index.mjs', '/')).toEqual({ moduleName: 'nuxt:index.mjs', path: 'nuxt:index.mjs' })
  })

  it('should return moduleName and subpath', () => {
    expect(parseReadablePath('/foo/node_modules/vite/dist/index.mjs', '/')).toEqual({ moduleName: 'vite', path: 'vite/dist/index.mjs' })
    expect(parseReadablePath('C:\\foo\\node_modules\\vite\\dist\\index.mjs', 'C:\\')).toEqual({ moduleName: 'vite', path: 'vite/dist/index.mjs' })
  })

  it('should add ./ for no ./ items', () => {
    expect(parseReadablePath('/foo/index.mjs', '/foo')).toEqual({ path: './index.mjs' })
    expect(parseReadablePath('C:\\foo\\index.mjs', 'C:\\foo')).toEqual({ path: './index.mjs' })
  })

  it('should add replace ./.nuxt to #build for .nuxt items', () => {
    expect(parseReadablePath('/foo/.nuxt/index.mjs', '/foo')).toEqual({ path: '#build/index.mjs' })
    expect(parseReadablePath('C:\\foo\\.nuxt\\index.mjs', 'C:\\foo')).toEqual({ path: '#build/index.mjs' })
  })
})
