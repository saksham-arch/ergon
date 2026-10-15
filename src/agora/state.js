import { jobStore } from '../domain/jobs.js'
export const agora = {
  show(trade='all') {
    jobStore.set(s=>({...s,sector:'all',trade,selected:null}))
    location.hash = '#map'
  },
}
