// Selected original procedural sculptures from b_proto_v2, commit 492288f.
// Reuse the current renderer and lighting; no second cinematic runtime.
import {useMemo} from 'react'
import {Group} from 'three'
import {athena,hephaestus,tree,temple,cypress} from './myth-models.js'
export default function InheritedGallery(){
 const scene=useMemo(()=>{
  const g=new Group()
  const templeGroup=temple(g,8,5,3);templeGroup.position.set(0,0,-8);templeGroup.scale.setScalar(.8)
  const smith=hephaestus();smith.root.position.set(-3.6,.05,-2);smith.root.scale.setScalar(.85);smith.root.rotation.y=.4;g.add(smith.root)
  const guardian=athena();guardian.root.position.set(3.6,.05,-2);guardian.root.scale.setScalar(.85);guardian.root.rotation.y=-.4;g.add(guardian.root)
  tree(g,-5,-6,1.5);tree(g,5,-6,1.5);cypress(g,-6,-8,1.5);cypress(g,6,-8,1.5)
  g.traverse(o=>{o.castShadow=false;o.raycast=()=>null})
  return g
 },[])
 return <primitive object={scene}/>
}
