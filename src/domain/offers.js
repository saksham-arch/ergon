import { createLocalStore, isObject } from './storage.js'
import { PRESETS } from '../themis/rules.js'
import { navigate } from './navigation.js'
export const offerStore=createLocalStore('offer',{offer:PRESETS.doubt,source:null,preset:'doubt'},x=>isObject(x)&&isObject(x.offer)&&['day','shift','job','month'].includes(x.offer.unit)&&['string','number'].includes(typeof x.offer.pay)&&String(x.offer.pay).length<20&&['hours','fee'].every(k=>x.offer[k]===null||['string','number'].includes(typeof x.offer[k])&&String(x.offer[k]).length<20))
export function offerFromJob(j) {
 return {trade:j.trade,pay:String(j.pay),unit:j.unit,hours:j.hoursCount===null?null:String(j.hoursCount),payday:j.payday??'unknown',address:j.address===null?'unknown':j.address?'yes':'no',fee:j.fee===null?null:String(j.fee),written:j.written===null?'unknown':j.written?'yes':'no',verified:j.verification==='sample-history'?'yes':'unknown'}
}
export function checkJob(j) {
 const current=offerStore.getSnapshot().data
 if(current.source!==j.id) offerStore.set({offer:offerFromJob(j),source:j.id,preset:null})
 if (typeof location !== 'undefined' && location.hash === '#map') window.dispatchEvent(new CustomEvent('ergon-exhibit', {detail:'trust'}))
 else navigate('trust')
}
