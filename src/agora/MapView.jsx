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
 state.current={...state.current,...props,jobs:props.jobs.map(j=>({...j,open:true})),sent:new Set(Object.keys(props.interest)),me:props.origin,hover:state.current?.hover??null}
 useEffect(()=>{
  let map,dead=false,timer,layer,observer
  const fail=()=>{if(!dead){state.current.active=false;setStatus('failed')}}
  try {
   map=new maplibregl.Map({container:box.current,style:'https://tiles.openfreemap.org/styles/liberty',center:props.origin,zoom:14,pitch:50,bearing:-20,cooperativeGestures:true,attributionControl:{compact:true},maxPitch:65})
   mapRef.current=map
   timer=setTimeout(fail,12000)
   map.addControl(new maplibregl.NavigationControl(),'top-right')
   map.on('error',()=>{if(!map.isStyleLoaded())fail()})
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
     clearTimeout(timer);state.current.active=!document.hidden;setStatus('ready');if(state.current.jobs.length){const bounds=new maplibregl.LngLatBounds();state.current.jobs.forEach(j=>bounds.extend(j.lngLat));map.fitBounds(bounds,{padding:65,maxZoom:14.7,duration:0,pitch:52,bearing:-20})}
    }catch{fail()}
   })
   const pick=point=>{
    const height=layer?.screenHeight()??0;let closest=null,dist=30
    for(const j of state.current.jobs){const base=map.project(j.lngLat),vy=-height*.85;const t=Math.max(0,Math.min(1,((point.y-base.y)*vy)/(vy*vy||1)));const d=Math.hypot(point.x-base.x,point.y-(base.y+vy*t))-(t>.75?14:0);if(d<dist){dist=d;closest=j.id}}
    return closest
   }
   map.on('mousemove',e=>{state.current.hover=pick(e.point);map.getCanvas().style.cursor=state.current.hover?'pointer':'';map.triggerRepaint()})
   map.on('click',e=>{const id=pick(e.point);if(id)state.current.onSelect(id)})
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
 useEffect(()=>{const j=props.jobs.find(j=>j.id===props.selected);if(j)mapRef.current?.jumpTo({center:j.lngLat,zoom:Math.max(14,mapRef.current.getZoom())})},[props.selected])
 return <div className="map-shell"><div ref={box} className="map-surface" role="region" aria-label={t('mapTitle')}/>{status!=='ready'&&<div className="map-status" role="status"><p>{t(status==='failed'?'mapFailed':'mapLoading')}</p>{status==='failed'&&<button onClick={props.onRetry}>{t('retry')}</button>}</div>}</div>
}
