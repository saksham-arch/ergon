import { createContext, useContext, useEffect } from 'react'
import { createLocalStore, useStore } from '../domain/storage.js'
import { messages } from './messages.js'
const preferences = createLocalStore('language', 'en', x => ['en','hi'].includes(x))
const Context = createContext(null)
export function I18nProvider({children}) {
  const [lang, setLang] = useStore(preferences)
  useEffect(() => { document.documentElement.lang = lang; window.speechSynthesis?.cancel() }, [lang])
  const t = (key) => messages[key]?.[lang === 'hi' ? 1 : 0] ?? key
  const pick = (value) => Array.isArray(value) ? value[lang === 'hi' ? 1 : 0] : value
  return <Context.Provider value={{lang,setLang,t,pick}}>{children}</Context.Provider>
}
export const useI18n = () => useContext(Context)
