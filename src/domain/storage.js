// Versioned, bounded browser drafts. Failures preserve the in-memory value.
import { useSyncExternalStore } from 'react'
const stores = new Map()
export function createLocalStore(key, defaults, validate = () => true) {
  if (stores.has(key)) return stores.get(key)
  const storageKey = `ergon.v1.${key}`
  let data = structuredClone(defaults), status = 'new'
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw && raw.length < 100000) {
      const saved = JSON.parse(raw)
      if (saved.version === 1 && validate(saved.data)) { data = saved.data; status = 'saved' }
      else status = 'recovered'
    } else if(raw) status='recovered'
  } catch { status = 'unavailable' }
  let snapshot = { data, status }
  const listeners = new Set()
  const emit = () => { snapshot = { data, status }; listeners.forEach(fn => fn()) }
  const store = {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    set(update) {
      const next = typeof update === 'function' ? update(data) : update
      if (!validate(next)) return false
      data = next
      try {
        const raw = JSON.stringify({ version: 1, data })
        if (raw.length > 100000) throw new Error('Draft exceeds limit')
        localStorage.setItem(storageKey, raw)
        status = 'saved'
      } catch { status = 'unavailable' }
      emit()
      return status === 'saved'
    },
    clear() {
      data = structuredClone(defaults)
      try { localStorage.removeItem(storageKey); status = 'cleared' } catch { status = 'unavailable' }
      emit()
    },
  }
  stores.set(key, store)
  return store
}
export function useStore(store) {
  const { data, status } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return [data, store.set, status]
}
export const isObject = x => !!x && typeof x === 'object' && !Array.isArray(x)
export const isText = (x, max = 200) => typeof x === 'string' && x.length <= max
