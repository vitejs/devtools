import { describe, expect, it } from 'vitest'
import { getModuleNameFromPath, isBuiltInModule, isNodeModulePath, parseReadablePath } from '../filepath'

describe('isNodeModulePath', () => {
  it('should return true if includes node_modules path', () => {
    expect(isNodeModulePath('/foo/node_modules/bar')).toBeTruthy()
    expect(isNodeModulePath('C:\\foo\\node_modules\\bar')).toBeTruthy()
  })

  it('should return true if package names', () => {
    expect(isNodeModulePath('vite')).toBeTruthy()
    expect(isNodeModulePath('@vitejs/devtools')).toBeTruthy()
    expect(isNodeModulePath('#import')).toBeTruthy()
  })

  it('should return false if not node_modules', () => {
    expect(isNodeModulePath('/foo/bar')).toBeFalsy()
  })
})

describe('getModuleNameFromPath', () => {
  it('should return package name', () => {
    expect(getModuleNameFromPath('vite')).toBe('vite')
    expect(getModuleNameFromPath('@vite/devtools')).toBe('@vite/devtools')
  })

  it('should return undefined with a non-module name', () => {
    expect(getModuleNameFromPath('/foo/bar')).toBeUndefined()
    expect(getModuleNameFromPath('C:\\foo\\bar')).toBeUndefined()
  })

  it('should return scope package name', () => {
    expect(getModuleNameFromPath('/foo/bar/node_modules/@vitejs/devtools')).toBe('@vitejs/devtools')
    expect(getModuleNameFromPath('C:\\foo\\node_modules\\@vitejs\\devtools')).toBe('@vitejs/devtools')
  })

  it('should return normal package name', () => {
    expect(getModuleNameFromPath('/foo/bar/node_modules/vite')).toBe('vite')
    expect(getModuleNameFromPath('C:\\foo\\node_modules\\@vitejs\\devtools')).toBe('@vitejs/devtools')
  })
})

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
