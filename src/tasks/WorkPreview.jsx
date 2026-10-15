import {useStore} from '../domain/storage.js'
import {jobStore,selectJobs,activeHold,dateLabel} from '../domain/jobs.js'
import {useI18n} from '../i18n/index.jsx'
import {money} from '../hermes/jobs.js'
export default function WorkPreview(){
 const {t,lang}=useI18n(),[s,set]=useStore(jobStore),jobs=selectJobs(s).slice(0,3),hold=activeHold(s.hold)
 return <div className="tool"><p className="tool-note">{t('demoDate')}</p><div className="seg" role="group" aria-label={t('when')}>{['all','day','week','long'].map(k=><button key={k} aria-pressed={s.when===k} onClick={()=>set(x=>({...x,when:k,selected:null}))}>{t(k==='all'?'any':k)}</button>)}</div><ul className="jobs">{jobs.map(j=><li key={j.id}><div className="job-top"><span className="job-pay">{money(j.pay)} <small>/ {t(`unit_${j.unit}`)}</small></span><span>{j.dist.toFixed(1)} {t('km')}</span></div><p className="job-what">{lang==='hi'?j.titleHi:j.title}</p><p className="job-meta">{dateLabel(j.startDate,lang)} · {t('payday')}: {t(j.payday??'unknown')}</p><button className="btn btn-ghost" onClick={()=>{set(x=>({...x,selected:j.id}));location.hash='#map'}}>{t('viewOffer')} →</button>{s.interest[j.id]&&<p>{t('savedInterest')}</p>}{hold?.id===j.id&&<p>{t('holdNotice')}</p>}</li>)}</ul>{!jobs.length&&<p>{t('empty')}</p>}<p className="tool-note">{t('distance')} · {t('sampleHistory')}</p><a className="btn btn-clay" href="#map">{t('work')} · {t('map')} →</a></div>
}
