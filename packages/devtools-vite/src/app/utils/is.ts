export function isNumeric(str: string | number) {
  return `${+str}` === `${str}`
}
