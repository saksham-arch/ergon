import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createFlowerLayer } from './flowers.js'
import { greekify } from './style.js'
import { tradeOf } from '../hermes/jobs.js'
import { useI18n } from '../i18n/index.jsx'
maplibregl.setWorkerUrl(workerUrl)
function ring([lng,lat],km){const coordinates=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [lng+Math.cos(a)*km/(111.32*Math.cos(lat*Math.PI/180)),lat+Math.sin(a)*km/110.57]});return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[coordinates]}}}
export default function MapView(props){
 const {t}=useI18n(), box=useRef(),mapRef=useRef(),markerRef=useRef(),state=useRef(),[status,setStatus]=useState('loading')
 state.current={...state.current,...props,jobs:props.jobs.map(j=>({...j,open:true})),sent:new Set(Object.keys(props.interest)),me:props.origin,hover:null}
 useEffect(()=>{
  let map,dead=false,timer,layer,observer
  const fail=()=>{if(!dead)setStatus('failed')}
  try {
   map=new maplibregl.Map({container:box.current,style:'https://tiles.openfreemap.org/styles/liberty',center:props.origin,zoom:14,pitch:50,bearing:-20,cooperativeGestures:true,attributionControl:{compact:true},maxPitch:65})
   mapRef.current=map
   timer=setTimeout(fail,12000)
   map.addControl(new maplibregl.NavigationControl(),'top-right')
   map.on('error',fail)
   map.getCanvas().addEventListener('webglcontextlost',fail)
   map.on('load',()=>{
    if(dead)return
    try {
     greekify(map)
     map.addSource('reach',{type:'geojson',data:ring(state.current.origin,state.current.km)})
     map.addLayer({id:'reach-line',type:'line',source:'reach',paint:{'line-color':'#8c451e','line-width':2,'line-dasharray':[2,2]}})
     layer=createFlowerLayer({read:()=>state.current,colorOf:id=>tradeOf(id).color});map.addLayer(layer)
     const el=document.createElement('div');el.className='map-origin';el.setAttribute('aria-hidden','true')
     markerRef.current=new maplibregl.Marker({element:el,draggable:true}).setLngLat(state.current.origin).addTo(map)
     markerRef.current.on('dragend',()=>{const p=markerRef.current.getLngLat();state.current.onMove([p.lng,p.lat])})
     clearTimeout(timer);setStatus('ready')
    }catch{fail()}
   })
   map.on('click',e=>{
    const height=layer?.screenHeight()??0
    let closest=null,dist=32
    for(const j of state.current.jobs){const p=map.project(j.lngLat);const dy=p.y-e.point.y;const d=Math.hypot(e.point.x-p.x,Math.max(0,Math.abs(dy-height*.4)-height*.6));if(d<dist){dist=d;closest=j.id}}
    if(closest)state.current.onSelect(closest)
   })
   const visibility=()=>{state.current.active=!document.hidden&&state.current.inView; if(state.current.active)map.triggerRepaint()}
   observer=new IntersectionObserver(([entry])=>{state.current.inView=entry.isIntersecting;visibility()});observer.observe(box.current)
   document.addEventListener('visibilitychange',visibility)
   return()=>{dead=true;clearTimeout(timer);observer.disconnect();document.removeEventListener('visibilitychange',visibility);map.remove();mapRef.current=null}
  }catch{fail();map?.remove()}
  return()=>{dead=true;clearTimeout(timer)}
 },[])
 useEffect(()=>{
  const map=mapRef.current;if(!map)return
  markerRef.current?.setLngLat(props.origin);map.getSource('reach')?.setData(ring(props.origin,props.km));map.triggerRepaint()
 },[props.jobs,props.origin,props.km,props.selected,status])
 useEffect(()=>{mapRef.current?.jumpTo({center:props.origin})},[props.origin])
 return <div className="map-shell"><div ref={box} className="map-surface" role="region" aria-label={t('mapTitle')}/>{status!=='ready'&&<div className="map-status" role="status"><p>{t(status==='failed'?'mapFailed':'mapLoading')}</p>{status==='failed'&&<button onClick={props.onRetry}>{t('retry')}</button>}</div>}</div>
}
