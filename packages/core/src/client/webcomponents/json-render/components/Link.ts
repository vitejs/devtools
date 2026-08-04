import { defineComponent, h } from 'vue'
import DockIcon from '../../components/dock/DockIcon.vue'
import { primary } from './tokens'
import { registryProps } from './types'

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

export interface LinkProps {
  href?: string
  label?: string
  /** Iconify name, rendered before the label. */
  icon?: string
  /** Open in a new tab. Defaults to `true` for `http(s)` URLs. */
  external?: boolean
}

/**
 * Specs can come from a streamed/model-generated source (`@json-render/core`'s
 * `compileSpecStream`), and the client can run embedded in a host page — so a
 * `javascript:` href here would execute in that page. Only resolve to an
 * anchor for schemes that can't run script.
 */
function resolveHref(href: string | undefined): string | undefined {
  if (!href)
    return undefined
  try {
    const url = new URL(href, location.href)
    return ALLOWED_SCHEMES.has(url.protocol) ? href : undefined
  }
  catch {
    return undefined
  }
}

export const Link = defineComponent({
  name: 'JrLink',
  props: registryProps<'Link', LinkProps>(),
  setup(ctx) {
    return () => {
      const { label, icon, external } = ctx.element.props
      const href = resolveHref(ctx.element.props.href)
      const content = [
        icon ? h(DockIcon, { icon, class: 'w-3.5 h-3.5' }) : null,
        h('span', label ?? href),
      ]

      if (!href) {
        return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, content)
      }

      const openInNewTab = external ?? href.startsWith('http')

      return h('a', {
        href,
        target: openInNewTab ? '_blank' : undefined,
        rel: openInNewTab ? 'noopener noreferrer' : undefined,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: primary,
          textDecoration: 'none',
        },
        onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' },
        onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' },
      }, content)
    }
  },
})
