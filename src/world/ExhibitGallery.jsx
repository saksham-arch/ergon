import { lazy, Suspense, useEffect, useRef, useState } from 'react'
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
import { destinationOf } from '../agora/destinations.js'
import { jobStore } from '../domain/jobs.js'
import { navigate } from '../domain/navigation.js'
import './gallery.css'
const Card=lazy(()=>import('../tasks/Card.jsx'))
const Offer=lazy(()=>import('../tasks/Offer.jsx'))
const Rights=lazy(()=>import('../tasks/Rights.jsx'))
const exhibits=[
 {id:'work',name:'Hermes',hi:'हर्मीस',label:'Find work',labelHi:'काम ढूँढें',object:'The winged staff',objectHi:'पंखों वाली छड़ी',body:'A messenger for every new beginning. Follow the smaller glass flowers on the map; each one opens the pay, hours and terms of an example job.',bodyHi:'नक़्शे पर हर छोटा काँच का फूल एक नमूना काम है। मज़दूरी, समय और शर्तें देखने के लिए फूल चुनें।',Component:Caduceus,art:'hermes'},
 {id:'craft',name:'Hephaestus',hi:'हेफ़ेस्टस',label:'Show your skill',labelHi:'अपना हुनर दिखाएँ',object:'The bronze work tablet',objectHi:'काँसे का काम कार्ड',body:'Make your work visible. Your name, chosen skills and work photos become the face of this bronze tablet. Turn it, then download your card.',bodyHi:'अपना नाम, हुनर और काम की तस्वीरों से इस काँसे की पट्टिका पर काम कार्ड बनाएँ। इसे घुमाएँ और कार्ड डाउनलोड करें।',Component:Tablet,Tool:Card,art:'hephaestus'},
 {id:'trust',name:'Themis',hi:'थीमिस',label:'Check an offer',labelHi:'प्रस्ताव जाँचें',object:'The balance of fair work',objectHi:'काम की शर्तों का तराज़ू',body:'Clear terms weigh against missing details and fees. Try a sample offer or change its terms below: the same 3D scale answers with bronze and red weights.',bodyHi:'साफ़ शर्तों और गुम जानकारी को तराज़ू पर तौलें। नीचे नमूना प्रस्ताव चुनें या शर्तें बदलें: काँसे और लाल सिक्कों के साथ तराज़ू बदलेगा।',Component:Balance,Tool:Offer,art:'themis'},
 {id:'rights',name:'Athena',hi:'एथेना',label:'Know your rights',labelHi:'अपने हक़ जानें',object:'The owl and the rights scroll',objectHi:'उल्लू और अधिकारों का पत्र',body:'Keep the next step close. Unroll the scroll, explore welfare schemes, or prepare a local reminder for unpaid wages. Nothing is sent or filed.',bodyHi:'पत्र खोलें, योजनाएँ देखें या बकाया मज़दूरी के लिए स्थानीय याद-दिहानी तैयार करें। कुछ भेजा या दर्ज नहीं होता।',Component:Owl,Tool:Rights,art:'athena'},
]
export default function ExhibitGallery({ mapPage=false }) {
 const {lang}=useI18n(),[index,setIndex]=useState(2),[open,setOpen]=useState(false),[active,setActive]=useState(false),[loaded,setLoaded]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),section=useRef()
 const [offer]=useStore(offerStore),weights=weighOffer(offer.offer)
 const base=exhibits[index],destination=mapPage?destinationOf(base.id):null
 const item=destination?{...base,...destination,object:destination.label,objectHi:destination.labelHi}:base
 const Model=item.Component,Tool=mapPage&&item.id==='trust'?CourtTools:item.Tool,hi=lang==='hi'
 const showSector=()=>{jobStore.set(s=>({...s,sector:destination.sector,trade:'all',when:'all',selected:null}));document.getElementById('nearby-work')?.scrollIntoView({behavior:'instant'})}
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener('change',change);const observer=new IntersectionObserver(([entry])=>{setActive(entry.isIntersecting);if(entry.isIntersecting)setLoaded(true)},{rootMargin:'180px'});observer.observe(section.current);return()=>{query.removeEventListener('change',change);observer.disconnect()}},[])
 useEffect(()=>{if(!mapPage)return;const change=e=>{const i=exhibits.findIndex(x=>x.id===e.detail);if(i>=0){setIndex(i);setOpen(i!==0);section.current?.scrollIntoView({behavior:'instant',block:'start'})}};window.addEventListener('ergon-exhibit',change);return()=>window.removeEventListener('ergon-exhibit',change)},[mapPage])
 const pick=i=>{setIndex(i);setOpen(i!==0)}
 return <section id={mapPage?'map-tools':'tools'} ref={section} className={`exhibit-gallery ${mapPage?'on-map':''}`} aria-labelledby={mapPage?'map-exhibits-title':'exhibits-title'}>
 <header className="exhibit-heading"><p>ἔργον · {mapPage?(hi?'काम और सहायता के चार रास्ते':'Work, support and fair terms'):(hi?'काम के चार साथी':'Four companions for a day of work')}</p><h2 id={mapPage?'map-exhibits-title':'exhibits-title'}>{mapPage?(hi?'काम ढूँढें। अपने हक़ जानें।':'Find work. Know where to turn.'):(hi?'कहानी से आपके हाथ तक।':'From the myth, into your hands.')}</h2></header>
 <div className="exhibit-choices" role="group" aria-label={hi?'3D वस्तु चुनें':'Choose a 3D exhibit'}>{exhibits.map((e,i)=><button key={e.id} onClick={()=>pick(i)} aria-pressed={index===i}><span className="exhibit-numeral">{['Α','Β','Γ','Δ'][i]}</span><span><strong>{hi?(mapPage?destinationOf(e.id).labelHi:e.labelHi):(mapPage?destinationOf(e.id).label:e.label)}</strong><small>{hi?e.hi:e.name}</small></span></button>)}</div>
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
 {destination?.sector&&<button className="exhibit-action" onClick={showSector}>{hi?'ये काम देखें':'Explore these jobs'} ↗</button>}
 {Tool?<button className="exhibit-action" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?(hi?'साधन बंद करें':'Close the tool'):(mapPage&&item.id==='craft'?(hi?'काम कार्ड बनाएँ':'Make a work card'):(hi?item.labelHi:item.label))} <span>{open?'−':'↗'}</span></button>:destination?.sector?null:<button className="exhibit-action" onClick={()=>mapPage?document.getElementById('nearby-work')?.scrollIntoView({behavior:'instant'}):navigate('map')}>{hi?'सभी काम देखें':'Explore all nearby work'} ↗</button>}
 <p className="exhibit-caption">{mapPage?(hi?'नमूना स्थान · वास्तविक कार्यालय के पते नहीं':'DEMO DESTINATIONS · NOT REAL OFFICE ADDRESSES'):(hi?'काँसा · संगमरमर · काँच':'BRONZE · MARBLE · GLASS')}</p></div>
 </div>
 {open&&Tool&&<div className="exhibit-tool"><Suspense fallback={<p>{hi?'साधन खुल रहा है…':'Opening the tool…'}</p>}><Tool/></Suspense></div>}
 </section>
}

function CourtTools(){
 const {lang}=useI18n(),[mode,setMode]=useState('offer'),hi=lang==='hi'
 return <><div className="action-row"><button aria-pressed={mode==='offer'} onClick={()=>setMode('offer')}>{hi?'प्रस्ताव जाँचें':'Check offer terms'}</button><button aria-pressed={mode==='wages'} onClick={()=>setMode('wages')}>{hi?'मज़दूरी याद-दिहानी':'Prepare a wage reminder'}</button></div>{mode==='offer'?<Offer/>:<Rights initialMode="wages"/>}</>
}
