// Site-wide preferences: painted (oil-paint filter on every WebGL canvas).
import { useSyncExternalStore } from 'react'

const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let state = { painted: true, reduce }
const subs = new Set()

export const prefs = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch }
    subs.forEach((f) => f())
  },
  subscribe(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export const usePrefs = () => useSyncExternalStore(prefs.subscribe, prefs.get, prefs.get)
