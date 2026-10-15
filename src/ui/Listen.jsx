import {useEffect,useRef,useState} from 'react'
import {useI18n} from '../i18n/index.jsx'
let stopCurrent=()=>{}
export function speak(lines,onFinish=()=>{}){
 stopCurrent();const synth=window.speechSynthesis;if(!synth){onFinish('unavailable');return()=>{}}
 synth.cancel();let ended=false
 const stop=()=>{if(ended)return;ended=true;synth.cancel();onFinish()};stopCurrent=stop
 const voices=synth.getVoices();let left=lines.length
 for(const [text,lang] of lines){const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.95;const voice=voices.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));if(voice)utterance.voice=voice;utterance.onend=()=>{if(--left===0&&!ended){ended=true;onFinish()}};utterance.onerror=()=>{if(!ended){ended=true;synth.cancel();onFinish('error')}};synth.speak(utterance)}
 return stop
}
export default function Listen({lines,label,className=''}){
 const {t,lang}=useI18n(),[on,setOn]=useState(false),[error,setError]=useState(''),stop=useRef(()=>{}),[voices,setVoices]=useState(()=>window.speechSynthesis?.getVoices()??[])
 useEffect(()=>{const synth=window.speechSynthesis;const update=()=>setVoices(synth?.getVoices()??[]);synth?.addEventListener('voiceschanged',update);const end=()=>stop.current();window.addEventListener('hashchange',end);return()=>{stop.current();synth?.removeEventListener('voiceschanged',update);window.removeEventListener('hashchange',end)}},[])
 useEffect(()=>{stop.current()},[lang])
 if(!window.speechSynthesis)return <span className="tool-note">{t('speechUnavailable')}</span>
 const play=()=>{if(on){stop.current();return}const text=typeof lines==='function'?lines():lines;if(text.some(([,l])=>l.startsWith('hi'))&&!voices.some(v=>v.lang.toLowerCase().startsWith('hi'))){setError(t('voiceUnavailable'));return}setError('');setOn(true);stop.current=speak(text,e=>{setOn(false);if(e)setError(t('speechError'))})}
 return <><button type="button" className={`listen ${on?'on':''} ${className}`} aria-pressed={on} onClick={play}><span className="listen-bars" aria-hidden="true"><i/><i/><i/></span>{on?(lang==='hi'?'रोकें':'Stop'):(label??t('listen'))}</button>{error&&<p className="tool-note" role="status">{error}</p>}</>
}
