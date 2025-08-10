import { describe, expect, it } from 'vitest'
import { isNumeric } from '../is'

describe('isNumeric', () => {
  it('is numeric', () => {
    expect(isNumeric(1)).toBeTruthy()
  })
  it('not a numeric', () => {
    expect(isNumeric('Vite')).toBeFalsy()
  })
})
