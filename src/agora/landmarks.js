import { Group } from 'three'
import { hermes, hephaestus, athena, temple, tree, cypress, gates, sisyphus, boulder, vase, box, materials } from '../world/myth-models.js'
import { createBalance } from '../world/balance.js'
import { destinationOf } from './destinations.js'
import { DEMO_ORIGIN } from '../hermes/jobs.js'

// Fictional tool landmarks, separate from job locations and public services.
const positions = [[72.8577,19.1169],[72.8737,19.1187],[72.8744,19.1050],[72.8567,19.1044]]
export const LANDMARKS = ['work','craft','trust','rights'].flatMap((id,i)=>{
 const d=destinationOf(id),[lng,lat]=positions[i]
 return [0,1,2].map(copy=>({id,key:`${id}-${copy}`,copy,name:d.label,hi:d.labelHi,
 lngLat:copy===0?[lng,lat]:[lng+(copy===1?-.013:.011),lat+(copy===1?.009:-.01)],height:3.5}))
})

export function createAgoraLandmarks(parent) {
 const root=new Group();parent.add(root)
 const messenger=hermes(),smith=hephaestus(),guardian=athena(),balance=createBalance()
 const prototypes=[messenger.root,smith.root,balance.root,guardian.root]
 const items=LANDMARKS.map(landmark=>{
  const i=['work','craft','trust','rights'].indexOf(landmark.id)
  const object=landmark.copy===0?prototypes[i]:prototypes[i].clone(true)
  const group=new Group();group.add(object);root.add(group)
  // Reuse the original stone pedestals, architectural garden and sculptural props.
  box(group,[0,-.16,0],[2,.3,1.8],materials.limestone)
  if(i===0){const gate=gates(group);gate.root.position.set(0,0,-2);gate.root.scale.setScalar(.38)}
  if(i===1){const tablet=box(group,[1.1,1.1,.6],[.8,1.1,.08],materials.bronze);tablet.rotation.y=-.2;vase(group,[-1,.02,.3],1.2)}
  if(i===2){const shrine=temple(group,6,4,3);shrine.position.set(0,0,-2);shrine.scale.setScalar(.55)}
  tree(group,-1.5,-1,.65);cypress(group,1.5,-1,.65)
  return {group,...landmark}
 })
 const worker=sisyphus();worker.root.scale.setScalar(.6);worker.root.position.set(-.4,0,0)
 const start=new Group();root.add(start);start.add(worker.root);boulder(start,[.7,.63,0],.63)
 const center={lngLat:DEMO_ORIGIN,group:start}
 return {root,items,update(time,dt,scale,local,weights,reduced){
  for(const item of items){item.group.position.copy(local(item.lngLat));item.group.scale.setScalar(scale*(item.copy===0?.85:.6))}
  center.group.position.copy(local(center.lngLat));center.group.scale.setScalar(scale*.7)
  messenger.animate(reduced?0:time);smith.animate(reduced?0:time);guardian.animate(reduced?0:time);worker.animate(reduced?0:time)
  balance.update(time,reduced?0:dt,weights?.fair??0,weights?.risk??0,reduced)
 }}
}
