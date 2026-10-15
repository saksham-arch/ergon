import { allJobs } from './marketplace.js'
import { DEMO_DATE, DEMO_ORIGIN, JOBS, TRADES } from '../hermes/jobs.js'
import { createLocalStore, isObject } from './storage.js'
export function distanceKm([a,b],[c,d]) {
  const rad = Math.PI / 180
  const h = Math.sin((d-b)*rad/2)**2 + Math.cos(b*rad)*Math.cos(d*rad)*Math.sin((c-a)*rad/2)**2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1,h)))
}
export function matchesDate(job, filter, reference = DEMO_DATE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(job.startDate) || job.startDate < reference) return false
  if (filter === 'day') return job.startDate === reference
  if (filter === 'long') return job.durationDays === null || job.durationDays >= 14
  if (filter === 'week') {
    const day = new Date(`${reference}T00:00:00Z`)
    const nextMonday = new Date(day)
    nextMonday.setUTCDate(day.getUTCDate() + (7 - ((day.getUTCDay() + 6) % 7)))
    return job.startDate < nextMonday.toISOString().slice(0,10)
  }
  return true
}
export const DEFAULT_FILTERS = { sector:'all', trade:'all', when:'all', km:4, origin:DEMO_ORIGIN, selected:null }
export const jobStore = createLocalStore('jobs', { ...DEFAULT_FILTERS, interest:{}, hold:null }, x => isObject(x) && (x.sector===undefined||['all','private','government'].includes(x.sector)) && (x.trade === 'all' || TRADES.some(t=>t.id===x.trade)) && ['all','day','week','long'].includes(x.when) && [2,4,7].includes(x.km) && Array.isArray(x.origin) && x.origin.length===2 && x.origin.every(Number.isFinite) && Math.abs(x.origin[0])<=180 && Math.abs(x.origin[1])<=90 && (x.selected===null || allJobs().some(j=>j.id===x.selected)) && isObject(x.interest) && Object.entries(x.interest).every(([id,n])=>allJobs().some(j=>j.id===id)&&Number.isFinite(n)) && (x.hold===null || isObject(x.hold)&&allJobs().some(j=>j.id===x.hold.id)&&Number.isFinite(x.hold.until)))
export function selectJobs(filters, jobs = allJobs()) {
  return jobs.map(j => ({...j, dist:distanceKm(filters.origin,j.lngLat)}))
    .filter(j => (!filters.sector||filters.sector==='all'||j.sector===filters.sector)&&(filters.trade==='all'||j.trade===filters.trade)&&matchesDate(j,filters.when)&&j.dist<=filters.km).sort((a,b)=>a.dist-b.dist)
}
export function activeHold(hold, now = Date.now()) { return hold && hold.until > now ? hold : null }
export function setInterest(state,id,on,now=Date.now()) {
  const interest={...state.interest}
  if(on) interest[id] ??= now
  else delete interest[id]
  return {...state,interest}
}
export const makeHold = (id, now=Date.now()) => ({id,until:now+30*60*1000})
export const dateLabel = (date, lang) => new Intl.DateTimeFormat(lang==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(`${date}T12:00:00+05:30`))
