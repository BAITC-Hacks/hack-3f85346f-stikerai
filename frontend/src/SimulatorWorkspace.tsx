import './styles.css'
import './futuristic.css'
import './futuristic-light.css'
import './city-orbit.css'
import { t, tr, locale } from './i18n'
import { PublicSignalsPanel } from './PublicSignalsPanel'
import { LanguageSwitcher, useLanguage } from './i18n'
import { CityLiveView } from './CityLiveView'
import AstanaMap from './AstanaMap'
import './civic-context.css'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import type { CalculationRead, CatalogRead, DecisionSelect, Direction, ExplanationRead, Metric, ScenarioRead } from './types/domain'

const directions: { id: Direction; label: string; icon: string }[] = [
  { id: 'transport', label: 'Транспорт', icon: '↗' },
  { id: 'ecology', label: 'Экология', icon: '✦' },
  { id: 'social', label: 'Соцсфера', icon: '◌' },
  { id: 'safety', label: 'Безопасность', icon: '⌁' },
  { id: 'services', label: 'Сервисы', icon: '□' },
]
const metrics: Record<Metric, string> = {
  t1: 'Разгрузка дорог', t2: 'Общественный транспорт', e1: 'Озеленение', e2: 'Качество воздуха',
  s1: 'Школы и детсады', s2: 'Первичная медицина', b1: 'Безопасность улиц', b2: 'Дорожная безопасность',
  c1: 'Надёжность ЖКХ', c2: 'Обращения жителей',
}
const fmt = (value: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)
const delta = (value: number) => `${value >= 0 ? '+' : '−'}${fmt(Math.abs(value))}`
const storage = {
  get(key: string) { try { return localStorage.getItem(key) } catch { return null } },
  set(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* Session still works without local storage. */ } },
  remove(key: string) { try { localStorage.removeItem(key) } catch { /* Optional persistence. */ } },
}
let sessionReady: Promise<unknown> | null = null
function initializeSession() {
  sessionReady ??= api('/session', 'POST').catch(error => { sessionReady = null; throw error })
  return sessionReady
}

function BaiterekMark() {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true">
      <path className="baiterek-trunk" d="M34 99L36 66L24 38M46 99L44 66L56 38M40 99V48" />
      <path className="baiterek-branches" d="M36 66L16 28M44 66L64 28M24 38Q40 57 56 38" />
      <circle className="baiterek-sphere" cx="40" cy="22" r="16" />
      <path className="baiterek-base" d="M24 100H56M29 94H51" />
    </svg>
  )
}

function AstanaIdentity() {
  return (
    <div className="astana-identity" aria-label={t("Астана · Аким на 5 часов")}>
      <div className="astana-symbol"><BaiterekMark /></div>
      <div><strong>{t("Астана")}</strong><small>{t("АКИМ НА 5 ЧАСОВ")}</small></div>
    </div>
  )
}

function BaiterekOrbit({ score }: { score: number | null }) {
  return (
    <div className="baiterek-orbit">
      <svg className="orbit-drawing" viewBox="0 0 360 340" aria-hidden="true">
        {directions.map((decision, index) => {
          const angle = (index * 72 - 90) * Math.PI / 180
          return <line key={decision.id} className="orbit-spoke" x1={180 + Math.cos(angle) * 110} y1={170 + Math.sin(angle) * 110} x2={180 + Math.cos(angle) * 148} y2={170 + Math.sin(angle) * 148} />
        })}
        <circle className="orbit-track" cx="180" cy="170" r="104" />
        <circle className="orbit-value" cx="180" cy="170" r="104" pathLength="100" strokeDasharray={`${score ?? 0} ${100 - (score ?? 0)}`} transform="rotate(-90 180 170)" />
      </svg>
      <div className="orbit-center" role="meter" aria-label={t("Качество жизни Астаны")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score ?? undefined}>
        <BaiterekMark />
        <div className="orbit-score"><strong>{score === null ? '—' : fmt(score)}</strong><span>/ 100</span></div>
        <small>{t("QUALITY OF LIFE")}</small>
      </div>
      <nav className="orbit-rays" aria-label={t("Пять направлений управления")}>
        {directions.map((decision, index) => <a className={`orbit-ray ray-${index + 1}`} href={`#direction-${decision.id}`} key={decision.id}>{t(decision.label)}</a>)}
      </nav>
    </div>
  )
}

export default function App() {
  useLanguage()
  const [catalog, setCatalog] = useState<CatalogRead | null>(null)
  const [scenario, setScenario] = useState<ScenarioRead | null>(null)
  const [history, setHistory] = useState<ScenarioRead[]>([])
  const [result, setResult] = useState<CalculationRead | null>(null)
  const [explanation, setExplanation] = useState<ExplanationRead | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [teamName, setTeamName] = useState('Команда Астаны')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const inflight = useRef(false)

  async function loadScenario(id: string, signal?: AbortSignal) {
    const current = await api<ScenarioRead>(`/scenarios/${id}`, 'GET', undefined, signal)
    const data = await api<CatalogRead>(`/catalog?dataset_id=${current.dataset_id}`, 'GET', undefined, signal)
    let calculation: CalculationRead | null = null
    let ai: ExplanationRead | null = null
    if (current.status !== 'draft') {
      calculation = await api<CalculationRead>(`/scenarios/${id}/result`, 'GET', undefined, signal)
      ai = await api<ExplanationRead>(`/scenarios/${id}/explanation`, 'GET', undefined, signal)
    } else if (current.decisions.length === 5) {
      calculation = await api<CalculationRead>(`/scenarios/${id}/preview`, 'POST', { expected_revision: current.revision }, signal)
    }
    if (signal?.aborted) return
    setCatalog(data); setScenario(current); setResult(calculation); setExplanation(ai)
    setTargets(Object.fromEntries(current.decisions.filter(d => d.district_id).map(d => [d.initiative_id, d.district_id!])) )
    storage.set('stikerai.scenario', current.id)
  }

  useEffect(() => {
    const controller = new AbortController()
    async function boot() {
      await initializeSession()
      const rows = await api<ScenarioRead[]>('/scenarios', 'GET', undefined, controller.signal)
      if (controller.signal.aborted) return
      setHistory(rows)
      const current = rows.find(row => row.id === storage.get('stikerai.scenario')) ?? rows[0]
      if (current) await loadScenario(current.id, controller.signal)
      else {
        const data = await api<CatalogRead>('/catalog', 'GET', undefined, controller.signal)
        if (!controller.signal.aborted) setCatalog(data)
      }
    }
    void boot().catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!scenario || explanation?.status !== 'running') return
    const controller = new AbortController()
    const id = scenario.id
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const next = await api<ExplanationRead>(`/scenarios/${id}/explanation`, 'GET', undefined, controller.signal)
        if (!controller.signal.aborted) setExplanation(next)
        if (next.status === 'running' && !controller.signal.aborted) timer = setTimeout(poll, 2000)
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message)
          timer = setTimeout(poll, 5000)
        }
      }
    }
    timer = setTimeout(poll, 1200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [scenario?.id, explanation?.status])

  async function execute(action: () => Promise<void>) {
    if (inflight.current) return
    inflight.current = true; setBusy(true); setError('')
    try { await action() }
    catch (e) {
      setError((e as Error).message)
      if (e instanceof ApiError && e.code === 'STALE_REVISION' && scenario) {
        try { await loadScenario(scenario.id) } catch { /* Keep actionable original error. */ }
      }
    } finally { inflight.current = false; setBusy(false) }
  }

  async function create(copy = false) {
    if (!catalog) return
    const key = `stikerai.request.${copy ? scenario?.id : 'new'}`
    const requestId = storage.get(key) ?? crypto.randomUUID()
    storage.set(key, requestId)
    const current = copy && scenario
      ? await api<ScenarioRead>(`/scenarios/${scenario.id}/copy`, 'POST', { request_id: requestId })
      : await api<ScenarioRead>('/scenarios', 'POST', { dataset_id: catalog.dataset.id, team_name: teamName, request_id: requestId })
    await loadScenario(current.id)
    storage.remove(key)
    setHistory(await api<ScenarioRead[]>('/scenarios'))
  }

  async function save(choices: DecisionSelect[]) {
    if (!scenario) return
    const current = await api<ScenarioRead>(`/scenarios/${scenario.id}/decisions`, 'PUT', {
      expected_revision: scenario.revision, decisions: choices,
    })
    setScenario(current); setResult(null); setExplanation(null)
    if (current.decisions.length === 5) {
      const next = await api<CalculationRead>(`/scenarios/${current.id}/preview`, 'POST', { expected_revision: current.revision })
      setResult(next)
    }
  }

  async function toggle(initiativeId: string) {
    if (!scenario) return
    const exists = scenario.decisions.some(d => d.initiative_id === initiativeId)
    const choices = scenario.decisions.filter(d => d.initiative_id !== initiativeId)
      .map(d => ({ initiative_id: d.initiative_id, district_id: d.district_id }))
    if (!exists) choices.push({ initiative_id: initiativeId, district_id: targets[initiativeId] || null })
    await save(choices)
  }

  function chooseMapTarget(initiativeId: string, districtId: string) {
    if (!scenario || scenario.status !== 'draft' || busy) return
    if (scenario.decisions.some(row => row.initiative_id === initiativeId)) {
      void execute(async () => {
        await save(scenario.decisions.map(row => ({ initiative_id: row.initiative_id,
          district_id: row.initiative_id === initiativeId ? districtId : row.district_id })))
        setTargets(current => ({ ...current, [initiativeId]: districtId }))
      })
    } else setTargets(current => ({ ...current, [initiativeId]: districtId }))
  }

  async function analyze() {
    if (!scenario) return
    const calculation = await api<CalculationRead>(`/scenarios/${scenario.id}/submit`, 'POST', { expected_revision: scenario.revision })
    setResult(calculation)
    setScenario({ ...scenario, status: 'evaluated', revision: scenario.revision + 1 })
    setScenario(await api<ScenarioRead>(`/scenarios/${scenario.id}`))
    setExplanation(await api<ExplanationRead>(`/scenarios/${scenario.id}/explanation`, 'POST'))
  }

  const count = scenario?.decisions.length ?? 0
  const frozen = !!scenario && scenario.status !== 'draft'
  const shown = result ?? catalog?.baseline
  const spent = scenario?.spent_budget ?? 0
  const budget = catalog?.dataset.initial_budget ?? 100
  const weakest = shown?.districts.reduce((lowest, d) => d.final_score < lowest.final_score ? d : lowest)

  return (
    <div className="app-shell">
      <aside className="nav-rail">
        <div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div>
        <AstanaIdentity />
        <div className="nav-group"><span className="nav-caption">{t("ГОРОД")}</span><a className="nav-link active" href="#decisions"><span>⌂</span>  {t("Обзор")}</a><a className="nav-link" href="#districts"><span>◉</span>  {t("Районы")}</a><a className="nav-link" href="#decisions"><span>↗</span>  {t("Сценарии")}</a></div>
        <div className="nav-group"><span className="nav-caption">{t("РАБОЧАЯ СЕССИЯ")}</span><div className={`session-step ${!result ? 'current' : ''}`}><b>01</b><span>{t("Портфель решений")}</span></div><div className={`session-step ${result && !frozen ? 'current' : ''}`}><b>02</b><span>{t("Анализ влияния")}</span></div><div className={`session-step ${frozen ? 'current' : ''}`}><b>03</b><span>{t("Итоговый отчёт")}</span></div></div>
        <div className="nav-footer"><span className="status-pulse" /> {error ? t("Ошибка синхронизации") : busy ? t("Синхронизация…") : t("Сервер подключён")}<br /><small>{scenario ? t("Сценарий сохранён на сервере") : t("Начните новый сценарий")}</small></div>
      </aside>
      <div className="workspace">
      <header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div><div className="topbar-meta">{t("ГОРОДСКАЯ ЛАБОРАТОРИЯ · АСТАНА")}</div><a className="workspace-link" href="/">Command center ↗</a><LanguageSwitcher /></header>
      <main className="dashboard" aria-busy={busy}>
        <section className="intro-row"><div><p className="eyebrow">{t("Астана · Пять направлений. Один город.")}</p><h1>{t("Аким")}<br /><em>{t("на 5 часов.")}</em></h1><p className="intro-copy">{t("Выберите пять инициатив, не более двух из одного направления.")} {catalog && tr`Бюджет — ${catalog.dataset.initial_budget} условных единиц. Горизонт расчёта — ${catalog.dataset.horizon_quarters} кварталов.`}</p></div><div className="hero-visual"><BaiterekOrbit score={shown?.final_score ?? null} /><div className="session-card"><span className="card-label">{t("ПОРТФЕЛЬ СЦЕНАРИЯ")}</span><strong>{String(count).padStart(2, '0')} <small>/ 05</small></strong><span>{frozen ? t("Сценарий завершён") : t("мероприятий выбрано")}</span><div className="mini-progress"><i style={{ width: `${count * 20}%` }} /></div></div></div></section>
        {error && <div className="error-banner" role="alert">{t(error)}<button onClick={() => window.location.reload()}>{t("Обновить данные")}</button></div>}
        {busy && <p role="status" className="loading-message">{t("Синхронизация с сервером…")}</p>}
        {!catalog && !busy && <p>{t("Данные пока недоступны. Проверьте запуск API и загрузку датасета.")}</p>}
        {catalog && <>
          <section className="session-toolbar" aria-label={t("Управление сценариями")}>
            {!scenario ? <><label>{t("Название команды")}<input value={teamName} maxLength={120} onChange={e => setTeamName(e.target.value)} /></label><button className="secondary-action" disabled={busy || !teamName.trim()} onClick={() => void execute(() => create())}>{t("Начать сценарий")}</button></> : <>
              <label>{t("Мои сценарии")}<select disabled={busy} value={scenario.id} onChange={e => void execute(() => loadScenario(e.target.value))}>{history.map(row => <option key={row.id} value={row.id}>{row.team_name} · {row.id.slice(0, 6)}</option>)}</select></label>
              <span className="save-state">{frozen ? t("Результат сохранён") : t("Черновик сохранён")} · {scenario.team_name}</span>
              <button className="secondary-action" disabled={busy} onClick={() => void execute(() => create(frozen))}>{frozen ? t("Создать копию и изменить") : t("Новый сценарий")}</button>
            </>}
          </section>
          <section className="metrics-grid" aria-label={t("Ключевые показатели")}>
            <article className="metric-card budget-card"><div className="metric-heading"><span className="card-label">{t("ОБЩИЙ БЮДЖЕТ")}</span><span className="metric-icon">◈</span></div><strong data-testid="budget">{budget} <small>{t("усл. ед.")}</small></strong><div className="budget-line"><span>{t("Использовано")} {spent}</span><span>{budget - spent}  {t("осталось")}</span></div><div className="budget-progress"><i style={{ width: `${spent / budget * 100}%` }} /></div></article>
            <article className="metric-card score-card"><span className="card-label">{t("ASTANA QUALITY OF LIFE")}</span><div className="score-value"><strong data-testid="score">{shown ? fmt(shown.final_score) : '—'}</strong></div><div className="score-foot">{result ? tr`${frozen ? t("Итог") : t("Предварительный расчёт")} · ${delta(result.final_score - result.baseline_score)} к базе` : t("Исходное состояние города")}</div></article>
            <article className="metric-card signal-card"><span className="card-label">{t("СЛАБЕЙШИЙ РАЙОН")}</span><strong>{t(weakest?.name ?? '—')}</strong><p>{t("Критических показателей:")} {shown?.critical_count ?? '—'}{t(". Порог — строго ниже 40.")}</p></article>
          </section>
          <AstanaMap key={catalog.dataset.id} catalog={catalog} result={result} scenario={scenario}
            targets={targets} busy={busy} onTarget={chooseMapTarget} />
          <div className="content-grid" id="decisions">
            <section className="decisions-panel"><div className="section-heading"><div><span className="section-kicker">{t("14 ИНИЦИАТИВ · 5 РЕШЕНИЙ")}</span><h2>{t("Портфель решений")}</h2></div><span className="lock-note">{t("БЮДЖЕТНЫЙ КОНТРОЛЬ")}</span></div>
              {directions.map((direction, index) => <section className="decision-row" id={`direction-${direction.id}`} key={direction.id}><div className="decision-title"><span className="decision-number">0{index + 1}</span><span className="decision-icon">{direction.icon}</span><div><h3>{t(direction.label)}</h3><p>{t("Можно выбрать до двух")}</p></div></div><div className="option-list">
                {catalog.initiatives.filter(item => item.direction === direction.id).sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1))).map(item => {
                  const selected = scenario?.decisions.find(d => d.initiative_id === item.id)
                  return <div className={`initiative-card ${selected ? 'selected' : ''}`} key={item.id}>
                    <button data-testid={`initiative-${item.code}`} className={`option ${selected ? 'selected' : ''}`} aria-pressed={!!selected} disabled={busy || !scenario || frozen} onClick={() => void execute(() => toggle(item.id))}><span className="radio" /><span className="option-copy"><strong>{item.code} · {t(item.title)}</strong><small>{item.scope === 'city' ? t("Весь город") : t("Один район")}  {t("· лаг")} {item.lag_quarters}  {t("кв.")}</small></span><span className="option-cost">{item.cost}  {t("усл. ед.")}</span></button>
                    {item.scope === 'district' && <label className="district-target">{t("Район")}<select data-testid={`district-${item.code}`} aria-label={tr`Район для ${item.code}`} disabled={busy || !scenario || frozen} value={selected?.district_id ?? targets[item.id] ?? ''} onChange={e => {
                      const districtId = e.target.value
                      if (selected && scenario) void execute(async () => {
                        await save(scenario.decisions.map(d => ({ initiative_id: d.initiative_id, district_id: d.initiative_id === item.id ? districtId || null : d.district_id })))
                        setTargets(current => ({ ...current, [item.id]: districtId }))
                      })
                      else setTargets(current => ({ ...current, [item.id]: districtId }))
                    }}><option value="">{t("Выберите район")}</option>{catalog.districts.map(d => <option key={d.id} value={d.id}>{t(d.name)}</option>)}</select></label>}
                    <details className="effect-details"><summary>{t("Полный эффект")}</summary>{(Object.keys(metrics) as Metric[]).filter(m => item[m] !== 0).map(m => <p key={m}>{t(metrics[m])}: {delta(item[m])}</p>)}<p>{t("Реализуется")} {(catalog.dataset.horizon_quarters - item.lag_quarters) / catalog.dataset.horizon_quarters * 100}{t("% эффекта.")}</p></details>
                  </div>
                })}
              </div></section>)}
              <div className="decision-footer"><span>{t("Выбрано:")} <b>{count}</b>  {t("из 5")}</span><span>{t("Расход:")} <b>{spent}  {t("усл. ед.")}</b></span></div>
            </section>
            <aside className="side-panel" id="districts"><div className="section-heading compact"><h2>{t("Пульс районов")}</h2></div><div className="district-list">{shown?.districts.map(d => <div className="district" key={d.district_id}><div className="district-avatar mint">{d.name[0]}</div><div className="district-info"><strong>{t(d.name)}</strong><span>{t("Взвешенный индекс")}</span></div><div className="district-score"><strong>{fmt(d.final_score)}</strong><span>{delta(d.final_score - d.baseline_score)}</span></div></div>)}</div>
              {!frozen && <><button className="primary-action" disabled={busy || !scenario || count !== 5} onClick={() => void execute(analyze)}>{t("Показать анализ сценария")} <span>→</span></button><p className="action-note">{t("Сохранит итог и зафиксирует пять решений.")}</p></>}
              {frozen && <div className="ai-note"><div className="ai-badge">✦ AI</div><div><strong>{t("Объяснение результата")}</strong><p className="source-language-note">{t("Тексты источников и AI-ответы показаны на языке оригинала.")}</p>
                {explanation?.status === 'running' ? <p role="status">{t("AI анализирует рассчитанные показатели…")}</p> : explanation?.payload ? <><p>{explanation.payload.summary}</p>{(['strengths', 'risks', 'consequences', 'recommendations'] as const).map((key, i) => <section key={key}><h4>{[t("Сильные стороны"), t("Риски"), t("Последствия"), t("Рекомендации")][i]}</h4><ul>{explanation.payload![key].map((text, j) => <li key={j}>{text}</li>)}</ul></section>)}</> : <><p>{t(explanation?.error ?? t("Численный результат сохранён. Можно запросить AI-объяснение."))}</p><button className="secondary-action" disabled={busy} onClick={() => void execute(async () => setExplanation(await api<ExplanationRead>(`/scenarios/${scenario!.id}/explanation`, 'POST')))}>{t("Повторить AI-анализ")}</button></>}
              </div></div>}
            </aside>
          </div>
          {shown && <section className="results-panel"><div className="section-heading"><h2>{t("Показатели районов")} {frozen ? t("после решений") : result ? t("· предварительный расчёт") : t("· исходные данные")}</h2></div><p>{t("Все показатели от 0 до 100; выше — лучше. Изменение указано в пунктах.")}</p><div className="table-scroll"><table><thead><tr><th>{t("Показатель")}</th>{shown.districts.map(d => <th key={d.district_id}>{t(d.name)}</th>)}</tr></thead><tbody>{(Object.keys(metrics) as Metric[]).map(m => <tr key={m}><th>{t(metrics[m])}</th>{shown.districts.map(d => <td className={d.after[m] < 40 ? 'critical' : ''} key={d.district_id}>{fmt(d.after[m])}<small>{delta(d.after[m] - d.before[m])}</small></td>)}</tr>)}</tbody></table></div>
            {!!result?.contributions.length && <details className="contributions"><summary>{t("Эффекты мероприятий и синергий")}</summary><p>{t("Добавки после учёта лагов, до ограничения показателей диапазоном 0–100.")}</p>{result.contributions.map((entry, index) => <p key={index}><strong>{t(entry.label)}</strong> · {t(catalog.districts.find(d => d.id === entry.district_id)?.name)}: {Object.entries(entry.effects).map(([key, value]) => `${key.toUpperCase()} ${delta(value!)}`).join(', ')}</p>)}</details>}
          </section>}
        </>}
      <PublicSignalsPanel />
        <CityLiveView />
      </main><footer className="footer"><span>{t("STIKERAI · ГОРОДСКАЯ ЛАБОРАТОРИЯ")}</span><span>{t("Данные синтетические · Учебная симуляция")}</span></footer></div>
    </div>
  )
}
