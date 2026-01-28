import { describe, expect, it } from 'vitest'
import { getModuleNameFromPath, isNodeModulePath } from '../filepath'

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
