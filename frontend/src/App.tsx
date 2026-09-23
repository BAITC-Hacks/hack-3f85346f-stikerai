import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import type { CalculationRead, CatalogRead, DecisionSelect, Direction, ExplanationRead, Metric, ScenarioRead } from './types/domain'

const directions: { id: Direction; label: string; icon: string }[] = [
  { id: 'transport', label: 'Транспорт', icon: '↗' },
  { id: 'ecology', label: 'Экология', icon: '✦' },
  { id: 'social', label: 'Социальная среда', icon: '◌' },
  { id: 'safety', label: 'Безопасность', icon: '⌁' },
  { id: 'services', label: 'Городские сервисы', icon: '□' },
]
const metrics: Record<Metric, string> = {
  t1: 'Разгрузка дорог', t2: 'Общественный транспорт', e1: 'Озеленение', e2: 'Качество воздуха',
  s1: 'Школы и детсады', s2: 'Первичная медицина', b1: 'Безопасность улиц', b2: 'Дорожная безопасность',
  c1: 'Надёжность ЖКХ', c2: 'Обращения жителей',
}
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const fmt = (value: number) => number.format(value)
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

export default function App() {
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
      <header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div><div className="topbar-meta">ГОРОДСКАЯ ЛАБОРАТОРИЯ · АСТАНА</div></header>
      <main className="dashboard" aria-busy={busy}>
        <section className="intro-row"><div><p className="eyebrow">Кабинет городского управления</p><h1>Пять решений.<br /><em>Один город.</em></h1><p className="intro-copy">Выберите пять инициатив, не более двух из одного направления. {catalog && `Бюджет — ${catalog.dataset.initial_budget} условных единиц. Горизонт расчёта — ${catalog.dataset.horizon_quarters} кварталов.`}</p></div><div className="session-card"><span className="card-label">ПОРТФЕЛЬ СЦЕНАРИЯ</span><strong>{String(count).padStart(2, '0')} <small>/ 05</small></strong><span>{frozen ? 'Сценарий завершён' : 'мероприятий выбрано'}</span><div className="mini-progress"><i style={{ width: `${count * 20}%` }} /></div></div></section>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => window.location.reload()}>Обновить данные</button></div>}
        {busy && <p role="status" className="loading-message">Синхронизация с сервером…</p>}
        {!catalog && !busy && <p>Данные пока недоступны. Проверьте запуск API и загрузку датасета.</p>}
        {catalog && <>
          <section className="session-toolbar" aria-label="Управление сценариями">
            {!scenario ? <><label>Название команды<input value={teamName} maxLength={120} onChange={e => setTeamName(e.target.value)} /></label><button className="secondary-action" disabled={busy || !teamName.trim()} onClick={() => void execute(() => create())}>Начать сценарий</button></> : <>
              <label>Мои сценарии<select disabled={busy} value={scenario.id} onChange={e => void execute(() => loadScenario(e.target.value))}>{history.map(row => <option key={row.id} value={row.id}>{row.team_name} · {row.id.slice(0, 6)}</option>)}</select></label>
              <span className="save-state">{frozen ? 'Результат сохранён' : 'Черновик сохранён'} · {scenario.team_name}</span>
              <button className="secondary-action" disabled={busy} onClick={() => void execute(() => create(frozen))}>{frozen ? 'Создать копию и изменить' : 'Новый сценарий'}</button>
            </>}
          </section>
          <section className="metrics-grid" aria-label="Ключевые показатели">
            <article className="metric-card budget-card"><div className="metric-heading"><span className="card-label">ОБЩИЙ БЮДЖЕТ</span><span className="metric-icon">◈</span></div><strong data-testid="budget">{budget} <small>усл. ед.</small></strong><div className="budget-line"><span>Использовано {spent}</span><span>{budget - spent} осталось</span></div><div className="budget-progress"><i style={{ width: `${spent / budget * 100}%` }} /></div></article>
            <article className="metric-card score-card"><span className="card-label">ASTANA QUALITY OF LIFE</span><div className="score-value"><strong data-testid="score">{shown ? fmt(shown.final_score) : '—'}</strong></div><div className="score-foot">{result ? `${frozen ? 'Итог' : 'Предварительный расчёт'} · ${delta(result.final_score - result.baseline_score)} к базе` : 'Исходное состояние города'}</div></article>
            <article className="metric-card signal-card"><span className="card-label">СЛАБЕЙШИЙ РАЙОН</span><strong>{weakest?.name ?? '—'}</strong><p>Критических показателей: {shown?.critical_count ?? '—'}. Порог — строго ниже 40.</p></article>
          </section>
          <div className="content-grid">
            <section className="decisions-panel"><div className="section-heading"><div><span className="section-kicker">14 ИНИЦИАТИВ · 5 РЕШЕНИЙ</span><h2>Портфель решений</h2></div><span className="lock-note">БЮДЖЕТНЫЙ КОНТРОЛЬ</span></div>
              {directions.map((direction, index) => <section className="decision-row" key={direction.id}><div className="decision-title"><span className="decision-number">0{index + 1}</span><span className="decision-icon">{direction.icon}</span><div><h3>{direction.label}</h3><p>Можно выбрать до двух</p></div></div><div className="option-list">
                {catalog.initiatives.filter(item => item.direction === direction.id).sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1))).map(item => {
                  const selected = scenario?.decisions.find(d => d.initiative_id === item.id)
                  return <div className={`initiative-card ${selected ? 'selected' : ''}`} key={item.id}>
                    <button data-testid={`initiative-${item.code}`} className={`option ${selected ? 'selected' : ''}`} aria-pressed={!!selected} disabled={busy || !scenario || frozen} onClick={() => void execute(() => toggle(item.id))}><span className="radio" /><span className="option-copy"><strong>{item.code} · {item.title}</strong><small>{item.scope === 'city' ? 'Весь город' : 'Один район'} · лаг {item.lag_quarters} кв.</small></span><span className="option-cost">{item.cost} усл. ед.</span></button>
                    {item.scope === 'district' && <label className="district-target">Район<select data-testid={`district-${item.code}`} aria-label={`Район для ${item.code}`} disabled={busy || !scenario || frozen} value={selected?.district_id ?? targets[item.id] ?? ''} onChange={e => {
                      const districtId = e.target.value
                      if (selected && scenario) void execute(async () => {
                        await save(scenario.decisions.map(d => ({ initiative_id: d.initiative_id, district_id: d.initiative_id === item.id ? districtId || null : d.district_id })))
                        setTargets(current => ({ ...current, [item.id]: districtId }))
                      })
                      else setTargets(current => ({ ...current, [item.id]: districtId }))
                    }}><option value="">Выберите район</option>{catalog.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
                    <details className="effect-details"><summary>Полный эффект</summary>{(Object.keys(metrics) as Metric[]).filter(m => item[m] !== 0).map(m => <p key={m}>{metrics[m]}: {delta(item[m])}</p>)}<p>Реализуется {(catalog.dataset.horizon_quarters - item.lag_quarters) / catalog.dataset.horizon_quarters * 100}% эффекта.</p></details>
                  </div>
                })}
              </div></section>)}
              <div className="decision-footer"><span>Выбрано: <b>{count}</b> из 5</span><span>Расход: <b>{spent} усл. ед.</b></span></div>
            </section>
            <aside className="side-panel"><div className="section-heading compact"><h2>Пульс районов</h2></div><div className="district-list">{shown?.districts.map(d => <div className="district" key={d.district_id}><div className="district-avatar mint">{d.name[0]}</div><div className="district-info"><strong>{d.name}</strong><span>Взвешенный индекс</span></div><div className="district-score"><strong>{fmt(d.final_score)}</strong><span>{delta(d.final_score - d.baseline_score)}</span></div></div>)}</div>
              {!frozen && <><button className="primary-action" disabled={busy || !scenario || count !== 5} onClick={() => void execute(analyze)}>Показать анализ сценария <span>→</span></button><p className="action-note">Сохранит итог и зафиксирует пять решений.</p></>}
              {frozen && <div className="ai-note"><div className="ai-badge">✦ AI</div><div><strong>Объяснение результата</strong>
                {explanation?.status === 'running' ? <p role="status">AI анализирует рассчитанные показатели…</p> : explanation?.payload ? <><p>{explanation.payload.summary}</p>{(['strengths', 'risks', 'consequences', 'recommendations'] as const).map((key, i) => <section key={key}><h4>{['Сильные стороны', 'Риски', 'Последствия', 'Рекомендации'][i]}</h4><ul>{explanation.payload![key].map((text, j) => <li key={j}>{text}</li>)}</ul></section>)}</> : <><p>{explanation?.error ?? 'Численный результат сохранён. Можно запросить AI-объяснение.'}</p><button className="secondary-action" disabled={busy} onClick={() => void execute(async () => setExplanation(await api<ExplanationRead>(`/scenarios/${scenario!.id}/explanation`, 'POST')))}>Повторить AI-анализ</button></>}
              </div></div>}
            </aside>
          </div>
          {shown && <section className="results-panel"><div className="section-heading"><h2>Показатели районов {frozen ? 'после решений' : result ? '· предварительный расчёт' : '· исходные данные'}</h2></div><p>Все показатели от 0 до 100; выше — лучше. Изменение указано в пунктах.</p><div className="table-scroll"><table><thead><tr><th>Показатель</th>{shown.districts.map(d => <th key={d.district_id}>{d.name}</th>)}</tr></thead><tbody>{(Object.keys(metrics) as Metric[]).map(m => <tr key={m}><th>{metrics[m]}</th>{shown.districts.map(d => <td className={d.after[m] < 40 ? 'critical' : ''} key={d.district_id}>{fmt(d.after[m])}<small>{delta(d.after[m] - d.before[m])}</small></td>)}</tr>)}</tbody></table></div>
            {!!result?.contributions.length && <details className="contributions"><summary>Эффекты мероприятий и синергий</summary><p>Добавки после учёта лагов, до ограничения показателей диапазоном 0–100.</p>{result.contributions.map((entry, index) => <p key={index}><strong>{entry.label}</strong> · {catalog.districts.find(d => d.id === entry.district_id)?.name}: {Object.entries(entry.effects).map(([key, value]) => `${key.toUpperCase()} ${delta(value!)}`).join(', ')}</p>)}</details>}
          </section>}
        </>}
      </main><footer className="footer"><span>STIKERAI · ГОРОДСКАЯ ЛАБОРАТОРИЯ</span><span>Данные синтетические · Учебная симуляция</span></footer>
    </div>
  )
}
