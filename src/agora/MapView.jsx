import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LANDMARKS } from './landmarks.js'
import { offerStore } from '../domain/offers.js'
import { weighOffer } from '../themis/rules.js'
import { createFlowerLayer } from './flowers.js'
import { greekify } from './style.js'
import { tradeOf } from '../hermes/jobs.js'
import { useI18n } from '../i18n/index.jsx'
maplibregl.setWorkerUrl(workerUrl)
function ring([lng,lat],km){const coordinates=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [lng+Math.cos(a)*km/(111.32*Math.cos(lat*Math.PI/180)),lat+Math.sin(a)*km/110.57]});return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[coordinates]}}}
function sidebarPadding(){
 const rail=document.querySelector('.map-sidebar')?.getBoundingClientRect()
 return window.innerWidth>760?{left:(rail?.right??354)+24,right:20,top:20,bottom:20}:{left:10,right:10,top:20,bottom:(rail?.height??300)+20}
}
export default function MapView(props){
 const {t,lang}=useI18n(), box=useRef(),mapRef=useRef(),markerRef=useRef(),layerRef=useRef(),previousInterest=useRef(props.interest),state=useRef(),[status,setStatus]=useState('loading')
 state.current={...state.current,...props,jobs:props.jobs.map(j=>({...j,open:true})),sent:new Set(Object.keys(props.interest)),me:props.origin,landmarkPositions:state.current?.landmarkPositions??{},hover:state.current?.hover??null}
 useEffect(()=>{
  let map,dead=false,timer,layer,observer
  const landmarks=[]
  setStatus('loading')
  const fail=()=>{if(!dead){state.current.active=false;setStatus('failed')}}
  try {
   map=new maplibregl.Map({container:box.current,style:'https://tiles.openfreemap.org/styles/liberty',center:props.origin,zoom:15.6,pitch:50,bearing:-20,cooperativeGestures:false,attributionControl:{compact:true},maxPitch:65})
   mapRef.current=map
   timer=setTimeout(fail,12000)
   map.addControl(new maplibregl.NavigationControl(),'top-right')
   map.on('error',()=>{if(!map.isStyleLoaded())fail()})
   map.getCanvas().addEventListener('webglcontextlost',fail)
   map.on('load',()=>{
    if(dead)return
    try {
     map.setProjection({type:'mercator'})
     greekify(map)
     map.addSource('reach',{type:'geojson',data:ring(state.current.origin,state.current.km)})
     map.addLayer({id:'reach-line',type:'line',source:'reach',paint:{'line-color':'#8c451e','line-width':2,'line-dasharray':[2,2]}})
     layer=createFlowerLayer({read:()=>({...state.current,weights:weighOffer(offerStore.getSnapshot().data.offer)}),colorOf:id=>tradeOf(id).color});map.addLayer(layer);layerRef.current=layer
     for(const landmark of LANDMARKS){
      const button=document.createElement('button');button.type='button';button.className='map-landmark';button.textContent=''
      button.setAttribute('aria-label',`${lang==='hi'?landmark.hi:landmark.name} · ${lang==='hi'?'स्थान देखें':'View place'}`)
      let draggedAt=0
      const marker=new maplibregl.Marker({element:button,anchor:'bottom',offset:[0,-10],draggable:true}).setLngLat(state.current.landmarkPositions[landmark.id]??landmark.lngLat).addTo(map)
      const movedPlace=()=>({...landmark,lngLat:state.current.landmarkPositions[landmark.id]??landmark.lngLat,moved:!!state.current.landmarkPositions[landmark.id]})
      button.addEventListener('click',e=>{e.stopPropagation();if(performance.now()-draggedAt>250)state.current.onPlaceSelect({...movedPlace(),preserveCamera:true})})
      button.addEventListener('dblclick',e=>{
       e.preventDefault();e.stopPropagation()
       if(performance.now()-draggedAt<=250)return
       state.current.onPlaceSelect({...movedPlace(),focusZoom:17})
      })
      marker.on('dragstart',()=>{button.style.cursor='grabbing'})
      marker.on('drag',()=>{if(map.isZooming()){marker.setLngLat(state.current.landmarkPositions[landmark.id]??landmark.lngLat);return}const p=marker.getLngLat();state.current.landmarkPositions[landmark.id]=[p.lng,p.lat];map.triggerRepaint()})
      marker.on('dragend',()=>{draggedAt=performance.now();button.style.cursor='grab'})
      landmarks.push(marker)
     }
     const resizeTargets=()=>{
      const height=Math.max(32,Math.min(260,(layer?.screenHeight()??50)*1.1))
      for(const marker of landmarks){const el=marker.getElement();el.style.width=`${Math.max(32,height*.65)}px`;el.style.height=`${height}px`;el.style.minHeight='0';marker.setOffset([0,0])}
     }
     map.on('zoomstart',()=>landmarks.forEach(marker=>marker.setDraggable(false)))
     map.on('zoomend',()=>{landmarks.forEach(marker=>marker.setDraggable(true));resizeTargets()})
     map.on('zoom',resizeTargets);map.on('pitch',resizeTargets);resizeTargets()
     const el=document.createElement('div');el.className='map-origin';el.setAttribute('aria-hidden','true')
     markerRef.current=new maplibregl.Marker({element:el,draggable:true}).setLngLat(state.current.origin).addTo(map)
     markerRef.current.on('dragend',()=>{const p=markerRef.current.getLngLat();state.current.onMove([p.lng,p.lat])})
     clearTimeout(timer);state.current.active=!document.hidden&&!!state.current.inView;setStatus('ready');map.jumpTo({center:state.current.origin,zoom:15.6,pitch:52,bearing:-20,padding:sidebarPadding()})
    }catch{fail()}
   })
   const pick=point=>{
    const height=layer?.screenHeight()??0;let closest=null,dist=16
    for(const j of state.current.jobs){const base=map.project(j.lngLat),vy=-height*.85;const t=Math.max(0,Math.min(1,((point.y-base.y)*vy)/(vy*vy||1)));const d=Math.hypot(point.x-base.x,point.y-(base.y+vy*t))-(t>.75?7:0);if(d<dist){dist=d;closest=j.id}}
    return closest
   }
   map.on('mousemove',e=>{state.current.hover=pick(e.point);map.getCanvas().style.cursor=state.current.hover?'pointer':'';map.triggerRepaint()})
   map.on('click',e=>{const id=pick(e.point);if(id)state.current.onSelect(id)})
   const visibility=()=>{state.current.active=!document.hidden&&state.current.inView; if(state.current.active)map.triggerRepaint()}
   observer=new IntersectionObserver(([entry])=>{state.current.inView=entry.isIntersecting;visibility()});observer.observe(box.current)
   document.addEventListener('visibilitychange',visibility)
   const unsubscribeOffer=offerStore.subscribe(()=>map.triggerRepaint())
   return()=>{dead=true;clearTimeout(timer);unsubscribeOffer();observer.disconnect();document.removeEventListener('visibilitychange',visibility);landmarks.forEach(m=>m.remove());map.remove();mapRef.current=null;layerRef.current=null}
  }catch{fail();map?.remove()}
  return()=>{dead=true;clearTimeout(timer)}
 },[lang])
 useEffect(()=>{
  const map=mapRef.current;if(!map)return
  markerRef.current?.setLngLat(props.origin);map.getSource('reach')?.setData(ring(props.origin,props.km));map.triggerRepaint()
 },[props.jobs,props.origin,props.km,props.selected,status])
 useEffect(()=>{
  for(const [id,interested] of Object.entries(props.interest))if(interested&&!previousInterest.current[id]){
   const job=props.jobs.find(j=>String(j.id)===id);if(job)layerRef.current?.send(props.origin,job)
  }
  previousInterest.current=props.interest
 },[props.interest])
 useEffect(()=>{mapRef.current?.jumpTo({center:props.origin})},[props.origin])
 useEffect(()=>{if(props.selectedPlace&&!props.selectedPlace.preserveCamera)mapRef.current?.easeTo({center:props.selectedPlace.lngLat,zoom:props.selectedPlace.focusZoom??15,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:550,padding:sidebarPadding()})},[props.selectedPlace,status])
 useEffect(()=>{const j=props.jobs.find(j=>j.id===props.selected);if(j)mapRef.current?.jumpTo({center:j.lngLat,padding:sidebarPadding(),zoom:Math.max(14,mapRef.current.getZoom())})},[props.selected])
 return <div className="map-shell"><div ref={box} className="map-surface" role="region" aria-label={t('mapTitle')}/>{status!=='ready'&&<div className="map-status" role="status"><p>{t(status==='failed'?'mapFailed':'mapLoading')}</p>{status==='failed'&&<button onClick={props.onRetry}>{t('retry')}</button>}</div>}</div>
}
