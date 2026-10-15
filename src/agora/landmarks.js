import { Group } from 'three'
import { hermes, hephaestus, athena, temple, tree, cypress, gates, sisyphus, boulder, vase, box, materials } from '../world/myth-models.js'
import { createBalance } from '../world/balance.js'
import { DEMO_ORIGIN } from '../hermes/jobs.js'

export { PLACES as LANDMARKS } from './places.js'
import { PLACES as LANDMARKS } from './places.js'

export function createAgoraLandmarks(parent) {
 const root=new Group();parent.add(root)
 const items=LANDMARKS.map((landmark,index)=>{
  const i=['work','craft','trust','rights'].indexOf(landmark.kind)
  const model=[hermes,hephaestus,createBalance,athena][i]()
  const object=model.root
  const group=new Group();group.add(object);root.add(group)
  // Reuse the original stone pedestals, architectural garden and sculptural props.
  box(group,[0,-.16,0],[2,.3,1.8],materials.limestone)
  if(i===0){const gate=gates(group);gate.root.position.set(0,0,-2);gate.root.scale.setScalar(.38)}
  if(i===1){const tablet=box(group,[1.1,1.1,.6],[.8,1.1,.08],materials.bronze);tablet.rotation.y=-.2;vase(group,[-1,.02,.3],1.2)}
  if(i===2){const shrine=temple(group,6,4,3);shrine.position.set(0,0,-2);shrine.scale.setScalar(.55)}
  tree(group,-1.5,-1,.65);cypress(group,1.5,-1,.65)
  return {group,model,phase:index*.71,...landmark}
 })
 const worker=sisyphus();worker.root.scale.setScalar(.6);worker.root.position.set(-.4,0,0)
 const start=new Group();root.add(start);start.add(worker.root);boulder(start,[.7,.63,0],.63)
 const center={lngLat:DEMO_ORIGIN,group:start}
 return {root,items,update(time,dt,scale,local,weights,reduced,positions={}){
  for(const item of items){item.group.position.copy(local(positions[item.id]??item.lngLat));item.group.scale.setScalar(scale*.55)
   const t=reduced?0:time+item.phase
   if(item.kind==='trust'){
    item.model.update(t,reduced?0:dt,weights?.fair??0,weights?.risk??0,reduced)
    item.model.root.rotation.y=reduced?0:Math.sin(t*.6)*.06
   }else item.model.animate(t)
  }
  center.group.position.copy(local(center.lngLat));center.group.scale.setScalar(scale*.7)
  worker.animate(reduced?0:time)
 }}
}
