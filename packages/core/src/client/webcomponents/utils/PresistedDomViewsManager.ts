import type { ShallowRef } from 'vue'

export interface TagNameToElementMap {
  iframe: HTMLIFrameElement
  div: HTMLDivElement
}

export class PresistedDomViewsManager {
  readonly holders: Record<string, PresistedDomHolder<HTMLElement>> = {}

  constructor(
    public container: Readonly<ShallowRef<HTMLElement | undefined | null>>,
  ) {
  }

  getHolder<T extends keyof TagNameToElementMap>(id: string, _type: T): PresistedDomHolder<TagNameToElementMap[T]> | undefined {
    return this.holders[id] as PresistedDomHolder<TagNameToElementMap[T]>
  }

  getOrCreateHolder<T extends keyof TagNameToElementMap>(id: string, type: T): PresistedDomHolder<TagNameToElementMap[T]> {
    if (!this.container.value) {
      throw new Error('[VITE DEVTOOLS] PresistedDomViewsManager: container is not set')
    }
    let holder: PresistedDomHolder<HTMLElement>
    if (!this.holders[id]) {
      const el = document.createElement(type) as TagNameToElementMap[T]
      this.holders[id] = new PresistedDomHolder(id, el)
      this.container.value.appendChild(el)
      holder = this.holders[id]
    }
    else {
      holder = this.holders[id]
    }
    return holder as PresistedDomHolder<TagNameToElementMap[T]>
  }

  removeHolder(id: string) {
    const holder = this.holders[id]
    if (!holder)
      return false
    holder.unmount()
    holder.element.remove()
    delete this.holders[id]
    return true
  }
}

export class PresistedDomHolder<ElementType extends HTMLElement> {
  readonly element: ElementType
  readonly id: string
  parent?: Element

  _cleanups: (() => void)[] = []

  constructor(id: string, iframe: ElementType) {
    this.id = id
    this.element = iframe
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
    this.element.style.display = 'none'
  }

  show() {
    this.element.style.display = 'block'
    this.update()
  }

  update() {
    if (!this.parent)
      return
    const rect = this.parent.getBoundingClientRect()
    this.element.style.position = 'absolute'
    this.element.style.width = `${rect.width}px`
    this.element.style.height = `${rect.height}px`
  }

  unmount() {
    this.cleanup()
    this.hide()
    this.parent = undefined
  }
}
