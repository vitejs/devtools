import { describe, expect, it } from 'vitest'
import { getModuleNameFromPath, getPackageDirPath, getPnpmPackageInfoFromPath, isNodeModulePath } from '../filepath'

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
    expect(getModuleNameFromPath('node_modules/vite/index.js')).toBe('vite')
    expect(getModuleNameFromPath('C:\\foo\\node_modules\\@vitejs\\devtools')).toBe('@vitejs/devtools')
  })
})

describe('getPnpmPackageInfoFromPath', () => {
  it('should parse package locator segments with peer suffixes', () => {
    expect(getPnpmPackageInfoFromPath('/foo/node_modules/.pnpm/modern-monaco@0.4.0_typescript@5.8.3/node_modules/modern-monaco/index.js')).toEqual({
      name: 'modern-monaco',
      version: '0.4.0',
    })
    expect(getPnpmPackageInfoFromPath('/foo/node_modules/.pnpm/@vueuse+core@14.2.1_vue@3.5.13/node_modules/@vueuse/core/index.mjs')).toEqual({
      name: '@vueuse/core',
      version: '14.2.1',
    })
  })

  it('should not depend on the virtual store directory name', () => {
    expect(getPnpmPackageInfoFromPath('/foo/node_modules/.store/modern-monaco@0.4.0_typescript@5.8.3/index.js')).toEqual({
      name: 'modern-monaco',
      version: '0.4.0',
    })
  })

  it('should not parse package subpaths as package locators', () => {
    expect(getPnpmPackageInfoFromPath('/foo/node_modules/vite/foo@1.0.0/index.js')).toBeUndefined()
  })
})

describe('getPackageDirPath', () => {
  it('should return package names as-is', () => {
    expect(getPackageDirPath('vite')).toBe('vite')
    expect(getPackageDirPath('@vitejs/devtools')).toBe('@vitejs/devtools')
    expect(getPackageDirPath('node_modules/vite/index.js')).toBe('node_modules/vite')
  })

  it('should return package roots for virtual store paths', () => {
    expect(getPackageDirPath('/foo/node_modules/.pnpm/modern-monaco@0.4.0_typescript@5.8.3/node_modules/modern-monaco/index.js')).toBe('/foo/node_modules/.pnpm/modern-monaco@0.4.0_typescript@5.8.3/node_modules/modern-monaco')
    expect(getPackageDirPath('/foo/node_modules/.pnpm/@vueuse+core@14.2.1_vue@3.5.13/index.mjs')).toBe('/foo/node_modules/.pnpm/@vueuse+core@14.2.1_vue@3.5.13')
  })

  it('should not depend on the virtual store directory name', () => {
    expect(getPackageDirPath('/foo/node_modules/.store/@vueuse+core@14.2.1_vue@3.5.13/index.mjs')).toBe('/foo/node_modules/.store/@vueuse+core@14.2.1_vue@3.5.13')
  })

  it('should prefer normal package roots over package-like subpaths', () => {
    expect(getPackageDirPath('/foo/node_modules/vite/foo@1.0.0/index.js')).toBe('/foo/node_modules/vite')
  })
})
