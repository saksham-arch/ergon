import {useEffect,useState} from 'react'
import {useI18n} from '../i18n/index.jsx'
import {useStore} from '../domain/storage.js'
import {offerStore} from '../domain/offers.js'
import {PRESETS,weighOffer} from '../themis/rules.js'
import {JOBS,TRADES,money} from '../hermes/jobs.js'
import {hall} from '../vase/hall.js'
import {SaveStatus,ClearDraft} from './common.jsx'
import Listen from '../ui/Listen.jsx'
export default function Offer(){
 const {t,lang}=useI18n(),[state,set,status]=useStore(offerStore),[undo,setUndo]=useState(null)
 const o=state.offer,res=weighOffer(o),job=JOBS.find(j=>j.id===state.source),say=(a,b)=>lang==='hi'?b:a
 const edit=(key,value)=>set(s=>({...s,preset:null,offer:{...s.offer,[key]:value}}))
 useEffect(()=>{hall.offer={fair:res.fair,risk:res.risk}},[res.fair,res.risk])
 const choice=(key,label,options)=><label className="field"><span>{label}</span><select value={o[key]??'unknown'} onChange={e=>edit(key,e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 const yesno=['unknown','yes','no'].map(k=>[k,t(k)])
 return <div className="tool">
 {job&&<p className="tool-note">{say('Local what-if for','स्थानीय अनुमान')}: {lang==='hi'?job.titleHi:job.title} · {money(job.pay)} / {t(`unit_${job.unit}`)}. <a href="#map">{say('Return to selected work','चुने काम पर लौटें')} →</a></p>}
 <div className="presets"><span>{say('Sample offers','नमूना प्रस्ताव')}</span>{Object.keys(PRESETS).map(k=><button type="button" key={k} aria-pressed={state.preset===k} onClick={()=>{setUndo(state);set({offer:PRESETS[k],source:null,preset:k})}}>{t(k)}</button>)}{undo&&<button onClick={()=>{set(undo);setUndo(null)}}>{say('Restore my offer','मेरा प्रस्ताव वापस')}</button>}</div>
 <div className="form-grid">{choice('trade',t('trade'),TRADES.map(x=>[x.id,lang==='hi'?x.hi:x.label]))}{choice('unit',t('unit'),['day','shift','job','month'].map(k=>[k,t(`unit_${k}`)]))}
 {['pay','hours','fee'].map(key=><label className="field" key={key}><span>{t(key)} {o[key]===null&&`· ${t('unknown')}`}</span><input aria-invalid={!!res.errors[key]} aria-describedby={`offer-${key}-error`} type="number" min={key==='fee'?0:1} max={key==='hours'?24:10000000} step="any" value={o[key]??''} onChange={e=>edit(key,e.target.value)}/>{res.errors[key]&&<small id={`offer-${key}-error`} className="tool-error">{t(res.errors[key])}</small>}{key!=='pay'&&<button className="link" onClick={()=>edit(key,null)}>{t('unknown')}</button>}</label>)}
 {choice('payday',t('payday'),['unknown','daily','weekly','end','monthly'].map(k=>[k,t(k)]))}
 {['address','written','verified'].map(k=><div key={k}>{choice(k,t(k),yesno)}</div>)}
 </div><p className="tool-note">{say('Sample benchmark, not a legal minimum. Your answers are assumptions, not employer verification.','नमूना दर, कानूनी न्यूनतम नहीं। आपके जवाब अनुमान हैं, नियोक्ता सत्यापन नहीं।')}</p>
 <div className={`verdict tone-${res.verdict.tone}`} aria-live="polite"><p className="verdict-word">{lang==='hi'?res.verdict.hi:res.verdict.word}</p><p>{lang==='hi'?res.verdict.lineHi:res.verdict.line}</p><ul className="weights">{res.tokens.map(x=><li className={x.side} key={x.id}>{lang==='hi'?x.hi:x.label}</li>)}</ul></div>
 <Listen lines={[[[lang==='hi'?res.verdict.hi:res.verdict.word,...res.tokens.map(x=>lang==='hi'?x.hi:x.label)].join('. '),lang==='hi'?'hi-IN':'en-IN']]}/><SaveStatus status={status}/><ClearDraft onClear={()=>offerStore.clear()}/>
 </div>
}
