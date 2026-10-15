export const DESTINATIONS={work:'#work',craft:'#craft',trust:'#trust',rights:'#rights',map:'#map'}
export function navigate(key){
 const hash=DESTINATIONS[key]||'#top'
 if(location.hash!==hash)location.hash=hash
 else window.dispatchEvent(new HashChangeEvent('hashchange'))
 requestAnimationFrame(()=>document.getElementById(hash.slice(1))?.scrollIntoView({behavior:'instant'}))
}
