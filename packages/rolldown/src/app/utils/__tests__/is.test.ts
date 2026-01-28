import { describe, expect, it } from 'vitest'
import { isNumeric } from '../is'

describe('isNumeric', () => {
  it('should return true for numbers', () => {
    expect(isNumeric(1)).toBeTruthy()
    expect(isNumeric(0)).toBeTruthy()
    expect(isNumeric(-1)).toBeTruthy()
  })

  it('should return false for non-numeric strings', () => {
    expect(isNumeric('Vite')).toBeFalsy()
    expect(isNumeric('123abc')).toBeFalsy()
  })

  it('should return true for numeric strings', () => {
    expect(isNumeric('123')).toBeTruthy()
  })

  it('should return false for NaN/Infinity', () => {
    expect(isNumeric(Number.NaN)).toBeTruthy()
    expect(isNumeric(Infinity)).toBeTruthy()
  })
})
