import { lazy, Suspense, useEffect, useState } from 'react'
import { I18nProvider, useI18n } from './i18n/index.jsx'
import SceneBoundary from './ui/SceneBoundary.jsx'
const World = lazy(() => import('./Story.jsx'))
const MarketplacePages = lazy(() => import('./tasks/MarketplacePages.jsx'))
const Work = lazy(() => import('./tasks/Work.jsx'))
import './tasks/integrated.css'
function Site(){
 const [route,setRoute]=useState(()=>location.hash)
 const map=route==='#map',market=route==='#post-work'||route==='#profiles'||route.startsWith('#book-work/')
 const {lang,setLang}=useI18n()
 useEffect(()=>{const route=()=>setRoute(location.hash);window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route)},[])
 useEffect(()=>{if(map)window.scrollTo(0,0)},[map])
 return <>{!map&&!market&&<label className={`site-language ${map?'map-language':''}`}><span className="sr-only">Language</span><select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value)}><option value="en">EN</option><option value="hi">हिन्दी</option></select></label>}<Suspense fallback={<div className="world-loading">Ergon · Preparing the world…</div>}>
 {market?<MarketplacePages route={route}/>:map?<main className="map-page"><Work/></main>:<SceneBoundary fallback={<div className="world-loading"><p>The 3D scene could not start.</p><a href="#map">Find work in the agora →</a><button onClick={()=>location.reload()}>Retry the world</button></div>}><World/></SceneBoundary>}
 </Suspense></>
}
export default function App(){return <I18nProvider><Site/></I18nProvider>}
