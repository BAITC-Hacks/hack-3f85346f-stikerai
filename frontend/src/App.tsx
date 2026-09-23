import { useMemo, useState } from 'react'

type Decision = {
  id: string
  label: string
  icon: string
  description: string
  options: { name: string; cost: number; impact: number; note: string }[]
}

const initialBudget = 5_000_000

const decisions: Decision[] = [
  { id: 'transport', label: 'Транспорт', icon: '↗', description: 'Связность районов и время в пути', options: [{ name: 'Выделенные полосы', cost: 1_300_000, impact: 11, note: '−12% времени в пути' }, { name: 'Умные светофоры', cost: 800_000, impact: 8, note: '−8% пробок' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'green', label: 'Экология', icon: '✦', description: 'Доступ к природе и чистый воздух', options: [{ name: 'Зелёный коридор', cost: 900_000, impact: 10, note: '+14% доступности парков' }, { name: 'Дворовые сады', cost: 550_000, impact: 6, note: '+8% зелёных зон' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'social', label: 'Соцсфера', icon: '◌', description: 'Школы, медицина и места встреч', options: [{ name: 'Молодёжный хаб', cost: 1_100_000, impact: 12, note: '+18% доступности сервисов' }, { name: 'Амбулатория района', cost: 1_500_000, impact: 14, note: '−20% очередей к врачу' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'safety', label: 'Безопасность', icon: '⌁', description: 'Освещение, реагирование и доверие', options: [{ name: 'Безопасный маршрут', cost: 700_000, impact: 9, note: '−16% тёмных участков' }, { name: 'Центр мониторинга', cost: 1_200_000, impact: 13, note: '−10% времени реагирования' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'services', label: 'Сервисы', icon: '□', description: 'Простота и скорость решения вопросов', options: [{ name: 'Единое окно 2.0', cost: 850_000, impact: 10, note: '−30% времени обращения' }, { name: 'Открытые данные', cost: 300_000, impact: 5, note: '+12% прозрачности' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
]

const districts = [{ name: 'Есиль', score: 78, trend: '+4', tone: 'mint' }, { name: 'Алматы', score: 71, trend: '+2', tone: 'yellow' }, { name: 'Сарыарка', score: 64, trend: '+7', tone: 'coral' }]
const money = new Intl.NumberFormat('ru-RU')

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
    <div className="astana-identity" aria-label="Астана · Аким на 5 часов">
      <div className="astana-symbol"><BaiterekMark /></div>
      <div><strong>Астана</strong><small>АКИМ НА 5 ЧАСОВ</small></div>
    </div>
  )
}

function BaiterekOrbit({ score }: { score: number }) {
  return (
    <div className="baiterek-orbit">
      <svg className="orbit-drawing" viewBox="0 0 360 340" aria-hidden="true">
        {decisions.map((decision, index) => {
          const angle = (index * 72 - 90) * Math.PI / 180
          return <line key={decision.id} className="orbit-spoke" x1={180 + Math.cos(angle) * 110} y1={170 + Math.sin(angle) * 110} x2={180 + Math.cos(angle) * 148} y2={170 + Math.sin(angle) * 148} />
        })}
        <circle className="orbit-track" cx="180" cy="170" r="104" />
        <circle className="orbit-value" cx="180" cy="170" r="104" pathLength="100" strokeDasharray={`${score} ${100 - score}`} transform="rotate(-90 180 170)" />
      </svg>
      <div className="orbit-center" role="meter" aria-label="Качество жизни Астаны" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <BaiterekMark />
        <div className="orbit-score"><strong>{score}</strong><span>/ 100</span></div>
        <small>QUALITY OF LIFE</small>
      </div>
      <nav className="orbit-rays" aria-label="Пять направлений управления">
        {decisions.map((decision, index) => <a className={`orbit-ray ray-${index + 1}`} href={`#direction-${decision.id}`} key={decision.id}>{decision.label}</a>)}
      </nav>
    </div>
  )
}

export default function App() {
  const [selected, setSelected] = useState<Record<string, number>>(Object.fromEntries(decisions.map((decision) => [decision.id, 0])))
  const totals = useMemo(() => decisions.reduce((result, decision) => { const option = decision.options[selected[decision.id]]; result.spent += option.cost; result.impact += option.impact; return result }, { spent: 0, impact: 0 }), [selected])
  const remaining = initialBudget - totals.spent
  const score = Math.min(99, 62 + totals.impact)
  const progress = Math.round((totals.spent / initialBudget) * 100)
  const updateDecision = (id: string, index: number) => {
    const decision = decisions.find((item) => item.id === id)
    if (!decision) return
    const currentCost = decision.options[selected[id]].cost
    const nextCost = decision.options[index].cost
    if (totals.spent - currentCost + nextCost > initialBudget) return
    setSelected((current) => ({ ...current, [id]: index }))
  }

  return (
    <div className="app-shell">
      <aside className="nav-rail">
        <div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div>
        <AstanaIdentity />
        <div className="nav-group"><span className="nav-caption">ГОРОД</span><a className="nav-link active" href="#decisions"><span>⌂</span> Обзор</a><a className="nav-link" href="#districts"><span>◉</span> Районы</a><a className="nav-link" href="#decisions"><span>↗</span> Сценарии</a></div>
        <div className="nav-group"><span className="nav-caption">РАБОЧАЯ СЕССИЯ</span><div className="session-step current"><b>01</b><span>Портфель решений</span></div><div className="session-step"><b>02</b><span>Анализ влияния</span></div><div className="session-step"><b>03</b><span>Итоговый отчёт</span></div></div>
        <div className="nav-footer"><span className="status-pulse" /> Система онлайн<br /><small>Сессия сохранена локально</small></div>
      </aside>
      <div className="workspace">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div><div className="topbar-meta"><span className="live-dot" /> SIMULATION LIVE <span className="separator">/</span> 23 SEP 2026</div><div className="topbar-actions"><button className="icon-button" aria-label="Уведомления">⌁</button><button className="profile-button" aria-label="Профиль мэра">АЖ</button></div></header>
      <main className="dashboard">
        <section className="intro-row"><div><p className="eyebrow">Астана · Пять направлений. Один город.</p><h1>Аким<br /><em>на 5 часов.</em></h1><p className="intro-copy">Аким принимает решения. AI показывает, как выбранные приоритеты повлияют на бюджет, районы и качество жизни Астаны.</p></div><div className="hero-visual"><BaiterekOrbit score={score} /><div className="session-card"><span className="card-label">ХОД СЕССИИ</span><strong>01 <small>/ 03</small></strong><span>Портфель решений</span><div className="mini-progress"><i style={{ width: '33%' }} /></div></div></div></section>
        <section className="metrics-grid" aria-label="Ключевые показатели"><article className="metric-card budget-card"><div className="metric-heading"><span className="card-label">ОБЩИЙ БЮДЖЕТ</span><span className="metric-icon">₸</span></div><strong>{money.format(initialBudget)} <small>₸</small></strong><div className="budget-line"><span>Использовано {progress}%</span><span>{money.format(remaining)} ₸ осталось</span></div><div className="budget-progress"><i style={{ width: `${progress}%` }} /></div></article><article className="metric-card score-card"><div className="metric-heading"><span className="card-label">ASTANA QUALITY OF LIFE</span><span className="score-change">+{totals.impact} за сессию</span></div><div className="score-value"><strong>{score}</strong><span>/ 100</span></div><div className="score-foot"><span className="score-ring">↑</span> Прогноз последствий ваших решений</div></article><article className="metric-card signal-card"><div className="metric-heading"><span className="card-label">ГОРОДСКОЙ СИГНАЛ</span><span className="signal-live">● LIVE</span></div><strong>В фокусе: <span>Сарыарка</span></strong><p>Району нужен самый быстрый эффект от решений.</p></article></section>
        <div className="content-grid" id="decisions"><section className="decisions-panel"><div className="section-heading"><div><span className="section-kicker">ШАГ 01 · РЕШЕНИЯ</span><h2>Соберите портфель</h2></div><span className="lock-note">◉ БЮДЖЕТНЫЙ КОНТРОЛЬ ВКЛЮЧЁН</span></div><div className="decision-list">{decisions.map((decision, decisionIndex) => <article className="decision-row" id={`direction-${decision.id}`} key={decision.id}><div className="decision-title"><span className="decision-number">0{decisionIndex + 1}</span><span className="decision-icon">{decision.icon}</span><div><h3>{decision.label}</h3><p>{decision.description}</p></div></div><div className="option-list">{decision.options.map((option, optionIndex) => <button className={`option ${selected[decision.id] === optionIndex ? 'selected' : ''}`} key={option.name} onClick={() => updateDecision(decision.id, optionIndex)}><span className="radio" /><span className="option-copy"><strong>{option.name}</strong><small>{option.note}</small></span><span className="option-cost">{option.cost ? `${money.format(option.cost)} ₸` : '—'}</span></button>)}</div></article>)}</div><div className="decision-footer"><span>Выбрано направлений: <b>{decisions.length}</b> из 5</span><span>Текущий расход: <b>{money.format(totals.spent)} ₸</b></span></div></section>
            <aside className="side-panel" id="districts"><div className="section-heading compact"><div><span className="section-kicker">LIVE DATA</span><h2>Пульс районов</h2></div><span className="refresh">↻</span></div><div className="district-list">{districts.map((district) => <div className="district" key={district.name}><div className={`district-avatar ${district.tone}`}>{district.name[0]}</div><div className="district-info"><strong>{district.name}</strong><span>Индекс среды</span></div><div className="district-score"><strong>{Math.min(99, district.score + Math.floor(totals.impact / 4))}</strong><span>↑ {district.trend}</span></div></div>)}</div><div className="ai-note"><div className="ai-badge">✦ AI</div><div><strong>AI показывает последствия</strong><p>{totals.impact > 30 ? 'Ваш сценарий даёт заметный баланс между развитием и устойчивостью.' : 'Вы выбираете направление. AI покажет последствия для бюджета, районов и качества жизни.'}</p></div></div><button className="primary-action">Показать последствия выбора <span>→</span></button><p className="action-note">Решение остаётся за акимом · AI не выбирает вместо вас</p></aside></div>
          </main><footer className="footer"><span>STIKERAI · ГОРОДСКАЯ ЛАБОРАТОРИЯ</span><span>Синтетические данные · Сессия 01</span></footer>
          </div>
    </div>
  )
}
