// Background sculpture interactions are isolated from the amphora drag state.
import {useEffect,useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Group,Plane,Vector3} from 'three'
import {athena,hephaestus,tree,temple,cypress} from './myth-models.js'
import {disposeObject} from './balance.js'
import {hall} from '../vase/hall.js'
export default function InheritedGallery(){
 const drag=useRef(null),reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches)
 const {scene,models}=useMemo(()=>{
  const g=new Group(),decor=new Group();g.add(decor)
  const templeGroup=temple(decor,8,5,3);templeGroup.position.set(0,0,-8);templeGroup.scale.setScalar(.8)
  const smith=hephaestus();smith.root.position.set(-3.6,.05,-2);smith.root.scale.setScalar(.85);smith.root.rotation.y=.4;g.add(smith.root)
  const guardian=athena();guardian.root.position.set(3.6,.05,-2);guardian.root.scale.setScalar(.85);guardian.root.rotation.y=-.4;g.add(guardian.root)
  for(const model of [smith,guardian])model.root.userData.movableSculpture=true
  tree(decor,-5,-6,1.5);tree(decor,5,-6,1.5);cypress(decor,-6,-8,1.5);cypress(decor,6,-8,1.5)
  decor.traverse(o=>{o.raycast=()=>null});g.traverse(o=>{o.castShadow=false})
  return {scene:g,models:[smith,guardian]}
 },[])
 const release=()=>{const d=drag.current;if(d?.target?.hasPointerCapture?.(d.id))d.target.releasePointerCapture(d.id);drag.current=null;if(hall.grab==='background-sculpture')hall.grab=null;document.body.style.cursor=''}
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{reduced.current=query.matches};query.addEventListener('change',change);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);return()=>{release();query.removeEventListener('change',change);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);disposeObject(scene)}},[scene])
 useFrame(({clock})=>{models.forEach((m,i)=>m.animate(reduced.current?0:clock.elapsedTime+i*.7))})
 return <primitive object={scene} onPointerDown={e=>{
  if(e.button!==0)return
  let model=e.object;while(model&&!model.userData.movableSculpture)model=model.parent
  if(!model)return
  e.stopPropagation();hall.grab='background-sculpture';hall.drag.on=false;hall.drag.vel=0
  const plane=new Plane(new Vector3(0,0,1),-e.point.z)
  drag.current={model,plane,start:e.point.clone(),position:model.position.clone(),target:e.target,id:e.pointerId}
  e.target.setPointerCapture(e.pointerId);document.body.style.cursor='grabbing'
 }} onPointerMove={e=>{
  const d=drag.current;if(!d||e.pointerId!==d.id)return
  e.stopPropagation();const point=new Vector3();if(!e.ray.intersectPlane(d.plane,point))return
  const next=d.position.clone().add(point.sub(d.start))
  // Keep the centre clear so the amphora remains reachable and rotatable.
  const side=Math.sign(d.position.x)||1
  d.model.position.x=side*Math.max(2.3,Math.min(6,side*next.x));d.model.position.y=Math.max(.05,Math.min(2,next.y))
 }} onPointerUp={e=>{if(drag.current){e.stopPropagation();release()}}} onPointerCancel={release} onClick={e=>e.stopPropagation()}/>
}
