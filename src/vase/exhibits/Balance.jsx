import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { hall, T, smooth } from '../hall.js'
import { createBalance, disposeObject } from '../../world/balance.js'

export default function Balance({ standalone = false, weights, reducedMotion = false }) {
  const root = useRef()
  const model = useMemo(createBalance, [])
  useEffect(()=>()=>disposeObject(model.root),[model])
  useFrame((state, dt) => {
    const [a,b]=T.chapters[2],p=hall.p
    const reveal=standalone?1:smooth(a,a+.03,p)*(1-smooth(b-.03,b,p))
    root.current.visible=standalone||(p>a&&p<b&&reveal>0)
    root.current.position.y=standalone?-1.6:-1.2-4.2*(1-reveal)
    const value=weights??hall.offer
    model.update(state.clock.elapsedTime,dt,value?.fair??0,value?.risk??0,reducedMotion)
  })
  return <group ref={root} position={standalone?[0,-1.6,0]:[-2.45,-5.4,-.8]} visible={standalone}><primitive object={model.root} dispose={null}/></group>
}
