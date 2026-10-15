import { Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, LatheGeometry, MeshStandardMaterial, MeshPhysicalMaterial, Vector2, Vector3 } from 'three'

// Shared by the gallery and the street map: the same bronze-and-glass balance.
export function createBalance() {
  const root = new Group(), beam = new Group(), pans = [], chains = [], coins = []
  const bronze = new MeshStandardMaterial({ color: '#b58b52', metalness: .9, roughness: .3 })
  const marble = new MeshStandardMaterial({ color: '#f3eadb', roughness: .48, metalness: .02 })
  const gold = new MeshStandardMaterial({ color: '#e8b06a', metalness: 1, roughness: .25 })
  const risk = new MeshStandardMaterial({ color: '#8f2a1c', metalness: .3, roughness: .35 })
  const glass = new MeshPhysicalMaterial({ color: '#f3eadb', transmission: .9, thickness: .1, roughness: .06, ior: 1.5 })
  const add = (parent, geometry, material, position) => { const m = new Mesh(geometry, material); m.position.set(...position); m.castShadow = m.receiveShadow = true; parent.add(m); return m }
  add(root, new BoxGeometry(1.02,.18,1.02), marble, [0,.09,0])
  add(root, new CylinderGeometry(.36,.4,.86,48), marble, [0,.61,0])
  const flute = new CylinderGeometry(.035,.045,.82,10)
  for(let i=0;i<20;i++){const a=i*Math.PI/10;add(root,flute,marble,[Math.cos(a)*.36,.61,Math.sin(a)*.36])}
  add(root,new BoxGeometry(1,.15,1),marble,[0,1.075,0])
  add(root,new CylinderGeometry(.22,.3,.12,32),bronze,[0,1.21,0])
  add(root,new CylinderGeometry(.045,.075,1.88,24),bronze,[0,2.18,0])
  add(root,new SphereGeometry(.12,20,12),bronze,[0,3.26,0])
  root.add(beam);beam.position.y=3.08
  add(beam,new BoxGeometry(2.06,.07,.075),bronze,[0,0,0])
  for(const x of [-1,1])add(beam,new SphereGeometry(.065,16,10),bronze,[x,0,0])
  const points=[[0,0],[.12,0],[.25,.018],[.34,.065],[.37,.11],[.36,.115],[.33,.075],[.245,.03],[.12,.012],[0,.012]].map(p=>new Vector2(...p))
  const panGeo=new LatheGeometry(points,48),chainGeo=new CylinderGeometry(.008,.008,1,8),coinGeo=new CylinderGeometry(.1,.1,.03,24)
  const slots=Array.from({length:12},(_,i)=>[Math.cos(i%6*Math.PI/3)*.205,.035+Math.floor(i/6)*.034,Math.sin(i%6*Math.PI/3)*.205])
  for(let side=0;side<2;side++){
    const pan=new Group();root.add(pan);pans.push(pan)
    add(pan,panGeo,glass,[0,0,0])
    add(pan,new TorusGeometry(.365,.012,10,48),bronze,[0,.11,0]).rotation.x=Math.PI/2
    for(let j=0;j<3;j++)chains.push(add(root,chainGeo,bronze,[0,0,0]))
    for(let i=0;i<12;i++){
      const coin=new Group();pan.add(coin);coin.position.set(...slots[i]);coin.visible=false
      add(coin,coinGeo,side===0?gold:risk,[0,0,0])
      add(coin,new TorusGeometry(.099,.006,8,24),gold,[0,0,0]).rotation.x=Math.PI/2
      coins.push(coin)
    }
  }
  let angle=0,velocity=0
  const counts=[0,0],born=new Array(24).fill(0),up=new Vector3(0,1,0),top=new Vector3(),bottom=new Vector3(),direction=new Vector3()
  const count=v=>Number.isFinite(v)?Math.min(12,Math.max(0,Math.floor(v))):0
  const update=(time,dt,fair=0,riskCount=0,snap=false)=>{
    const values=[count(fair),count(riskCount)]
    const target=Math.max(-.3,Math.min(.3,(values[0]-values[1])*.06))+Math.sin(time*1.1)*.008
    const elapsed=Math.min(dt,.1),steps=Math.max(1,Math.ceil(elapsed/.008))
    for(let i=0;i<steps;i++){velocity+=((target-angle)*30-velocity*8)*elapsed/steps;angle+=velocity*elapsed/steps}
    if(snap){angle=target;velocity=0}
    beam.rotation.z=angle
    for(let side=0;side<2;side++){
      const x=side===0?-1:1,endX=x*Math.cos(angle),endY=3.08+x*Math.sin(angle),panY=endY-.88
      pans[side].position.set(endX,panY,0)
      for(let j=0;j<3;j++){
        const a=j*Math.PI*2/3+Math.PI/6;top.set(endX,endY,0);bottom.set(endX+Math.cos(a)*.36,panY+.11,Math.sin(a)*.36)
        const chain=chains[side*3+j];chain.position.copy(top).add(bottom).multiplyScalar(.5);direction.subVectors(top,bottom);chain.scale.y=direction.length();chain.quaternion.setFromUnitVectors(up,direction.normalize())
      }
      for(let i=0;i<12;i++){
        const index=side*12+i;if(i>=counts[side]&&i<values[side])born[index]=time
        const coin=coins[index];coin.visible=i<values[side]
        const u=Math.min(1,Math.max(0,(time-born[index])/.5));const drop=snap?0:u<.7?.8*(1-(u/.7)**2):.065*Math.sin((u-.7)/.3*Math.PI)
        coin.position.y=slots[i][1]+drop
      }
      counts[side]=values[side]
    }
  }
  update(0,0)
  return {root,beam,pans,coins,update}
}

export function disposeObject(root) {
  const resources=new Set()
  root.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)resources.add(m)})
  resources.forEach(r=>r.dispose())
}
