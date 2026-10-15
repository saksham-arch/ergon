import assert from 'node:assert/strict'
import { Group, Vector3, Box3 } from 'three'
import { JOBS, TRADES, DEMO_ORIGIN } from '../src/hermes/jobs.js'
import { DEFAULT_FILTERS, selectJobs, distanceKm } from '../src/domain/jobs.js'
import { createBalance, disposeObject } from '../src/world/balance.js'
import { createAgoraLandmarks, LANDMARKS } from '../src/agora/landmarks.js'
import { checkJob, offerStore } from '../src/domain/offers.js'
import { PRESETS, weighOffer } from '../src/themis/rules.js'
assert.equal(JOBS.length,160)
assert.equal(new Set(JOBS.map(j=>j.id)).size,160)
for(const job of JOBS){assert.ok(job.lngLat.every(Number.isFinite));assert.ok(job.titleHi&&job.placeHi&&job.hoursHi);assert.ok(job.pay>0)}
for(const trade of TRADES)assert.ok(selectJobs({...DEFAULT_FILTERS,trade:trade.id}).length>=3,`${trade.id} has multiple nearby flowers`)
for(const sector of ['private','government']){const jobs=selectJobs({...DEFAULT_FILTERS,sector});assert.ok(jobs.length>10);assert.ok(jobs.every(j=>j.sector===sector))}
const before=JSON.stringify(JOBS.map(j=>j.lngLat))
assert.equal(selectJobs({...DEFAULT_FILTERS,origin:[0,0]}).length,0,'jobs do not follow a relocated worker')
assert.equal(JSON.stringify(JOBS.map(j=>j.lngLat)),before)
const balance=createBalance()
for(const [preset,sign] of [['fair',1],['scam',-1]]){
 const weights=weighOffer(PRESETS[preset])
 for(let n=0;n<300;n++)balance.update(n/30,1/30,weights.fair,weights.risk)
 assert.equal(Math.sign(balance.beam.rotation.z),sign,`${preset} tilts the shared balance correctly`)
 assert.equal(balance.coins.filter(c=>c.visible).length,Math.min(12,weights.fair)+Math.min(12,weights.risk))
 assert.ok(balance.pans.every(p=>p.position.toArray().every(Number.isFinite)))
}
balance.update(20,0,4,2,true)
assert.equal(balance.coins[0].position.y,.035,'reduced-motion coins settle without animation')
const group=new Group(),landmarks=createAgoraLandmarks(group)
assert.equal(landmarks.items.length,39)
assert.equal(new Set(LANDMARKS.map(x=>x.id)).size,39)
assert.equal(new Set(LANDMARKS.map(x=>x.kind)).size,4)
for(const x of LANDMARKS){assert.ok(distanceKm(DEMO_ORIGIN,x.lngLat)<20);assert.ok(x.address&&x.description&&(x.demo||x.source.startsWith('https://')));assert.ok(x.lngLat.every(Number.isFinite))}
landmarks.update(1,1/30,92,([lng,lat])=>new Vector3(lng,0,lat),{fair:4,risk:2},false)
for(const item of landmarks.items){assert.ok(item.group.children.length>1);assert.ok(!new Box3().setFromObject(item.group).isEmpty())}
const moved=LANDMARKS[0]
landmarks.update(2,1/30,48,([lng,lat])=>new Vector3(lng,0,lat),{fair:4,risk:2},false,{[moved.id]:[72.9,19.2]})
assert.deepEqual(landmarks.items[0].group.position.toArray(),[72.9,0,19.2],'dragged marker moves the sculpture')
assert.ok(LANDMARKS.filter(p=>p.demo).length===32)
for(const kind of ['work','craft','trust','rights'])assert.equal(LANDMARKS.filter(p=>p.demo&&p.kind===kind).length,8)
globalThis.location={hash:'#map'}
globalThis.requestAnimationFrame=()=>{}
checkJob(JOBS[20])
assert.equal(location.hash,'#trust','offer review uses the single original tool in the vase')
assert.equal(offerStore.getSnapshot().data.source,JOBS[20].id)
disposeObject(balance.root);disposeObject(group)
console.log('Agora checks passed: 160 stable job locations, all trades, filters, 39 real and demo landmarks, shared balance and reduced motion.')
