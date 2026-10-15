import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { JOBS, TRADES, DEMO_ORIGIN, money, tradeOf } from '../hermes/jobs.js'
import { jobStore, selectJobs, activeHold, makeHold, setInterest, dateLabel, distanceKm } from '../domain/jobs.js'
import { useStore } from '../domain/storage.js'
import { checkJob } from '../domain/offers.js'
import { useI18n } from '../i18n/index.jsx'
import { Choice, SaveStatus, ClearDraft } from './common.jsx'
import Listen from '../ui/Listen.jsx'
import SceneBoundary from '../ui/SceneBoundary.jsx'
import { PLACES as LANDMARKS } from '../agora/places.js'
import '../agora/workspace.css'
const Card=lazy(()=>import('./Card.jsx')), Offer=lazy(()=>import('./Offer.jsx')), Rights=lazy(()=>import('./Rights.jsx'))
const MapView=lazy(()=>import('../agora/MapView.jsx'))
export default function Work(){
 const {t,lang}=useI18n(),[state,set,status]=useStore(jobStore),[geo,setGeo]=useState('idle'),[now,setNow]=useState(Date.now()),[mapAttempt,setMapAttempt]=useState(0)
 const [panel,setPanel]=useState('jobs'),[place,setPlace]=useState(null)
 const say=(en,hi)=>lang==='hi'?hi:en
 const openPlace=p=>{setPlace(p);setPanel('places')}
 useEffect(()=>{const open=e=>{if(e.detail==='trust')setPanel('offer')};window.addEventListener('ergon-exhibit',open);return()=>window.removeEventListener('ergon-exhibit',open)},[])
 const list=selectJobs(state), selected=JOBS.find(j=>j.id===state.selected), hold=activeHold(state.hold,now), sidebar=useRef(),title=useRef(), lastRow=useRef(null),listScroll=useRef(0)
 const choose=id=>{setPanel('jobs');setPlace(null);lastRow.current=id;listScroll.current=sidebar.current?.scrollTop??0;set(s=>({...s,selected:id}))}
 const filters=patch=>set(s=>({...s,...patch,selected:null}))
 useEffect(()=>{if(!state.hold)return;const update=()=>{const n=Date.now();setNow(n);if(!activeHold(jobStore.getSnapshot().data.hold,n))set(s=>({...s,hold:null}))};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[state.hold?.until])
 useEffect(()=>{if(selected){sidebar.current?.scrollTo({top:0});title.current?.focus({preventScroll:true})}},[selected?.id])
 const back=()=>{const id=lastRow.current??state.selected;set(s=>({...s,selected:null}));requestAnimationFrame(()=>{sidebar.current?.scrollTo({top:listScroll.current,behavior:'instant'});document.getElementById(`job-${id}`)?.focus({preventScroll:true})})}
 useEffect(()=>{sidebar.current?.scrollTo({top:0})},[panel,place?.id])
 const locate=()=>{
  if(geo==='asking')return
  if(!navigator.geolocation){setGeo('failed');return}
  setGeo('asking');navigator.geolocation.getCurrentPosition(p=>{setPlace(null);setPanel('jobs');filters({origin:[p.coords.longitude,p.coords.latitude]});setGeo('idle')},e=>setGeo(e.code===1?'denied':'failed'),{timeout:8000,maximumAge:60000})
 }
 const text=(j,key)=>lang==='hi'?(j[`${key}Hi`]??j[key]):j[key]
 const duration=j=>j.durationDays===null?(lang==='hi'?'जारी':'Ongoing'):`${j.durationDays} ${lang==='hi'?'दिन':'days'}`
 const termRows=j=>[
 [lang==='hi'?'काम का प्रकार':'Work source',selected?.sector==='government'?(lang==='hi'?'सरकारी काम · नमूना':'Government Work · example'):(lang==='hi'?'निजी काम · नमूना':'Private Work · example')],[t('pay'),`${money(j.pay)} / ${t(`unit_${j.unit}`)}`],[t('when'),dateLabel(j.startDate,lang)],[t('schedule'),text(j,'hours')],[t('duration'),duration(j)],
 [t('payday'),t(j.payday??'unknown')],[t('fee'),j.fee===null?t('unknown'):money(j.fee)],[t('written'),t(j.written===null?'unknown':j.written?'yes':'no')],
 [t('distance'),`${distanceKm(state.origin,j.lngLat).toFixed(1)} ${t('km')}`],[t('where'),text(j,'place')],[t('bring'),text(j,'bring')],
 ]
 const mapFallback=<div className="map-fallback"><p>{t('mapFailed')}</p><button onClick={()=>setMapAttempt(n=>n+1)}>{t('retry')}</button></div>
 return <>
 <header className="map-topbar"><a className="wordmark" href="#work">ergon</a><nav aria-label={say('Explore the map','नक्शा देखें')}><button aria-pressed={panel==='jobs'} onClick={()=>{setPanel('jobs');setPlace(null);filters({origin:[...state.origin]})}}>{say('Find work','काम खोजें')}</button><button aria-pressed={panel==='places'} onClick={()=>setPanel('places')}>{say('Places & support','स्थान और सहायता')}</button></nav><a className="map-back" href="#work">← {say('Back to the vase','वापस जाएँ')}</a></header>
 <div className="map-workspace">
 <div className="work-map"><SceneBoundary key={mapAttempt} fallback={mapFallback}><Suspense fallback={<div className="map-fallback">{t('mapLoading')}</div>}><MapView jobs={list} origin={state.origin} selected={state.selected} selectedPlace={place} interest={state.interest} km={state.km} onSelect={choose} onPlaceSelect={openPlace} onMove={origin=>filters({origin})} onRetry={()=>setMapAttempt(n=>n+1)}/></Suspense></SceneBoundary></div>
 <button className="map-locate" onClick={locate} disabled={geo==='asking'}>◎ {t(geo==='asking'?'geoAsking':'locate')}</button>
 <aside ref={sidebar} className="map-sidebar" aria-label={say('Work and local support','काम और स्थानीय सहायता')}>
 <nav className="map-tools" aria-label={say('Your tools','आपके साधन')}>{[['card',say('Work card','काम कार्ड')],['offer',say('Check an offer','प्रस्ताव जाँचें')],['rights',say('Rights & wages','अधिकार व मज़दूरी')]].map(([id,label])=><button key={id} aria-pressed={panel===id} onClick={()=>setPanel(id)}>{label}</button>)}</nav>
 {panel==='places'?<section className="place-panel"><p className="task-eyebrow">{say('MUMBAI · USEFUL PLACES','मुंबई · उपयोगी स्थान')}</p><h1>{place?(lang==='hi'?place.hi:place.name):say('Help, close at hand.','सहायता के स्थान')}</h1>{place?<><button onClick={()=>setPlace(null)}>← {say('All places','सभी स्थान')}</button><p className="place-category">{place.category}</p><p>{place.description}</p><h2>{say('Address','पता')}</h2><address>{place.address}</address><p className="microcopy">{say('Map position is approximate. Directions use the published address. Check the office website before travelling.','नक्शे पर स्थान अनुमानित है। जाने से पहले कार्यालय की वेबसाइट देखें।')}</p><div className="place-links"><a className="primary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name+', '+place.address)}`} target="_blank" rel="noreferrer">{say('Get directions ↗','रास्ता देखें ↗')}</a><a href={place.source} target="_blank" rel="noreferrer">{say('Official information ↗','आधिकारिक जानकारी ↗')}</a></div></>:<><p className="microcopy">{say('Real offices and work districts. Flowers show sample jobs, not current vacancies.','असली कार्यालय और कार्य क्षेत्र। फूल नमूना काम दिखाते हैं।')}</p><ul className="place-list">{LANDMARKS.map(p=><li key={p.key}><button onClick={()=>openPlace(p)}><small>{p.category}</small><strong>{lang==='hi'?p.hi:p.name}</strong><span>{p.area} <span aria-hidden="true">↗</span></span></button></li>)}</ul></>}</section>:panel!=='jobs'?<section className="map-tool-panel"><button onClick={()=>setPanel('jobs')}>← {say('Back to work','काम पर वापस')}</button><h1>{panel==='card'?say('Your work card','आपका काम कार्ड'):panel==='offer'?say('Know your terms','अपनी शर्तें जानें'):say('Rights & wages','अधिकार व मज़दूरी')}</h1><Suspense fallback={<p>{say('Opening tool…','खुल रहा है…')}</p>}>{panel==='card'?<Card/>:panel==='offer'?<Offer/>:<Rights/>}</Suspense></section>:<div className="jobs-panel">
 <p className="task-note">{t('demoDate')}</p>
 <div className="work-toolbar"><Choice id="job-sector" label={lang==='hi'?'काम का प्रकार':'Work source'} value={state.sector??'all'} onChange={sector=>filters({sector})} choices={[["all",lang==='hi'?'सभी काम':'All work'],['private',lang==='hi'?'निजी काम':'Private Work'],['government',lang==='hi'?'सरकारी काम':'Government Work']]}/><Choice id="job-trade" label={t('trade')} value={state.trade} onChange={trade=>filters({trade})} choices={[["all",t('allTrades')],...TRADES.map(x=>[x.id,lang==='hi'?x.hi:x.label])]}/><Choice id="job-when" label={t('when')} value={state.when} onChange={when=>filters({when})} choices={['all','day','week','long'].map(x=>[x,t(x==='all'?'any':x)])}/><Choice id="job-range" label={t('range')} value={state.km} onChange={km=>filters({km:Number(km)})} choices={[2,4,7].map(k=>[k,`${k} ${t('km')}`])}/></div>
 {['denied','failed'].includes(geo)&&<p role="status" className="task-note">{t(geo==='denied'?'geoDenied':'geoFailed')}</p>}
 <div className="work-results">
 {selected?<section className="job-detail" aria-labelledby="offer-heading"><button onClick={back}>{t('allWork')}</button><p className="task-eyebrow">{t('sample')} · {lang==='hi'?tradeOf(selected.trade).hi:tradeOf(selected.trade).label}</p><h2 id="offer-heading" tabIndex={-1} ref={title}>{text(selected,'title')}</h2><p className="job-big-pay">{money(selected.pay)} <small>/ {t(`unit_${selected.unit}`)}</small></p>
 <dl className="terms-grid">{termRows(selected).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="task-note">{selected.employer} · {t('sampleHistory')}</p>
 <Listen lines={[[`${text(selected,'title')}. ${termRows(selected).map(([k,v])=>`${k}: ${v}`).join('. ')}. ${t('sampleHistory')}`,lang==='hi'?'hi-IN':'en-IN']]}/>
 <div className="action-row"><button className="primary" onClick={()=>checkJob(selected)}>{t('checkTerms')}</button><button onClick={()=>set(s=>setInterest(s,selected.id,!s.interest[selected.id]))}>{t(state.interest[selected.id]?'removeInterest':'interest')}</button><button onClick={()=>set(s=>({...s,hold:hold?.id===selected.id?null:makeHold(selected.id)}))}>{hold&&hold.id!==selected.id?(lang==='hi'?'पिछला स्थानीय होल्ड बदलें':'Replace previous local hold'):t(hold?.id===selected.id?'release':'hold')}</button></div>
 {state.interest[selected.id]&&<p role="status" className="task-note">{t('interestSaved')}</p>}
 <p className="microcopy">{t('holdNotice')}</p>
 </section>:<>
 <p className="result-count" role="status" aria-live="polite"><b>{list.length}</b> {say('sample jobs within','नमूना काम, दूरी')} {state.km} {t('km')}</p>
 {!list.length&&<div className="task-note"><p>{t(distanceKm(state.origin,DEMO_ORIGIN)>10?'outArea':'empty')}</p><div className="action-row"><button onClick={()=>filters({sector:'all',trade:'all',when:'all'})}>{t('reset')}</button><button onClick={()=>filters({km:7})}>{t('increase')}</button><button onClick={()=>{filters({origin:DEMO_ORIGIN});setGeo('idle')}}>{t('returnDemo')}</button></div></div>}
 <ul className="work-list">{list.map(j=><li key={j.id}><button id={`job-${j.id}`} onClick={()=>choose(j.id)} style={{'--trade-color':tradeOf(j.trade).color}}><span className="job-list-pay">{money(j.pay)} <small>/ {t(`unit_${j.unit}`)}</small></span><strong>{text(j,'title')}</strong><span>{j.sector==='government'?(lang==='hi'?'सरकारी काम · नमूना':'Government Work · example'):(lang==='hi'?'निजी काम · नमूना':'Private Work · example')}</span><span>{dateLabel(j.startDate,lang)} · {j.dist.toFixed(1)} {t('km')}</span><span>{t('payday')}: {t(j.payday??'unknown')}</span><span className="row-action">{t('viewOffer')} → {state.interest[j.id]&&`· ${t('savedInterest')}`}</span></button></li>)}</ul></>}
 </div>
 {hold&&<div role="status" className="task-note"><b>{text(JOBS.find(j=>j.id===hold.id),'title')}</b><p>{Math.ceil((hold.until-now)/60000)} min · {t('remaining')}</p><button onClick={()=>set(s=>({...s,hold:null}))}>{t('release')}</button></div>}
 <SaveStatus status={status}/><ClearDraft onClear={()=>jobStore.clear()}/>
 </div>}
 </aside></div>
 </>
}
