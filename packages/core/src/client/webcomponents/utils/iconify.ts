import createDOMPurify from 'dompurify'

const getIconifySvgMap = new Map<string, Promise<string> | string>()

const purify = createDOMPurify()

export async function getIconifySvg(collection: string, icon: string) {
  const id = `${collection}:${icon}`
  if (getIconifySvgMap.has(id)) {
    return getIconifySvgMap.get(id)!
  }
  const promise = _get()
    .then((svg) => {
      getIconifySvgMap.set(id, svg)
      return svg
    })
  getIconifySvgMap.set(id, promise)
  return promise

  async function _get() {
    const url = `https://api.iconify.design/${collection}/${icon}.svg?color=currentColor&width=full`
    const svg = await fetch(url).then(res => res.text())
    return purify.sanitize(svg)
  }
}
