export interface DevtoolsViewHost {
  register: (view: DevtoolsViewTab) => void
}

export interface DevtoolsViewTab {
  name: string
  icon: string
  viewId: string
  view: DevtoolsViewMeta
}

export interface DevtoolsViewIframe {
  type: 'iframe'
  url: string
  /**
   * The id of the iframe, if multiple tabs is assigned with the same id, the iframe will be shared.
   *
   * When not provided, it would be treated as a unique frame.
   */
  frameId?: string
}

export interface DevtoolsViewWebComponent {
  type: 'webcomponent'
  from: string
  import: string
}

export type DevtoolsViewMeta = DevtoolsViewIframe | DevtoolsViewWebComponent
