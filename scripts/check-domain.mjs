import assert from 'node:assert/strict'
import {payBand,weighOffer,PRESETS,numeric,matchSchemes} from '../src/themis/rules.js'
import {JOBS,DEMO_DATE,DEMO_ORIGIN} from '../src/hermes/jobs.js'
import {matchesDate,selectJobs,distanceKm,DEFAULT_FILTERS,makeHold,activeHold,setInterest} from '../src/domain/jobs.js'
import {offerFromJob} from '../src/domain/offers.js'
import {figureAtUV,isTap} from '../src/vase/picking.js'
import {createLocalStore} from '../src/domain/storage.js'
let checks=0
const eq=(a,b)=>{assert.deepEqual(a,b);checks++}
for(const [v,band] of [[749.99,'wellBelow'],[750,'below'],[899.99,'below'],[900,'near'],[1100,'near'],[1100.01,'above'],[2000,'above'],[2000.01,'wellAbove']])eq(payBand(v,1000),band)
for(const value of ['',-1,Infinity,NaN,'junk',10000001])eq(weighOffer({...PRESETS.fair,pay:value}).valid,false)
eq(weighOffer({...PRESETS.fair,fee:100}).verdict.tone,'bad')
eq(weighOffer({...PRESETS.fair,unit:'month'}).tokens.find(t=>t.id==='pay').label.includes('unavailable'),true)
eq(weighOffer({...PRESETS.fair,hours:null,fee:null,written:'unknown'}).verdict.tone,'mid')
eq(numeric('',0,100),null)
for(const j of JOBS){const o=offerFromJob(j);eq(o.pay,String(j.pay));eq(o.unit,j.unit);eq(o.fee,j.fee===null?null:String(j.fee));assert.ok(j.lngLat.every(Number.isFinite));checks++}
const today=selectJobs({...DEFAULT_FILTERS,when:'day',km:7});eq(today.length>0,true);eq(today.every(j=>j.startDate===DEMO_DATE),true)
eq(matchesDate({startDate:'2026-10-18',durationDays:1},'week'),true)
eq(matchesDate({startDate:'2026-10-19',durationDays:1},'week'),false)
eq(matchesDate({startDate:'2026-10-14',durationDays:30},'all'),false)
eq(matchesDate({startDate:'2026-10-16',durationDays:14},'long'),true)
eq(matchesDate({startDate:'2026-10-16',durationDays:13},'long'),false)
eq(distanceKm(DEMO_ORIGIN,DEMO_ORIGIN),0)
eq(selectJobs({...DEFAULT_FILTERS,origin:[0,0]}).length,0)
const hold=makeHold('j1',1000);eq(activeHold(hold,1800999),hold);eq(activeHold(hold,1801000),null)
const interest=setInterest({interest:{}},'j1',true,1000);eq(setInterest(interest,'j1',true,2000).interest.j1,1000);eq(setInterest(interest,'j1',false).interest,{})
eq(matchSchemes({age:34,work:'construction',income:'low',coverage:'yes'}).yes.some(s=>s.id==='pmsym'),false)
eq(matchSchemes({age:71,work:'other',income:'high',coverage:'unknown'}).yes.some(s=>s.id==='pmjay'),true)
eq(figureAtUV({x:.2,y:.5},[[0,.5],[.5,1]],[.4,.7]),0)
eq(figureAtUV({x:.7,y:.5},[[0,.5],[.5,1]],[.4,.7]),1)
eq(figureAtUV({x:1,y:.5},[[0,.5],[.5,1]],[.4,.7]),0)
eq(figureAtUV({x:.7,y:.2},[[0,.5],[.5,1]],[.4,.7]),-1)
eq(isTap(0,8),false);eq(isTap(2,3),true)
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
const saved=createLocalStore('test-saved',{n:0},x=>Number.isInteger(x.n));eq(saved.set({n:2}),true);eq(JSON.parse(data.get('ergon.v1.test-saved')).data,{n:2});eq(saved.set({n:'invalid'}),false)
data.set('ergon.v1.test-old',JSON.stringify({version:0,data:{n:3}}));eq(createLocalStore('test-old',{n:0}).getSnapshot().status,'recovered')
data.set('ergon.v1.test-bad','{');eq(createLocalStore('test-bad',{n:0}).getSnapshot().data,{n:0})
localStorage.setItem=()=>{throw new Error('quota')};eq(saved.set({n:4}),false);eq(saved.getSnapshot().data,{n:4});eq(saved.getSnapshot().status,'unavailable')
saved.clear();eq(saved.getSnapshot().data,{n:0})
console.log(`Domain checks passed: ${checks} assertions across dates, pay bands, unknowns, units, persistence, holds, job links and vase picking.`)
