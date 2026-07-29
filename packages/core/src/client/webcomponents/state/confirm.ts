import { createTemplatePromise } from '@vueuse/core'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

export const ConfirmPromise = createTemplatePromise<boolean, [ConfirmOptions]>({
  singleton: true,
})

export function useConfirm() {
  return ConfirmPromise.start
}
