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
  { id: 'green', label: 'Озеленение', icon: '✦', description: 'Доступ к природе и чистый воздух', options: [{ name: 'Зелёный коридор', cost: 900_000, impact: 10, note: '+14% доступности парков' }, { name: 'Дворовые сады', cost: 550_000, impact: 6, note: '+8% зелёных зон' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'social', label: 'Социальная среда', icon: '◌', description: 'Школы, медицина и места встреч', options: [{ name: 'Молодёжный хаб', cost: 1_100_000, impact: 12, note: '+18% доступности сервисов' }, { name: 'Амбулатория района', cost: 1_500_000, impact: 14, note: '−20% очередей к врачу' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'safety', label: 'Безопасность', icon: '⌁', description: 'Освещение, реагирование и доверие', options: [{ name: 'Безопасный маршрут', cost: 700_000, impact: 9, note: '−16% тёмных участков' }, { name: 'Центр мониторинга', cost: 1_200_000, impact: 13, note: '−10% времени реагирования' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
  { id: 'services', label: 'Городские сервисы', icon: '□', description: 'Простота и скорость решения вопросов', options: [{ name: 'Единое окно 2.0', cost: 850_000, impact: 10, note: '−30% времени обращения' }, { name: 'Открытые данные', cost: 300_000, impact: 5, note: '+12% прозрачности' }, { name: 'Ничего не менять', cost: 0, impact: 0, note: 'Показатель без изменений' }] },
]

const districts = [{ name: 'Есиль', score: 78, trend: '+4', tone: 'mint' }, { name: 'Алматы', score: 71, trend: '+2', tone: 'yellow' }, { name: 'Сарыарка', score: 64, trend: '+7', tone: 'coral' }]
const money = new Intl.NumberFormat('ru-RU')

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
      <header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>STIKER<span className="brand-accent">AI</span></span></div><div className="topbar-meta"><span className="live-dot" /> СИМУЛЯЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ <span className="separator">/</span> 23 СЕНТЯБРЯ 2026</div><button className="profile-button" aria-label="Профиль мэра">АЖ</button></header>
      <main className="dashboard">
        <section className="intro-row"><div><p className="eyebrow">Кабинет городского управления · Сессия 01</p><h1>Пять решений.<br /><em>Один город.</em></h1><p className="intro-copy">Выберите инициативы для Астаны. Бюджет общий для всех команд, а каждое решение меняет качество жизни в районах.</p></div><div className="session-card"><span className="card-label">СЕЙЧАС В СИМУЛЯЦИИ</span><strong>05 <small>/ 05</small></strong><span>решений доступно</span><div className="mini-progress"><i style={{ width: '100%' }} /></div></div></section>
        <section className="metrics-grid" aria-label="Ключевые показатели"><article className="metric-card budget-card"><div className="metric-heading"><span className="card-label">ОБЩИЙ БЮДЖЕТ</span><span className="metric-icon">₸</span></div><strong>{money.format(initialBudget)} <small>₸</small></strong><div className="budget-line"><span>Использовано {progress}%</span><span>{money.format(remaining)} ₸ осталось</span></div><div className="budget-progress"><i style={{ width: `${progress}%` }} /></div></article><article className="metric-card score-card"><div className="metric-heading"><span className="card-label">ASTANA QUALITY OF LIFE</span><span className="score-change">+{totals.impact} за сессию</span></div><div className="score-value"><strong>{score}</strong><span>/ 100</span></div><div className="score-foot"><span className="score-ring">↑</span> Потенциал сценария растёт</div></article><article className="metric-card signal-card"><div className="metric-heading"><span className="card-label">ГОРОДСКОЙ СИГНАЛ</span><span className="signal-live">● LIVE</span></div><strong>В фокусе: <span>Сарыарка</span></strong><p>Району нужен самый быстрый эффект от решений.</p></article></section>
        <div className="content-grid"><section className="decisions-panel"><div className="section-heading"><div><span className="section-kicker">01 — 05</span><h2>Портфель решений</h2></div><span className="lock-note">◉ БЮДЖЕТНЫЙ КОНТРОЛЬ ВКЛЮЧЁН</span></div><div className="decision-list">{decisions.map((decision, decisionIndex) => <article className="decision-row" key={decision.id}><div className="decision-title"><span className="decision-number">0{decisionIndex + 1}</span><span className="decision-icon">{decision.icon}</span><div><h3>{decision.label}</h3><p>{decision.description}</p></div></div><div className="option-list">{decision.options.map((option, optionIndex) => <button className={`option ${selected[decision.id] === optionIndex ? 'selected' : ''}`} key={option.name} onClick={() => updateDecision(decision.id, optionIndex)}><span className="radio" /><span className="option-copy"><strong>{option.name}</strong><small>{option.note}</small></span><span className="option-cost">{option.cost ? `${money.format(option.cost)} ₸` : '—'}</span></button>)}</div></article>)}</div><div className="decision-footer"><span>Выбрано решений: <b>{decisions.length}</b> из 5</span><span>Текущий расход: <b>{money.format(totals.spent)} ₸</b></span></div></section>
          <aside className="side-panel"><div className="section-heading compact"><div><span className="section-kicker">LIVE DATA</span><h2>Пульс районов</h2></div><span className="refresh">↻</span></div><div className="district-list">{districts.map((district) => <div className="district" key={district.name}><div className={`district-avatar ${district.tone}`}>{district.name[0]}</div><div className="district-info"><strong>{district.name}</strong><span>Индекс среды</span></div><div className="district-score"><strong>{Math.min(99, district.score + Math.floor(totals.impact / 4))}</strong><span>↑ {district.trend}</span></div></div>)}</div><div className="ai-note"><div className="ai-badge">✦ AI</div><div><strong>Предварительный прогноз</strong><p>{totals.impact > 30 ? 'Сценарий даёт заметный баланс между развитием и устойчивостью.' : 'Добавьте инициативы, чтобы увидеть полный прогноз влияния.'}</p></div></div><button className="primary-action">Показать анализ сценария <span>→</span></button><p className="action-note">Доступно после выбора всех пяти направлений</p></aside></div>
      </main><footer className="footer"><span>STIKERAI · ГОРОДСКАЯ ЛАБОРАТОРИЯ</span><span>Данные синтетические · Для демонстрации</span></footer>
    </div>
  )
}
