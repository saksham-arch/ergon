import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import Balance from '../vase/exhibits/Balance.jsx'
import Caduceus from '../vase/exhibits/Caduceus.jsx'
import Tablet from '../vase/exhibits/Tablet.jsx'
import Owl from '../vase/exhibits/Owl.jsx'
import FrameBudget from '../ui/FrameBudget.jsx'
import SceneBoundary from '../ui/SceneBoundary.jsx'
import { useI18n } from '../i18n/index.jsx'
import { useStore } from '../domain/storage.js'
import { offerStore } from '../domain/offers.js'
import { weighOffer } from '../themis/rules.js'
import './gallery.css'
const exhibits=[
 {id:'work',name:'Hermes',hi:'हर्मीस',label:'Find work',labelHi:'काम ढूँढें',object:'The winged staff',objectHi:'पंखों वाली छड़ी',body:'A messenger for every new beginning. Follow the smaller glass flowers on the map; each one opens the pay, hours and terms of an example job.',bodyHi:'नक़्शे पर हर छोटा काँच का फूल एक नमूना काम है। मज़दूरी, समय और शर्तें देखने के लिए फूल चुनें।',Component:Caduceus,art:'hermes'},
 {id:'craft',name:'Hephaestus',hi:'हेफ़ेस्टस',label:'Show your skill',labelHi:'अपना हुनर दिखाएँ',object:'The bronze work tablet',objectHi:'काँसे का काम कार्ड',body:'Make your work visible. Your name, chosen skills and work photos become the face of this bronze tablet. Your work card lives in the vase above.',bodyHi:'इस काँसे की पट्टिका पर आपका नाम, हुनर और काम की तस्वीरें दिखती हैं। अपना काम कार्ड ऊपर के कलश में बनाएँ।',Component:Tablet,art:'hephaestus'},
 {id:'trust',name:'Themis',hi:'थीमिस',label:'Check an offer',labelHi:'प्रस्ताव जाँचें',object:'The balance of fair work',objectHi:'काम की शर्तों का तराज़ू',body:'Clear terms weigh against missing details and fees. The scale reflects the offer checked in the vase above.',bodyHi:'यह तराज़ू ऊपर के कलश में जाँचे गए प्रस्ताव की साफ़ शर्तों और गुम जानकारी को दिखाता है।',Component:Balance,art:'themis'},
 {id:'rights',name:'Athena',hi:'एथेना',label:'Know your rights',labelHi:'अपने हक़ जानें',object:'The owl and the rights scroll',objectHi:'उल्लू और अधिकारों का पत्र',body:'Keep the next step close. The owl guards the rights and wage-support tools in the vase above.',bodyHi:'उल्लू अधिकारों और मज़दूरी की सहायता का प्रतीक है। ये साधन ऊपर के कलश में उपलब्ध हैं।',Component:Owl,art:'athena'},
]
export default function ExhibitGallery() {
 const {lang}=useI18n(),[index,setIndex]=useState(2),[active,setActive]=useState(false),[loaded,setLoaded]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),section=useRef()
 const [offer]=useStore(offerStore),weights=weighOffer(offer.offer)
 const item=exhibits[index],Model=item.Component,hi=lang==='hi'
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener('change',change);const observer=new IntersectionObserver(([entry])=>{setActive(entry.isIntersecting);if(entry.isIntersecting)setLoaded(true)},{rootMargin:'180px'});observer.observe(section.current);return()=>{query.removeEventListener('change',change);observer.disconnect()}},[])
 return <section id="tools" ref={section} className="exhibit-gallery" aria-label={hi?'काम के चार साथी':'Four companions for work'}>
 <div className="exhibit-choices" role="group" aria-label={hi?'3D वस्तु चुनें':'Choose a 3D exhibit'}>{exhibits.map((e,i)=><button key={e.id} onClick={()=>setIndex(i)} aria-pressed={index===i}><span className="exhibit-numeral">{['Α','Β','Γ','Δ'][i]}</span><span><strong>{hi?e.labelHi:e.label}</strong><small>{hi?e.hi:e.name}</small></span></button>)}</div>
 <div className="exhibit-display">
 <div className="exhibit-model" role="img" aria-label={`${hi?item.objectHi:item.object} · ${hi?'घुमाने के लिए खींचें':'Drag to turn the 3D sculpture'}`}>
 <SceneBoundary key={item.id} fallback={<img className="exhibit-fallback" src={`/art/gods/${item.art}.jpg`} alt={hi?item.objectHi:item.object}/>}>
 {loaded&&<Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,.45,8.5],fov:38,near:.1,far:30}} gl={{antialias:true}}>
 <FrameBudget active={active} fps={reduced?4:30}/><color attach="background" args={['#21170f']}/>
 <ambientLight intensity={.8} color="#ffe4bd"/><directionalLight position={[-3,5,5]} intensity={3} color="#ffebcf"/><directionalLight position={[4,2,-2]} intensity={2} color="#c97139"/>
 <Environment resolution={128}><Lightformer intensity={3} position={[-3,3,3]} scale={[2,6,1]}/><Lightformer intensity={2} color="#e8b06a" position={[3,2,1]} scale={[1,5,1]}/></Environment>
 <Suspense fallback={null}><Model standalone reducedMotion={reduced} weights={item.id==='trust'?weights:undefined}/></Suspense>
 <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI*.25} maxPolarAngle={Math.PI*.7} target={[0,0,0]}/>
 </Canvas>}
 </SceneBoundary><span className="exhibit-turn">{hi?'खींचकर घुमाएँ':'Drag to turn'} ↔</span>
 </div>
 <div className="exhibit-copy"><p className="exhibit-god">{hi?item.hi:item.name} · {['Α','Β','Γ','Δ'][index]}</p><h3>{hi?item.objectHi:item.object}</h3><p>{hi?item.bodyHi:item.body}</p>
 <p className="exhibit-caption">{hi?'काँसा · संगमरमर · काँच':'BRONZE · MARBLE · GLASS'}</p></div>
 </div>

 </section>
}
