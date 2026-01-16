import type { ShallowRef } from 'vue'

export interface TagNameToElementMap {
  iframe: HTMLIFrameElement
  div: HTMLDivElement
}

export class PersistedDomViewsManager {
  readonly holders: Record<string, PersistedDomHolder<HTMLElement>> = {}

  constructor(
    public container: Readonly<ShallowRef<HTMLElement | undefined | null>>,
  ) {
  }

  getHolder<T extends keyof TagNameToElementMap>(id: string, _type: T): PersistedDomHolder<TagNameToElementMap[T]> | undefined {
    return this.holders[id] as PersistedDomHolder<TagNameToElementMap[T]>
  }

  getOrCreateHolder<T extends keyof TagNameToElementMap>(id: string, type: T): PersistedDomHolder<TagNameToElementMap[T]> {
    if (!this.container.value) {
      throw new Error('[VITE DEVTOOLS] PersistedDomViewsManager: container is not set')
    }
    let holder: PersistedDomHolder<HTMLElement>
    if (!this.holders[id]) {
      const el = document.createElement(type) as TagNameToElementMap[T]
      this.holders[id] = new PersistedDomHolder(id, el)
      this.container.value.appendChild(el)
      holder = this.holders[id]
    }
    else {
      holder = this.holders[id]
    }
    return holder as PersistedDomHolder<TagNameToElementMap[T]>
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

export class PersistedDomHolder<ElementType extends HTMLElement> {
  readonly element: ElementType
  readonly id: string
  anchor?: Element

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
    if (this.anchor === parent) {
      this.show()
      return
    }

    this.cleanup()
    this.anchor = parent

    const update = () => this.update()
    window.addEventListener('resize', update)
    this._cleanups.push(() => window.removeEventListener('resize', update))
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
    if (!this.anchor)
      return
    const rect = this.anchor.getBoundingClientRect()
    this.element.style.position = 'absolute'
    this.element.style.width = `${rect.width}px`
    this.element.style.height = `${rect.height}px`
  }

  unmount() {
    this.cleanup()
    this.hide()
    this.anchor = undefined
  }
}
