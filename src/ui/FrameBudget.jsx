import {useEffect} from 'react'
import {useThree} from '@react-three/fiber'
// Gallery only: leave the original boulder's renderer and physics untouched.
export default function FrameBudget({active}){
 const invalidate=useThree(s=>s.invalidate)
 useEffect(()=>{if(!active)return;invalidate();const tick=setInterval(()=>{if(!document.hidden)invalidate()},1000/30);return()=>clearInterval(tick)},[active,invalidate])
 return null
}
