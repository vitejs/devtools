<script setup lang="ts">
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'

const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    const [metaInfo, envInfo] = await Promise.all([
      rpc.value.call(
        'vite:meta-info',
      ),
      rpc.value.call(
        'vite:env-info',
      ),
    ])

    return {
      metaInfo,
      envInfo,
    }
  },
  null,
)

const envInfo = computed(() => state.value?.envInfo)
const metaInfo = computed(() => state.value?.metaInfo)
</script>

<template>
  <VisualLoading
    v-if="isLoading"
    text="Connecting..."
  />
  <div v-else p4 flex="~ col gap-4" items-center justify-center relative>
    <VisualLogoBanner />

    <div border="~ base rounded" p2 flex="~ col gap-4 justify-center">
      <div p4 flex="~ gap-14 items-center">
        <div i-material-icon-theme:vite text-3xl flex ml3 />
        <div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph-folder-duotone" />
            <div>
              Root
            </div>
            <div font-mono>
              {{ metaInfo?.root }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph-folder-duotone" />
            <div>
              Base
            </div>
            <div font-mono>
              {{ metaInfo?.base }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph-plugs-duotone" />
            <div>
              Plugins
            </div>
            <div font-mono>
              {{ metaInfo?.plugins.length ?? 0 }}
            </div>
          </div>
        </div>
      </div>
      <div p4 flex="~ gap-14 items-center">
        <div i-ph:desktop text-3xl flex ml3 />
        <div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph-folder-duotone" />
            <div>
              OS
            </div>
            <div font-mono>
              {{ envInfo?.os }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph:cpu" />
            <div>
              CPU
            </div>
            <div font-mono>
              {{ envInfo?.cpu }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ph:memory" />
            <div>
              Memory
            </div>
            <div font-mono>
              {{ envInfo?.memory }}
            </div>
          </div>
        </div>
      </div>
      <div p4 flex="~ gap-14 items-center">
        <div i-system-uicons:version text-3xl flex ml3 />
        <div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ri:nodejs-fill" />
            <div>
              Node
            </div>
            <div font-mono>
              {{ envInfo?.node }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-ri:npmjs-fill" />
            <div>
              NPM
            </div>
            <div font-mono>
              {{ envInfo?.npm }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-material-icon-theme:pnpm" />
            <div>
              PNPM
            </div>
            <div font-mono>
              {{ envInfo?.pnpm }}
            </div>
          </div>
          <div grid="~ cols-[max-content_80px_2fr] gap-2 items-center">
            <div class="i-logos:yarn" />
            <div>
              Yarn
            </div>
            <div font-mono>
              {{ envInfo?.yarn }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
