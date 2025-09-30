export class IframeManager {
  readonly iframes: Record<string, IframeHolder> = {}
  container: Element

  constructor() {
  }

  setContainer(container: Element) {
    this.container = container
  }

  getIframeHolder(id: string) {
    let iframe: IframeHolder
    if (!this.iframes[id]) {
      const el = document.createElement('iframe')
      this.iframes[id] = new IframeHolder(el)
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

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe
  }

  cleanup() {
    this._cleanups.forEach(cleanup => cleanup())
    this._cleanups = []
  }

  mount(parent: Element) {
    this.cleanup()
    this.parent = parent

    const func = () => this.update()
    window.addEventListener('resize', func)
    this._cleanups.push(() => window.removeEventListener('resize', func))
    this.update()
    this.show()
  }

  hide() {
    this.iframe.style.display = 'none'
  }

  show() {
    this.iframe.style.display = 'block'
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
  }
}
