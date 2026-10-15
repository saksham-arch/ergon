import { jobStore } from '../domain/jobs.js'
export const agora = {
  trade:'all', setTrade:null,
  show(trade='all') {
    jobStore.set(s=>({...s,trade,selected:null}))
    agora.trade=trade
    agora.setTrade?.(trade)
    location.hash = '#map'
  },
}
