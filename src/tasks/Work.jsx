import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { JOBS, TRADES, DEMO_ORIGIN, money, tradeOf } from '../hermes/jobs.js'
import { jobStore, selectJobs, activeHold, makeHold, setInterest, dateLabel, distanceKm } from '../domain/jobs.js'
import { useStore } from '../domain/storage.js'
import { checkJob } from '../domain/offers.js'
import { useI18n } from '../i18n/index.jsx'
import { Choice, SaveStatus, ClearDraft } from './common.jsx'
import Listen from '../ui/Listen.jsx'
import SceneBoundary from '../ui/SceneBoundary.jsx'
const MapView=lazy(()=>import('../agora/MapView.jsx'))
export default function Work(){
 const {t,lang}=useI18n(),[state,set,status]=useStore(jobStore),[view,setView]=useState(()=>matchMedia('(min-width: 860px)').matches?'map':'list'),[geo,setGeo]=useState('idle'),[now,setNow]=useState(Date.now()),[mapAttempt,setMapAttempt]=useState(0)
 const list=selectJobs(state), selected=JOBS.find(j=>j.id===state.selected), hold=activeHold(state.hold,now), title=useRef(), lastRow=useRef(null),listScroll=useRef(0)
 const choose=id=>{lastRow.current=id;listScroll.current=window.scrollY;set(s=>({...s,selected:id}))}
 const filters=patch=>set(s=>({...s,...patch,selected:null}))
 useEffect(()=>{if(!state.hold)return;const update=()=>{const n=Date.now();setNow(n);if(!activeHold(jobStore.getSnapshot().data.hold,n))set(s=>({...s,hold:null}))};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[state.hold?.until])
 useEffect(()=>{if(selected)title.current?.focus({preventScroll:true})},[selected?.id])
 const back=()=>{const id=lastRow.current??state.selected;set(s=>({...s,selected:null}));requestAnimationFrame(()=>{window.scrollTo({top:listScroll.current,behavior:'instant'});document.getElementById(`job-${id}`)?.focus({preventScroll:true})})}
 const locate=()=>{
  if(geo==='asking')return
  if(!navigator.geolocation){setGeo('failed');return}
  setGeo('asking');navigator.geolocation.getCurrentPosition(p=>{filters({origin:[p.coords.longitude,p.coords.latitude]});setGeo('idle')},e=>setGeo(e.code===1?'denied':'failed'),{timeout:8000,maximumAge:60000})
 }
 const text=(j,key)=>lang==='hi'?(j[`${key}Hi`]??j[key]):j[key]
 const duration=j=>j.durationDays===null?(lang==='hi'?'जारी':'Ongoing'):`${j.durationDays} ${lang==='hi'?'दिन':'days'}`
 const termRows=j=>[
 [t('pay'),`${money(j.pay)} / ${t(`unit_${j.unit}`)}`],[t('when'),dateLabel(j.startDate,lang)],[t('schedule'),text(j,'hours')],[t('duration'),duration(j)],
 [t('payday'),t(j.payday??'unknown')],[t('fee'),j.fee===null?t('unknown'):money(j.fee)],[t('written'),t(j.written===null?'unknown':j.written?'yes':'no')],
 [t('distance'),`${distanceKm(state.origin,j.lngLat).toFixed(1)} ${t('km')}`],[t('where'),text(j,'place')],[t('bring'),text(j,'bring')],
 ]
 const mapFallback=<div className="map-fallback"><p>{t('mapFailed')}</p><button onClick={()=>setMapAttempt(n=>n+1)}>{t('retry')}</button></div>
 return <>
 <p className="task-note">{t('demoDate')}</p>
 <div className="work-toolbar"><Choice id="job-trade" label={t('trade')} value={state.trade} onChange={trade=>filters({trade})} choices={[["all",t('allTrades')],...TRADES.map(x=>[x.id,lang==='hi'?x.hi:x.label])]}/><Choice id="job-when" label={t('when')} value={state.when} onChange={when=>filters({when})} choices={['all','day','week','long'].map(x=>[x,t(x==='all'?'any':x)])}/><Choice id="job-range" label={t('range')} value={state.km} onChange={km=>filters({km:Number(km)})} choices={[2,4,7].map(k=>[k,`${k} ${t('km')}`])}/></div>
 <div className="action-row" role="group" aria-label={t('work')}><button aria-pressed={view==='list'} onClick={()=>setView('list')}>{t('list')}</button><button aria-pressed={view==='map'} onClick={()=>setView('map')}>{t('showMap')}</button><button onClick={locate} disabled={geo==='asking'}>{t(geo==='asking'?'geoAsking':'locate')}</button></div>
 <p className="microcopy">{t('geoNotice')}</p>{['denied','failed'].includes(geo)&&<p role="status" className="task-note">{t(geo==='denied'?'geoDenied':'geoFailed')}</p>}
 {view==='map'&&<div className="work-map"><p>{t('mapHelp')}</p><SceneBoundary key={mapAttempt} fallback={mapFallback}><Suspense fallback={<div className="map-fallback"><p>{t('mapLoading')}</p></div>}><MapView jobs={list} origin={state.origin} selected={state.selected} interest={state.interest} km={state.km} onSelect={choose} onMove={origin=>filters({origin})} onRetry={()=>setMapAttempt(n=>n+1)}/></Suspense></SceneBoundary></div>}
 {selected?<section className="job-detail" aria-labelledby="offer-heading"><button onClick={back}>{t('allWork')}</button><p className="task-eyebrow">{t('sample')} · {lang==='hi'?tradeOf(selected.trade).hi:tradeOf(selected.trade).label}</p><h2 id="offer-heading" tabIndex={-1} ref={title}>{text(selected,'title')}</h2><p className="job-big-pay">{money(selected.pay)} <small>/ {t(`unit_${selected.unit}`)}</small></p>
 <dl className="terms-grid">{termRows(selected).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="task-note">{selected.employer} · {t('sampleHistory')}</p>
 <Listen lines={[[`${text(selected,'title')}. ${termRows(selected).map(([k,v])=>`${k}: ${v}`).join('. ')}. ${t('sampleHistory')}`,lang==='hi'?'hi-IN':'en-IN']]}/>
 <div className="action-row"><button className="primary" onClick={()=>checkJob(selected)}>{t('checkTerms')}</button><button onClick={()=>set(s=>setInterest(s,selected.id,!s.interest[selected.id]))}>{t(state.interest[selected.id]?'removeInterest':'interest')}</button><button onClick={()=>set(s=>({...s,hold:hold?.id===selected.id?null:makeHold(selected.id)}))}>{t(hold?.id===selected.id?'release':'hold')}</button></div>
 {state.interest[selected.id]&&<p role="status" className="task-note">{t('interestSaved')}</p>}
 <p className="microcopy">{t('holdNotice')}</p>
 </section>:<>
 <p className="result-count" role="status" aria-live="polite">{list.length} {t('results')} · {t('distance')}</p>
 {!list.length&&<div className="task-note"><p>{t(distanceKm(state.origin,DEMO_ORIGIN)>10?'outArea':'empty')}</p><div className="action-row"><button onClick={()=>filters({trade:'all',when:'all'})}>{t('reset')}</button><button onClick={()=>filters({km:7})}>{t('increase')}</button><button onClick={()=>{filters({origin:DEMO_ORIGIN});setGeo('idle')}}>{t('returnDemo')}</button></div></div>}
 <ul className="work-list">{list.map(j=><li key={j.id}><button id={`job-${j.id}`} onClick={()=>choose(j.id)} style={{'--trade-color':tradeOf(j.trade).color}}><span className="job-list-pay">{money(j.pay)} <small>/ {t(`unit_${j.unit}`)}</small></span><strong>{text(j,'title')}</strong><span>{dateLabel(j.startDate,lang)} · {j.dist.toFixed(1)} {t('km')}</span><span>{t('payday')}: {t(j.payday??'unknown')}</span><span className="row-action">{t('viewOffer')} → {state.interest[j.id]&&`· ${t('savedInterest')}`}</span></button></li>)}</ul></>}
 {hold&&<div role="status" className="task-note"><b>{text(JOBS.find(j=>j.id===hold.id),'title')}</b><p>{Math.ceil((hold.until-now)/60000)} min · {t('remaining')}</p><button onClick={()=>set(s=>({...s,hold:null}))}>{t('release')}</button></div>}
 <SaveStatus status={status}/><ClearDraft onClear={()=>jobStore.clear()}/>
 </>
}
