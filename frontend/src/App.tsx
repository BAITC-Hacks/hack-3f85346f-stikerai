import { useCallback, useEffect, useMemo, useState } from 'react'
import { CityLiveView } from './CityLiveView'
import { PublicSignalsPanel } from './PublicSignalsPanel'

type District = {
  id: string
  code: string
  name: string
  population_share: number
  [metric: string]: string | number
}

type Initiative = {
  id: string
  code: string
  direction: string
  scope: 'district' | 'city'
  title: string
  cost: number
  lag_quarters: number
  [metric: string]: string | number
}

type DatasetBundle = {
  dataset: { id: string; version: string; name: string; initial_budget: number; horizon_quarters: number }
  districts: District[]
  initiatives: Initiative[]
  baseline_score: number
}

type Selection = { districtId: string | null }
type Preview = {
  baseline_score: number
  projected_score: number
  districts?: { district_id: string; district_name: string; projected_score: number; projected_indicators: Record<string, number> }[]
  remaining_budget?: number
  spent_budget?: number
  [key: string]: unknown
}
type Evaluation = {
  baseline_score: number
  final_score: number
  summary: string
  strengths: string[]
  risks: string[]
  consequences: string[]
  recommendations: string[]
  ai_model: string
  prompt_version: string
  districts: { district_id: string; [metric: string]: string | number }[]
}

const directionNames: Record<string, string> = {
  transport: 'Транспорт', ecology: 'Экология', social: 'Социальная сфера',
  safety: 'Безопасность', services: 'Городские сервисы',
}
const metricNames: Record<string, string> = {
  t1: 'Разгрузка дорог', t2: 'Доступность общественного транспорта', e1: 'Озеленение', e2: 'Качество воздуха',
  s1: 'Школы и детсады', s2: 'Первичная медицина', b1: 'Безопасность улиц', b2: 'Безопасность движения',
  c1: 'Надёжность ЖКХ', c2: 'Скорость решения обращений',
}
const metricKeys = Object.keys(metricNames)
const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const scoreFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  const body = await response.json().catch(() => ({})) as { detail?: string }
  if (!response.ok) throw new Error(body.detail ?? `Ошибка API (${response.status})`)
  return body as T
}

export default function App() {
  const [bundle, setBundle] = useState<DatasetBundle>()
  const [scenarioId, setScenarioId] = useState<string>()
  const [selected, setSelected] = useState<Record<string, Selection>>({})
  const [preview, setPreview] = useState<Preview>()
  const [evaluation, setEvaluation] = useState<Evaluation>()
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await request<DatasetBundle>('/api/datasets/current')
        if (!active) return
        setBundle(data)
        const scenario = await request<{ id: string }>('/api/scenarios', {
          method: 'POST', body: JSON.stringify({ dataset_id: data.dataset.id, team_name: 'Команда симулятора' }),
        })
        if (active) setScenarioId(scenario.id)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить датасет')
      }
    })()
    return () => { active = false }
  }, [])

  const choices = useMemo(() => Object.entries(selected).map(([initiative_id, value]) => ({
    initiative_id, district_id: value.districtId,
  })), [selected])
  const spent = useMemo(() => bundle?.initiatives.reduce((sum, item) => sum + (selected[item.id] ? item.cost : 0), 0) ?? 0, [bundle, selected])
  const directionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of bundle?.initiatives ?? []) if (selected[item.id]) counts[item.direction] = (counts[item.direction] ?? 0) + 1
    return counts
  }, [bundle, selected])

  const toggle = (initiative: Initiative) => {
    setError('')
    if (submitted) return
    setEvaluation(undefined)
    setPreview(undefined)
    setSelected((current) => {
      if (current[initiative.id]) {
        const next = { ...current }; delete next[initiative.id]; return next
      }
      if (Object.keys(current).length >= 5) { setError('Можно выбрать ровно пять разных мероприятий.'); return current }
      if ((directionCounts[initiative.direction] ?? 0) >= 2) {
        setError(`В направлении «${directionNames[initiative.direction] ?? initiative.direction}» разрешено не больше двух мероприятий.`)
        return current
      }
      const districtId = initiative.scope === 'district' ? bundle?.districts[0]?.id ?? null : null
      return { ...current, [initiative.id]: { districtId } }
    })
  }

  const chooseDistrict = (initiativeId: string, districtId: string) => {
    if (submitted) return
    setSelected((current) => ({ ...current, [initiativeId]: { districtId } }))
    setPreview(undefined)
    setEvaluation(undefined)
  }

  const savePlan = useCallback(async () => {
    if (!scenarioId) throw new Error('Сценарий ещё не создан')
    if (choices.length !== 5) throw new Error(`Выберите пять мероприятий. Сейчас выбрано: ${choices.length}.`)
    if (!bundle || spent > bundle.dataset.initial_budget) throw new Error('Превышен общий бюджет')
    await request(`/api/scenarios/${scenarioId}/decisions`, { method: 'PUT', body: JSON.stringify({ decisions: choices }) })
  }, [scenarioId, choices, bundle, spent])

  const calculatePreview = async () => {
    setBusy(true); setError('')
    try {
      await savePlan()
      setPreview(await request<Preview>(`/api/scenarios/${scenarioId}/preview`, { method: 'POST', body: JSON.stringify({ decisions: choices }) }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось рассчитать сценарий')
    } finally { setBusy(false) }
  }

  const analyze = async () => {
    setBusy(true); setError('')
    try {
      if (!submitted) {
        await savePlan()
        setPreview(await request<Preview>(`/api/scenarios/${scenarioId}/preview`, { method: 'POST', body: JSON.stringify({ decisions: choices }) }))
        await request(`/api/scenarios/${scenarioId}/submit`, { method: 'POST' })
        setSubmitted(true)
      }
      setEvaluation(await request<Evaluation>(`/api/scenarios/${scenarioId}/evaluate`, { method: 'POST' }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось получить анализ сценария')
    } finally { setBusy(false) }
  }

  if (!bundle && !error) return <main className="app-shell"><div className="loading-card">Подключаем датасет симуляции…</div></main>
  if (!bundle) return <main className="app-shell"><div className="loading-card error-card"><h1>Симуляция недоступна</h1><p>{error}</p><p>Запустите Compose и убедитесь, что миграции и демонстрационный датасет завершились.</p></div></main>

  const activeScore = evaluation?.final_score ?? preview?.projected_score
  const districtResults = evaluation?.districts ?? preview?.districts ?? []
  const resultByDistrict = new Map(districtResults.map((row) => [String(row.district_id ?? ''), row]))

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div>
        <div className="topbar-meta"><span className="live-dot" /> ДЕМО-СИМУЛЯЦИЯ <span className="separator">/</span> ASTANA SYNTHETIC DATASET</div>
        <span className="profile-button" aria-label="Пять решений">5</span>
      </header>
      <main className="dashboard sim-dashboard">
        <section className="intro-row">
          <div><p className="eyebrow">Аким на 5 часов · сценарное планирование</p><h1>Пять решений.<br /><em>Один город.</em></h1><p className="intro-copy">Соберите портфель из пяти мероприятий. Система проверит бюджет и правила, затем детерминированно рассчитает итоговый балл. AI объяснит компромиссы, не меняя расчёт.</p></div>
          <div className="session-card"><span className="card-label">ДАТАСЕТ</span><strong>{bundle.dataset.version}</strong><span>{bundle.dataset.horizon_quarters} кварталов · {bundle.districts.length} условных районов</span><div className="mini-progress"><i style={{ width: `${Math.min(100, choices.length * 20)}%` }} /></div><small>Выбрано {choices.length} из 5 мероприятий</small></div>
        </section>

        <section className="metrics-grid sim-metrics" aria-label="Показатели сценария">
          <article className="metric-card budget-card"><div className="metric-heading"><span className="card-label">ОБЩИЙ БЮДЖЕТ</span><span className="metric-icon">◈</span></div><strong>{numberFormat.format(bundle.dataset.initial_budget)} <small>ед.</small></strong><div className="budget-line"><span>Потрачено {numberFormat.format(spent)}</span><span>{numberFormat.format(bundle.dataset.initial_budget - spent)} ед. осталось</span></div><div className="budget-progress"><i style={{ width: `${Math.min(100, spent / bundle.dataset.initial_budget * 100)}%` }} /></div></article>
          <article className="metric-card score-card"><div className="metric-heading"><span className="card-label">ASTANA QUALITY OF LIFE</span><span className="score-change">из datadoc.md</span></div><div className="score-value"><strong>{activeScore === undefined ? scoreFormat.format(bundle.baseline_score) : scoreFormat.format(activeScore)}</strong><span>/ 100</span></div><div className="score-foot"><span className="score-ring">{activeScore === undefined ? '●' : activeScore >= bundle.baseline_score ? '↑' : '↓'}</span> {evaluation ? 'Итог рассчитан · AI анализ готов' : preview ? `Изменение ${scoreFormat.format(activeScore! - bundle.baseline_score)} к базовой линии` : 'Базовая линия · выберите пять мероприятий'}</div></article>
          <article className="metric-card signal-card"><div className="metric-heading"><span className="card-label">ПРАВИЛА МОДЕЛИ</span><span className="signal-live">LIVE API</span></div><strong>5 разных мероприятий</strong><p>До двух в каждом направлении · бюджет и конфликты проверяет backend.</p></article>
        </section>

        <div className="content-grid sim-content-grid">
          <section className="decisions-panel">
            <div className="section-heading"><div><span className="section-kicker">КАТАЛОГ datadoc.md</span><h2>Портфель решений</h2></div><span className="lock-note">◉ БЮДЖЕТ ПРОВЕРЯЕТСЯ</span></div>
            <div className="initiative-list">
              {bundle.initiatives.map((item) => {
                const isSelected = Boolean(selected[item.id])
                return <article className={`initiative-card ${isSelected ? 'initiative-selected' : ''}`} key={item.id}>
                  <label className="initiative-check"><input type="checkbox" checked={isSelected} onChange={() => toggle(item)} disabled={busy || submitted} /><span className="initiative-code">{item.code}</span><span className="initiative-title"><b>{item.title}</b><small>{directionNames[item.direction] ?? item.direction} · {item.scope === 'city' ? 'весь город' : 'один район'} · лаг {item.lag_quarters} кв.</small></span><span className="initiative-cost">{numberFormat.format(item.cost)} ед.</span></label>
                  <div className="initiative-effects">{metricKeys.filter((key) => Number(item[key] ?? 0) !== 0).map((key) => <span key={key}>{metricNames[key]} <b>{Number(item[key]) > 0 ? '+' : ''}{numberFormat.format(Number(item[key]))}</b></span>)}</div>
                  {isSelected && item.scope === 'district' && <label className="district-target">Район<select value={selected[item.id].districtId ?? ''} onChange={(event) => chooseDistrict(item.id, event.target.value)} disabled={busy || submitted}>{bundle.districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>}
                </article>
              })}
            </div>
            <div className="sim-actions"><button type="button" className="secondary-action" onClick={() => void calculatePreview()} disabled={busy || submitted || choices.length !== 5}>{busy ? 'Считаем…' : 'Рассчитать сценарий'}</button><button type="button" className="primary-action" onClick={() => void analyze()} disabled={busy || choices.length !== 5 || Boolean(evaluation)}>{busy ? 'Анализируем…' : submitted ? 'Повторить AI-анализ' : 'Получить AI-анализ'} <span>→</span></button></div>
            {error && <p className="sim-error" role="alert">{error}</p>}
            <p className="action-note">AI получает уже рассчитанные числа и объясняет результат. Формулу и баллы AI не меняет.</p>
          </section>

          <aside className="side-panel sim-side-panel">
            <div className="section-heading compact"><div><span className="section-kicker">ДАТАДОК</span><h2>Пять районов</h2></div></div>
            <p className="district-disclaimer">Синтетические профили из datadoc.md · это не измерения текущих границ города.</p>
            <div className="district-model-list">{bundle.districts.map((district) => {
              const result = resultByDistrict.get(district.id)
              const previewDistrict = preview?.districts?.find((row) => row.district_id === district.id)
              const score = previewDistrict?.projected_score
              const baseline = Object.fromEntries(metricKeys.map((key) => [key, Number(district[key] ?? 0)]))
              const indicatorResult = evaluation && result
                ? Object.fromEntries(metricKeys.map((key) => [key, Number((result as Record<string, number | string>)[key] ?? 0)]))
                : previewDistrict?.projected_indicators
              return <details className="district-model-card" key={district.id}>
                <summary><span className="district-avatar mint">{district.name.slice(0, 1)}</span><span className="district-model-name"><b>{district.name}</b><small>Доля населения {numberFormat.format(Number(district.population_share) * 100)}%</small></span><strong>{score === undefined ? '—' : scoreFormat.format(score)}</strong></summary>
                <div className="district-indicators">{metricKeys.map((key) => <div key={key}><span>{metricNames[key]}</span><b>{numberFormat.format(Number(indicatorResult?.[key] ?? baseline[key]))}</b></div>)}</div>
              </details>
            })}</div>
            {evaluation && <div className="ai-result-card"><span className="section-kicker">АНАЛИЗ · {evaluation.ai_model}</span><h3>{evaluation.summary}</h3><ResultList title="Сильные стороны" values={evaluation.strengths} /><ResultList title="Риски" values={evaluation.risks} /><ResultList title="Последствия" values={evaluation.consequences} /><ResultList title="Рекомендации" values={evaluation.recommendations} /><small>Версия промпта: {evaluation.prompt_version} · Балл рассчитан deterministic backend.</small></div>}
          </aside>
        </div>

        <PublicSignalsPanel />
        <CityLiveView />
      </main>
      <footer className="footer"><span>STIKERAI · ГОРОДСКАЯ ЛАБОРАТОРИЯ</span><span>Синтетический датасет · scoring version {bundle.dataset.version}</span></footer>
    </div>
  )
}

function ResultList({ title, values }: { title: string; values: string[] }) {
  return <div className="ai-result-list"><b>{title}</b><ul>{values.map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ul></div>
}
