export interface ViteDevtoolsViewHost {
  register: (view: ViteDevtoolsViewTab) => void
}

export interface ViteDevtoolsViewTab {
  name: string
  icon: string
  viewId: string
  view: ViteDevtoolsView
}

export interface ViteDevtoolsViewIframe {
  type: 'iframe'
  url: string
  /**
   * The id of the iframe, if multiple tabs is assigned with the same id, the iframe will be shared.
   *
   * When not provided, it would be treated as a unique frame.
   */
  frameId?: string
}

export interface ViteDevtoolsViewWebComponent {
  type: 'web-component'
  from: string
  import: string
}

export type ViteDevtoolsView = ViteDevtoolsViewIframe | ViteDevtoolsViewWebComponent
