import ansis from 'ansis'

/**
 * A colorizer — callable as a function (`colors.red('foo')`) or as a
 * tagged template (``colors.red`foo ${bar}` ``).
 */
export interface ColorFn {
  (text: unknown): string
  (template: TemplateStringsArray, ...values: unknown[]): string
}

/**
 * Minimal terminal color palette. Each entry is callable as both a
 * plain function and a tagged template.
 */
export interface Colors {
  blue: ColorFn
  cyan: ColorFn
  gray: ColorFn
  green: ColorFn
  red: ColorFn
  yellow: ColorFn
  bold: ColorFn
  dim: ColorFn
  reset: ColorFn
  underline: ColorFn
}

export const colors: Colors = {
  blue: ansis.blue,
  cyan: ansis.cyan,
  gray: ansis.gray,
  green: ansis.green,
  red: ansis.red,
  yellow: ansis.yellow,
  bold: ansis.bold,
  dim: ansis.dim,
  reset: ansis.reset,
  underline: ansis.underline,
}
