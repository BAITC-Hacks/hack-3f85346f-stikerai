import { t, locale } from './i18n'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { FeatureCollection, MultiPolygon } from 'geojson'
import { api } from './api'
import { districtValue, mapFeatures, mapMetrics, valueColour, type MapMetric, type MapPhase } from './mapData'
import type { CalculationRead, CatalogRead, MapDistrictCollection, ScenarioRead } from './types/domain'
import './astana-map.css'

const Canvas = lazy(() => import('./AstanaMapCanvas'))
const fmt = (value: number | null) => value === null ? '—' : value.toLocaleString(locale(), { maximumFractionDigits: 2 })
type Props = {
  catalog: CatalogRead
  result: CalculationRead | null
  scenario: ScenarioRead | null
  targets: Record<string, string>
  busy: boolean
  onTarget: (initiativeId: string, districtId: string) => void
}

export default function AstanaMap({ catalog, result, scenario, targets, busy, onTarget }: Props) {
  const [open, setOpen] = useState(false)
  const [collection, setCollection] = useState<MapDistrictCollection | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState('')
  const [modelDistrict, setModelDistrict] = useState('')
  const [initiativeId, setInitiativeId] = useState('')
  const [metric, setMetric] = useState<MapMetric>('score')
  const [phase, setPhase] = useState<MapPhase>('before')
  const effectivePhase = result ? phase : 'before'
  const currentCollection = collection?.dataset_id === catalog.dataset.id ? collection : null
  const district = catalog.districts.find(row => row.id === modelDistrict)
  const feature = currentCollection?.features.find(row => row.id === selected)
  const candidate = catalog.districts.find(row => row.id === feature?.properties.candidate_district_id)
  const districtInitiatives = catalog.initiatives.filter(row => row.scope === 'district')
  const initiative = districtInitiatives.find(row => row.id === initiativeId)
  const canEdit = !!scenario && scenario.status === 'draft' && !busy
  const data = useMemo(() => currentCollection
    ? mapFeatures(currentCollection, catalog, result, metric, effectivePhase) as FeatureCollection<MultiPolygon> : null,
  [currentCollection, catalog, result, metric, effectivePhase])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setError(''); setCollection(null); setSelected(''); setModelDistrict(''); setInitiativeId('')
    void api<MapDistrictCollection>(`/map/districts?dataset_id=${catalog.dataset.id}`, 'GET', undefined, controller.signal)
      .then(value => { if (!controller.signal.aborted) setCollection(value) })
      .catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [open, catalog.dataset.id, retry])

  function selectFeature(id: string) {
    setSelected(id)
    const match = currentCollection?.features.find(row => row.id === id)
    setModelDistrict(match?.properties.mapping_status === 'verified' ? match.properties.district_id ?? '' : '')
  }

  const value = district ? districtValue(catalog, result, district.id, metric, effectivePhase) : null
  return <section id="city-map" className="astana-map-section" aria-labelledby="city-map-title">
    <div className="map-heading">
      <div><span className="section-kicker">{t("ГОРОД НА КАРТЕ")}</span><h2 id="city-map-title">{t("Районы Астаны")}</h2>
        <p>{t("Исследуйте границы и сравнивайте показатели учебного сценария.")}</p></div>
      <button className="secondary-action" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t("Свернуть карту") : t("Открыть карту")}
      </button>
    </div>
    {open && <>
      <p className="map-notice">{t("На карте шесть районов, в модели —")} {catalog.districts.length}{t(". Серый цвет означает отсутствие проверенной связи с данными. Совпадение названия не подтверждает совпадение границ.")}</p>
      {error && <p role="alert">{t(error)} <button type="button" onClick={() => setRetry(v => v + 1)}>{t("Повторить загрузку карты")}</button></p>}
      {!currentCollection && !error && <p role="status">{t("Загружаем границы районов…")}</p>}
      {currentCollection && data && <>
        <div className="map-controls">
          <label>{t("Показатель")}<select value={metric} onChange={e => setMetric(e.target.value as MapMetric)}>
            {Object.entries(mapMetrics).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
          </select></label>
          <fieldset><legend>{t("Состояние сценария")}</legend>
            {([['before', t("До")], ['after', t("После")], ['change', t("Изменение")]] as const).map(([key, label]) =>
              <button type="button" key={key} aria-pressed={effectivePhase === key} disabled={key !== 'before' && !result}
                onClick={() => setPhase(key)}>{t(label)}</button>)}
          </fieldset>
        </div>
        {!result && <p className="map-hint">{t("Для сравнения «После» выберите пять допустимых мероприятий: появится серверный предварительный расчёт.")}</p>}
        <div className="map-layout">
          <Suspense fallback={<p role="status">{t("Загружаем карту…")}</p>}>
            <Canvas data={data} selected={selected} phase={effectivePhase} onSelect={selectFeature} />
          </Suspense>
          <div className="map-inspector">
            <label>{t("Район на карте")}<select value={selected} onChange={e => selectFeature(e.target.value)}>
              <option value="">{t("Выберите район")}</option>
              {currentCollection.features.map(row => <option key={row.id} value={row.id}>{row.properties.name}</option>)}
            </select></label>
            {feature ? <>
              <h3>{t(feature.properties.name)}</h3>
              <p data-testid="map-mapping-status">{feature.properties.mapping_status === 'verified' ? t("Связь с датасетом проверена") : t("Нет сопоставленных данных")}</p>
              <p>{t(feature.properties.mapping_note)}</p>
              <a href={feature.properties.source_url} target="_blank" rel="noreferrer">{t("Граница в OpenStreetMap ↗")}</a>
              {candidate && feature.properties.mapping_status === 'unverified' && <button type="button" onClick={() => setModelDistrict(candidate.id)}>
                 {t("Открыть «")}{t(candidate.name)}{t("» в учебной модели")} </button>}
            </> : <p>{t("Нажмите на район или выберите его из списка. Улицы служат ориентиром; измерений по улицам пока нет.")}</p>}
            <div className="map-model-detail">
              <label>{t("Район учебной модели")}<select value={district?.id ?? ''} onChange={e => setModelDistrict(e.target.value)}>
                <option value="">{t("Выберите район модели")}</option>
                {catalog.districts.map(row => <option key={row.id} value={row.id}>{t(row.name)}</option>)}
              </select></label>
              {district && <>
                <p>{t(mapMetrics[metric])} · {t(district.name)}</p>
                <strong className="map-value" data-testid="map-model-value">{effectivePhase === 'change' && value !== null && value > 0 ? '+' : ''}{fmt(value)}</strong>
                <p className="map-hint">{t("Синтетические значения. Географическая связь проверяется отдельно.")}</p>
                <label>{t("Мероприятие")}<select value={initiative?.id ?? ''} disabled={!canEdit} onChange={e => setInitiativeId(e.target.value)}>
                  <option value="">{t("Выберите мероприятие")}</option>
                  {districtInitiatives.map(row => <option key={row.id} value={row.id}>{row.code} · {row.title}</option>)}
                </select></label>
                <button type="button" disabled={!canEdit || !initiative}
                  onClick={() => initiative && onTarget(initiative.id, district.id)}>{t("Назначить район мероприятию")}</button>
                {initiative && <p className="map-hint">{t("Текущий район:")} {catalog.districts.find(row => row.id ===
                  (scenario?.decisions.find(d => d.initiative_id === initiative.id)?.district_id ?? targets[initiative.id]))?.name ?? t("не выбран")}{t(". Назначение района не добавляет мероприятие в портфель.")}</p>}
                {!canEdit && <p className="map-hint">{t("Для назначения района откройте редактируемый сценарий.")}</p>}
              </>}
            </div>
          </div>
        </div>
        <div className="map-legend" aria-label={t("Легенда карты")}>
          <span><i style={{ background: '#a8b3c1' }} />{t("Нет сопоставленных данных")}</span>
          {(effectivePhase === 'change' ? [['#b94c4c', t("Снижение")], ['#e1e7ee', t("Без изменения")], ['#157a65', t("Рост")]]
            : [['#be514d', t("Ниже 40")], ['#bc8737', '40–60'], ['#187967', t("60 и выше")]]).map(([colour, label]) =>
              <span key={t(label)}><i style={{ background: colour }} />{t(label)}</span>)}
        </div>
        <div className="map-comparison" aria-label={t("Сравнение районов учебной модели")}>
          {catalog.districts.map(row => {
            const amount = districtValue(catalog, result, row.id, metric, effectivePhase)
            return <button type="button" key={row.id} aria-pressed={district?.id === row.id} onClick={() => setModelDistrict(row.id)}>
              <i style={{ background: valueColour(amount, effectivePhase) }} /><span>{t(row.name)}</span><b>{fmt(amount)}</b>
            </button>
          })}
        </div>
        <p className="map-provenance">{t("Границы:")} {currentCollection.attribution}  {t("· снимок")} {currentCollection.source_snapshot_at} ·
          <a href={currentCollection.license_url} target="_blank" rel="noreferrer"> ODbL</a> ·
          <a href={`/api/map/districts?dataset_id=${catalog.dataset.id}`} target="_blank" rel="noreferrer"> GeoJSON</a>{t(". Не кадастровые границы. Цветные карточки показывают модель, а не измерения на местности.")}</p>
      </>}
    </>}
  </section>
}
