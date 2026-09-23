import { useSyncExternalStore } from 'react'
import { kazakh } from './locales/kk'

export type Language = 'ru' | 'kk'
const storageKey = 'stikerai.language'
const listeners = new Set<() => void>()
function readLanguage(): Language {
  try { return localStorage.getItem(storageKey) === 'kk' ? 'kk' : 'ru' }
  catch { return 'ru' }
}
let language: Language = readLanguage()
const russian: Record<string, string> = {
  'QUALITY OF LIFE': 'КАЧЕСТВО ЖИЗНИ',
  'ASTANA QUALITY OF LIFE': 'КАЧЕСТВО ЖИЗНИ АСТАНЫ',
}
export const locale = () => language === 'kk' ? 'kk-KZ' : 'ru-RU'

function updateDocument() {
  if (window.location.pathname.replace(/\/+$/, '') !== '/simulator') {
    document.documentElement.lang = 'en'
    return
  }
  document.documentElement.lang = language
  document.title = language === 'kk' ? 'StikerAI — 5 сағатқа әкім' : 'StikerAI — Аким на 5 часов'
}
updateDocument()

export function setLanguage(next: Language) {
  language = next
  try { localStorage.setItem(storageKey, next) } catch { /* Selection still works in memory. */ }
  updateDocument()
  listeners.forEach(listener => listener())
}
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) {
    language = readLanguage()
    updateDocument()
    listeners.forEach(listener => listener())
  }
})
export function useLanguage() {
  return useSyncExternalStore(callback => {
    listeners.add(callback)
    return () => { listeners.delete(callback) }
  }, () => language, () => 'ru' as Language)
}

// Russian source strings are the default catalog. Unknown source content stays intact.
export function t(value: string | undefined | null): string {
  const source = value ?? ''
  if (language === 'ru') return Object.hasOwn(russian, source) ? russian[source] : source
  if (Object.hasOwn(kazakh, source)) return kazakh[source]
  // Some source labels are assembled before rendering (e.g. coverage counts).
  for (const [key, translated] of Object.entries(kazakh)) {
    if (!key.includes('{0}')) continue
    const pattern = key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)')
    const match = source.match(new RegExp(`^${pattern}$`))
    if (match) return translated.replace(/\{(\d+)\}/g, (_, index) => match[Number(index) + 1])
  }
  return source
}

// Interpolation is kept separate from wording so both languages may reorder values.
export function tr(parts: TemplateStringsArray, ...values: unknown[]): string {
  const key = parts.reduce((result, part, index) => result + (index ? `{${index - 1}}` : '') + part, '')
  return t(key).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)]))
}

export function LanguageSwitcher() {
  const selected = useLanguage()
  return <div className="language-switcher" role="group" aria-label={t('Язык интерфейса')}>
    <button type="button" lang="ru" aria-pressed={selected === 'ru'} onClick={() => setLanguage('ru')}>Русский</button>
    <button type="button" lang="kk" aria-pressed={selected === 'kk'} onClick={() => setLanguage('kk')}>Қазақша</button>
  </div>
}
