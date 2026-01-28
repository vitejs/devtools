import { describe, expect, it } from 'vitest'
import { DefaultFileTypeRule, DefaultPluginType, getFileTypeFromModuleId, getFileTypeFromName, getPluginTypeFromName } from '../icon'

describe('getFileTypeFromName', () => {
  it('should return correct rule by name', () => {
    expect(getFileTypeFromName('vue').name).toBe('vue')
    expect(getFileTypeFromName('ts').name).toBe('ts')
  })

  it('should return default rule for unknown names', () => {
    expect(getFileTypeFromName('unknown')).toBe(DefaultFileTypeRule)
  })
})

describe('getFileTypeFromModuleId', () => {
  it('should match node_modules', () => {
    expect(getFileTypeFromModuleId('/node_modules/vue/dist/vue.js').name).toBe('node_modules')
    expect(getFileTypeFromModuleId('C:\\node_modules\\react\\index.js').name).toBe('node_modules')
  })

  it('should match virtual modules', () => {
    expect(getFileTypeFromModuleId('virtual:my-module').name).toBe('virtual')
    expect(getFileTypeFromModuleId('\0rollup-plugin').name).toBe('virtual')
  })

  it('should match file extensions', () => {
    expect(getFileTypeFromModuleId('/src/App.vue').name).toBe('vue')
    expect(getFileTypeFromModuleId('/src/index.ts').name).toBe('ts')
    expect(getFileTypeFromModuleId('/src/index.tsx').name).toBe('jsx')
    expect(getFileTypeFromModuleId('/src/index.js').name).toBe('js')
    expect(getFileTypeFromModuleId('/src/style.css').name).toBe('css')
  })

  it('should handle query parameters', () => {
    expect(getFileTypeFromModuleId('/src/App.vue?v=123').name).toBe('vue')
    expect(getFileTypeFromModuleId('/src/App.vue?').name).toBe('vue')
  })

  it('should match packages', () => {
    expect(getFileTypeFromModuleId('vite').name).toBe('package')
    expect(getFileTypeFromModuleId('@vitejs/devtools').name).toBe('package')
  })

  it('should return default for unknown files', () => {
    expect(getFileTypeFromModuleId('/unknown.xyz')).toBe(DefaultFileTypeRule)
  })
})

describe('getPluginTypeFromName', () => {
  it('should match plugin types', () => {
    expect(getPluginTypeFromName('replace').name).toBe('rollup')
    expect(getPluginTypeFromName('vite:css').name).toBe('vite')
    expect(getPluginTypeFromName('unocss:core').name).toBe('unocss')
    expect(getPluginTypeFromName('nuxt:pages').name).toBe('nuxt')
    expect(getPluginTypeFromName('builtin:fs').name).toBe('builtin')
  })

  it('should return default for unknown plugins', () => {
    expect(getPluginTypeFromName('custom-plugin')).toBe(DefaultPluginType)
  })
})
