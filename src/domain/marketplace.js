import { createLocalStore, isObject } from './storage.js'
import { JOBS, TRADES, KM, DEMO_ORIGIN } from '../hermes/jobs.js'
export const marketplace=createLocalStore('marketplace',{profiles:{worker:{name:'',phone:''},employer:{name:'',phone:''}},listings:[],bookings:[]},s=>isObject(s)&&isObject(s.profiles)&&['worker','employer'].every(r=>isObject(s.profiles[r])&&typeof s.profiles[r].name==='string'&&typeof s.profiles[r].phone==='string')&&Array.isArray(s.listings)&&s.listings.every(j=>typeof j.id==='string'&&TRADES.some(t=>t.id===j.trade)&&Number.isFinite(j.pay)&&j.pay>0&&Array.isArray(j.lngLat)&&j.lngLat.length===2&&j.lngLat.every(Number.isFinite))&&Array.isArray(s.bookings)&&s.bookings.every(b=>typeof b.id==='string'&&typeof b.jobId==='string'&&['requested','accepted','completed','cancelled'].includes(b.status)))
export const allJobs=()=>[...JOBS,...marketplace.getSnapshot().data.listings]
export const validPhone=p=>/^[+\d][\d\s()-]{6,19}$/.test(p.trim())
export function saveProfile(role,profile){if(!['worker','employer'].includes(role)||!profile.name.trim()||!validPhone(profile.phone))throw Error('Enter your name and a valid phone number.');marketplace.set(s=>({...s,profiles:{...s.profiles,[role]:{name:profile.name.trim(),phone:profile.phone.trim()}}}))}
export function publishJob(d){
 if(d.fairWorkAccepted!==true)throw Error('Please accept the fair-work commitment before posting.')
 const lngLat=d.lngLat.map(Number)
 if(!d.title.trim()||!d.address.trim()||!TRADES.some(t=>t.id===d.trade)||!Number.isFinite(Number(d.pay))||Number(d.pay)<=0||!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)||Number.isNaN(Date.parse(d.startDate))||!['daily','weekly','completion'].includes(d.payday)||!d.hours.trim()||!Number.isInteger(Number(d.durationDays))||Number(d.durationDays)<1||!lngLat.every(Number.isFinite)||Math.abs(lngLat[0])>180||Math.abs(lngLat[1])>90)throw Error('Complete the work details and choose a valid location.')
 const profile=marketplace.getSnapshot().data.profiles.employer
 if(!profile.name||!validPhone(profile.phone))throw Error('Complete your employer profile first.')
 const id=`posted-${crypto.randomUUID()}`,x=(lngLat[0]-DEMO_ORIGIN[0])*111.32*Math.cos(DEMO_ORIGIN[1]*Math.PI/180)/KM,z=-(lngLat[1]-DEMO_ORIGIN[1])*110.57/KM
 const job={id,title:d.title.trim(),titleHi:d.title.trim(),trade:d.trade,sector:'private',pay:Number(d.pay),unit:'day',startDate:d.startDate,durationDays:Number(d.durationDays),hours:d.hours,hoursHi:d.hours,hoursCount:null,place:d.address.trim(),placeHi:d.address.trim(),bring:d.bring||'Agree with employer',bringHi:d.bring||'Agree with employer',payday:d.payday,fee:0,written:true,address:true,verification:'unverified',employer:profile.name,contact:profile.phone,owner:'employer',fairWorkCommitment:{version:1,acceptedAt:Date.now()},lngLat,x,z}
 marketplace.set(s=>({...s,listings:[...s.listings,job]}));return job
}
export function requestBooking(jobId){
 const s=marketplace.getSnapshot().data,job=allJobs().find(j=>j.id===jobId)
 if(!job)throw Error('This job is no longer available.')
 if(!s.profiles.worker.name||!validPhone(s.profiles.worker.phone))throw Error('Complete your worker profile first.')
 const existing=s.bookings.find(b=>b.jobId===jobId&&b.status!=='cancelled');if(existing)return existing
 const booking={id:`request-${crypto.randomUUID()}`,jobId,status:'requested',worker:{...s.profiles.worker},terms:{pay:job.pay,unit:job.unit,date:job.startDate,hours:job.hours,place:job.place},createdAt:Date.now()}
 marketplace.set(v=>({...v,bookings:[...v.bookings,booking]}));return booking
}
export function transitionBooking(id,next,role){
 const s=marketplace.getSnapshot().data,b=s.bookings.find(v=>v.id===id),job=b&&allJobs().find(j=>j.id===b.jobId)
 if(!b)throw Error('Request not found.')
 const allowed=role==='employer'&&job?.owner==='employer'&&((b.status==='requested'&&['accepted','cancelled'].includes(next))||(b.status==='accepted'&&next==='completed'))||role==='worker'&&['requested','accepted'].includes(b.status)&&next==='cancelled'
 if(!allowed)throw Error('This status change is not available.')
 marketplace.set(v=>({...v,bookings:v.bookings.map(x=>x.id===id?{...x,status:next}:x)}))
}
