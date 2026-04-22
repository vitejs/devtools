// Smallest possible devtool.
import { defineDevtool, defineRpcFunction } from 'takubox'

let counter = 0

export default defineDevtool({
  id: 'counter',
  name: 'Counter',
  icon: 'ph:counter-duotone',
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'counter:get',
      type: 'static',
      handler: () => ({ count: counter }),
    }))
    ctx.rpc.register(defineRpcFunction({
      name: 'counter:bump',
      type: 'action',
      handler: () => ({ count: ++counter }),
    }))
    ctx.docks.register({
      id: 'counter',
      title: 'Counter',
      icon: 'ph:counter-duotone',
      type: 'iframe',
      url: '/counter/',
    })
  },
})
