import { useCallback, useEffect, useState } from 'react'

type BreakdownItem = { label: string; count: number; suppressed?: boolean }
type SourceRef = { label: string; url?: string }
type Proposal = {
  id: string
  title: string
  summary?: string
  updatedAt?: string
  languages: BreakdownItem[]
  topics: BreakdownItem[]
  stances: BreakdownItem[]
  coverage: string[]
  sources: SourceRef[]
}

const endpoint = '/api/signals/proposals'
const numberFormat = new Intl.NumberFormat('ru-RU')
const stanceNames: Record<string, string> = {
  support: 'Поддержка', against: 'Против', neutral: 'Нейтрально', mixed: 'Смешанная',
  for: 'Поддержка', oppose: 'Против', opposition: 'Против', neutral_or_unclear: 'Нейтрально / неясно',
}
const languageNames: Record<string, string> = { ru: 'Русский', kk: 'Қазақша', kz: 'Қазақша', en: 'Английский' }

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function first(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key]
  return undefined
}

function labelFor(value: unknown, names: Record<string, string> = {}): string {
  const key = String(value ?? 'unknown')
  return names[key.toLowerCase()] ?? key.replaceAll('_', ' ')
}

function breakdown(value: unknown, names: Record<string, string> = {}): BreakdownItem[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const row = asRecord(item)
      return {
        label: labelFor(first(row, ['label', 'name', 'key', 'code', 'language', 'topic', 'stance']), names),
        count: Number(first(row, ['count', 'total', 'value', 'items']) ?? 0),
        suppressed: Boolean(row.suppressed),
      }
    }).filter((item) => Number.isFinite(item.count))
  }
  return Object.entries(asRecord(value)).map(([key, count]) => ({
    label: labelFor(key, names),
    count: Number(typeof count === 'object' && count !== null ? first(asRecord(count), ['count', 'total', 'value']) : count),
  })).filter((item) => Number.isFinite(item.count))
}

function groupCells(cells: unknown, dimension: 'language' | 'topic' | 'stance', names: Record<string, string> = {}): BreakdownItem[] {
  if (!Array.isArray(cells)) return []
  const groups = new Map<string, { count: number; suppressed: boolean }>()
  for (const cellValue of cells) {
    const cell = asRecord(cellValue)
    const key = String(cell[dimension] ?? 'unknown')
    const group = groups.get(key) ?? { count: 0, suppressed: false }
    if (cell.suppressed === true || cell.count === null || cell.count === undefined) group.suppressed = true
    else group.count += Number(cell.count) || 0
    groups.set(key, group)
  }
  return Array.from(groups.entries()).map(([key, value]) => ({ label: labelFor(key, names), ...value }))
}

function normalizeProposal(value: unknown, index: number, detailValue?: unknown): Proposal {
  const row = asRecord(value)
  const detail = asRecord(detailValue)
  const cells = first(detail, ['aggregates', 'cells'])
  const provenance = asRecord(first(detail, ['source_provenance', 'provenance']))
  const aggregate = asRecord(first(row, ['aggregate', 'aggregates', 'summary']))
  const coverageRow = asRecord(row.coverage)
  const sourceRows = first(row, ['source_refs', 'sources', 'source_references']) ?? first(detail, ['source_refs', 'sources', 'source_references'])
  const sources = (Array.isArray(sourceRows) ? sourceRows : []).map((item, sourceIndex) => {
    const source = asRecord(item)
    const url = first(source, ['url', 'href', 'source_url'])
    const safeUrl = typeof url === 'string' && /^https?:\/\//i.test(url) ? url : undefined
    return {
      label: String(first(source, ['title', 'label', 'name', 'source']) ?? `Источник ${sourceIndex + 1}`),
      url: safeUrl,
    }
  })
  const coverage = Object.entries(coverageRow).flatMap(([key, raw]) => {
    if (raw === null || raw === undefined || typeof raw === 'object') return []
    const valueText = typeof raw === 'number' ? numberFormat.format(raw) : String(raw)
    return [`${labelFor(key)}: ${valueText}`]
  })
  const total = first(coverageRow, ['total_items', 'item_count', 'sample_size', 'records'])
  if (total !== undefined && !coverage.some((item) => /items|count|size|records/.test(item))) {
    coverage.unshift(`Материалов в выборке: ${numberFormat.format(Number(total))}`)
  }
  const uncertainty = first(detail, ['uncertainty', 'limitations'])
  if (Array.isArray(uncertainty)) coverage.push(...uncertainty.map(String))
  const suppression = asRecord(detail.suppression)
  if (suppression.threshold !== undefined) coverage.unshift(`Подавление малых групп: порог ${suppression.threshold}`)
  if (typeof provenance.description === 'string') coverage.push(provenance.description)
  if (typeof provenance.collection_method === 'string') coverage.push(provenance.collection_method)
  if (typeof provenance.source_id === 'string') sources.push({ label: `Источник: ${provenance.source_id}` })
  const title = first(row, ['title', 'name', 'proposal', 'label'])
  const description = first(row, ['summary', 'description', 'short_description'])
  return {
    id: String(first(row, ['id', 'proposal_id', 'key', 'slug']) ?? `proposal-${index}`),
    title: String(title ?? 'Предложение без названия'),
    summary: typeof description === 'string' ? description : undefined,
    updatedAt: String(first(row, ['updated_at', 'updatedAt', 'last_updated']) ?? ''),
    languages: cells ? groupCells(cells, 'language', languageNames) : breakdown(first(aggregate, ['by_language', 'languages', 'language']), languageNames),
    topics: cells ? groupCells(cells, 'topic') : breakdown(first(aggregate, ['by_topic', 'topics', 'topic'])),
    stances: cells ? groupCells(cells, 'stance', stanceNames) : breakdown(first(aggregate, ['by_stance', 'stances', 'stance']), stanceNames),
    coverage,
    sources,
  }
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function Breakdown({ title, items }: { title: string; items: BreakdownItem[] }) {
  return (
    <div className="public-signal-breakdown">
      <h4>{title}</h4>
      {items.length ? <ul>{items.map((item) => <li key={item.label}><span>{item.label}</span><b>{item.suppressed ? 'Подавлено' : numberFormat.format(item.count)}</b></li>)}</ul> : <p className="public-signal-empty-value">Нет данных</p>}
    </div>
  )
}

export function PublicSignalsPanel() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [updatedAt, setUpdatedAt] = useState<string>()
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setErrorMessage('')
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload: unknown = await response.json()
      const root = asRecord(payload)
      const items = Array.isArray(payload) ? payload : first(root, ['proposals', 'items', 'results'])
      const rows = Array.isArray(items) ? items : []
      const details = await Promise.all(rows.map(async (item) => {
        const proposal = asRecord(item)
        const id = first(proposal, ['id', 'proposal_id', 'key'])
        if (!id) return undefined
        const detailResponse = await fetch(`${endpoint}/${encodeURIComponent(String(id))}/aggregates`, { headers: { Accept: 'application/json' } })
        if (!detailResponse.ok) throw new Error(`HTTP ${detailResponse.status} при загрузке сводки`)
        return detailResponse.json() as Promise<unknown>
      }))
      const normalized = rows.map((item, index) => normalizeProposal(item, index, details[index]))
      setProposals(normalized)
      setUpdatedAt(String(first(root, ['updated_at', 'updatedAt']) ?? ''))
      setState(normalized.length ? 'ready' : 'empty')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные')
      setState('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <section className="public-signals-panel" aria-labelledby="public-signals-title">
      <div className="public-signals-heading">
        <div>
          <span className="section-kicker">ОБЩЕСТВЕННОЕ УЧАСТИЕ · ДЕМО-СЛОЙ</span>
          <h2 id="public-signals-title">Предложения жителей</h2>
          <p>Сводка по темам, языкам и позиции в предложениях. Эти сигналы не входят в индекс качества жизни.</p>
        </div>
        <button className="public-signals-refresh" type="button" onClick={() => void load()} disabled={state === 'loading'} aria-label="Обновить общественные сигналы">
          {state === 'loading' ? 'Загрузка…' : 'Обновить ↻'}
        </button>
      </div>

      <div className="public-signals-notice" role="note">
        <strong>Синтетические демонстрационные данные</strong>
        <span>Цифры созданы вручную для демо, это не данные жителей и не репрезентативный опрос. Они не влияют на индекс качества жизни.</span>
      </div>

      {state === 'loading' && <p className="public-signals-state" role="status">Загружаем сводку предложений…</p>}
      {state === 'error' && <div className="public-signals-state public-signals-error" role="status"><span>Сводка пока недоступна ({errorMessage}).</span><button type="button" onClick={() => void load()}>Повторить</button></div>}
      {state === 'empty' && <p className="public-signals-state">Пока нет предложений для отображения.</p>}
      {state === 'ready' && <>
        <p className="public-signals-updated">{updatedAt ? `Обновлено: ${formatDate(updatedAt)}` : 'Демо-фикстуры · время сбора неприменимо'}</p>
        <div className="public-proposal-grid">
          {proposals.map((proposal) => <article className="public-proposal-card" key={proposal.id}>
            <div className="public-proposal-title"><span aria-hidden="true">◌</span><h3>{proposal.title}</h3></div>
            {proposal.summary && <p className="public-proposal-summary">{proposal.summary}</p>}
            {proposal.updatedAt && <p className="public-proposal-updated">Сводка обновлена: {formatDate(proposal.updatedAt)}</p>}
            <div className="public-proposal-breakdowns">
              <Breakdown title="Позиция" items={proposal.stances} />
              <Breakdown title="Темы" items={proposal.topics} />
              <Breakdown title="Языки" items={proposal.languages} />
            </div>
            {(proposal.coverage.length > 0 || proposal.sources.length > 0) && <div className="public-proposal-meta">
              {proposal.coverage.length > 0 && <div><h4>Охват данных</h4><ul>{proposal.coverage.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {proposal.sources.length > 0 && <div><h4>Источники</h4><ul>{proposal.sources.map((source, index) => <li key={`${source.label}-${index}`}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}<span className="sr-only"> (откроется в новой вкладке)</span></a> : source.label}</li>)}</ul></div>}
            </div>}
          </article>)}
        </div>
      </>}
    </section>
  )
}
