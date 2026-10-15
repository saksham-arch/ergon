import {useEffect,useRef,useState} from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import {greekify} from '../agora/style.js'
maplibregl.setWorkerUrl(workerUrl)
export default function LocationPicker({value,onChange}){
 const box=useRef(),map=useRef(),marker=useRef(),change=useRef(onChange),[status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0)
 change.current=onChange
 useEffect(()=>{let dead=false;const m=new maplibregl.Map({container:box.current,style:'https://tiles.openfreemap.org/styles/liberty',center:value,zoom:15,attributionControl:{compact:true}});map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');const pin=new maplibregl.Marker({color:'#a55a2c',draggable:true}).setLngLat(value).addTo(m);marker.current=pin
 const select=p=>{pin.setLngLat(p);change.current([p.lng,p.lat])};m.on('click',e=>select(e.lngLat));pin.on('dragend',()=>select(pin.getLngLat()));m.on('load',()=>{if(!dead){greekify(m);setStatus('ready')}});m.on('error',()=>{if(!dead&&!m.isStyleLoaded())setStatus('failed')});const timer=setTimeout(()=>{if(!dead&&!m.isStyleLoaded())setStatus('failed')},12000)
 return()=>{dead=true;clearTimeout(timer);pin.remove();m.remove();map.current=null}
 },[attempt])
 useEffect(()=>{marker.current?.setLngLat(value);if(map.current&&!map.current.getBounds().contains(value))map.current.easeTo({center:value,duration:400})},[value])
 return <div className="location-picker"><div ref={box} className="location-picker-map" role="region" aria-label="Choose work location on map"/>{status==='failed'&&<div className="picker-status"><p>Map could not load.</p><button type="button" onClick={()=>{setStatus('loading');setAttempt(n=>n+1)}}>Retry map</button></div>}<div className="picker-caption"><span>{status==='loading'?'Loading map…':'Choose the meeting point on the map'}</span><button type="button" onClick={()=>{const p=map.current?.getCenter();if(p){marker.current?.setLngLat(p);change.current([p.lng,p.lat])}}}>Use map centre</button></div></div>
}
