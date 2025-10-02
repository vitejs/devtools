export class IframeManager {
  readonly iframes: Record<string, IframeHolder> = {}
  container: Element = undefined!

  constructor() {
  }

  setContainer(container: Element) {
    this.container = container
  }

  getIframeHolder(id: string) {
    let iframe: IframeHolder
    if (!this.iframes[id]) {
      const el = document.createElement('iframe')
      this.iframes[id] = new IframeHolder(id, el)
      this.container.appendChild(el)
      iframe = this.iframes[id]
    }
    else {
      iframe = this.iframes[id]
    }
    return iframe
  }
}

export class IframeHolder {
  readonly iframe: HTMLIFrameElement
  readonly id: string
  parent?: Element

  _cleanups: (() => void)[] = []

  constructor(id: string, iframe: HTMLIFrameElement) {
    this.id = id
    this.iframe = iframe
  }

  cleanup() {
    this._cleanups.forEach(cleanup => cleanup())
    this._cleanups = []
  }

  mount(parent: Element) {
    if (this.parent === parent) {
      this.show()
      return
    }

    this.cleanup()
    this.parent = parent

    const func = () => this.update()
    window.addEventListener('resize', func)
    this._cleanups.push(() => window.removeEventListener('resize', func))
    this.show()
  }

  hide() {
    this.iframe.style.display = 'none'
  }

  show() {
    this.iframe.style.display = 'block'
    this.update()
  }

  update() {
    if (!this.parent)
      return
    const rect = this.parent.getBoundingClientRect()
    this.iframe.style.position = 'absolute'
    this.iframe.style.width = `${rect.width}px`
    this.iframe.style.height = `${rect.height}px`
  }

  unmount() {
    this.cleanup()
    this.hide()
    this.parent = undefined
  }
}
