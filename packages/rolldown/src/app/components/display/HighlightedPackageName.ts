import { getPluginColor } from '@vitejs/devtools-ui/utils/color'
import { defineComponent, h } from 'vue'
import { isPackageName } from '~~/shared/utils/filepath'

// @unocss-include
export default defineComponent({
  name: 'HighlightedPackageName',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const packageName = props.name

      if (!isPackageName(packageName)) {
        return h('span', { class: 'text-gray-500' }, packageName)
      }

      const color = getPluginColor(packageName)

      if (packageName.startsWith('@')) {
        const [scope, name] = packageName.split('/')
        return [
          h('span', { style: `color: ${color}` }, scope),
          h('span', { style: `color: ${color}`, class: 'op50' }, '/'),
          h('span', { style: `color: ${color}` }, name),
        ]
      }

      return h('span', { style: `color: ${color}` }, packageName)
    }
  },
})
