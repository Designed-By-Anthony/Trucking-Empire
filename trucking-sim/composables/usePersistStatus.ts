import { ref } from 'vue'

export const persistSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')

let _immediateSaveFn: (() => Promise<void>) | null = null

export function registerImmediateSave(fn: () => Promise<void>) {
  _immediateSaveFn = fn
}

export async function forceSaveNow(): Promise<void> {
  if (!_immediateSaveFn) return
  persistSaveStatus.value = 'saving'
  try {
    await _immediateSaveFn()
    persistSaveStatus.value = 'saved'
  } catch {
    persistSaveStatus.value = 'idle'
  }
}
