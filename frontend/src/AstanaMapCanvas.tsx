import { t } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { Map as LibreMap, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, MultiPolygon } from 'geojson'
import type { MapPhase } from './mapData'
import 'maplibre-gl/dist/maplibre-gl.css'

const baseStyle: StyleSpecification = {
  version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eaf0f7' } }],
}
const tileStyle = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron'
// MapLibre 6's relative default worker URL is not rewritten by Vite's dependency optimizer.
setWorkerUrl(workerUrl)

function fitFeatures(map: LibreMap, features: FeatureCollection<MultiPolygon>['features']) {
  const points = features.flatMap(row => row.geometry.coordinates.flat(2))
  if (!points.length) return
  const lngs = points.map(p => p[0]), lats = points.map(p => p[1])
  map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    { padding: 35, duration: 0, maxZoom: 12 })
}
type Props = {
  data: FeatureCollection<MultiPolygon>
  selected: string
  phase: MapPhase
  onSelect: (id: string) => void
}

export default function AstanaMapCanvas({ data, selected, phase, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const current = useRef({ data, selected, phase, onSelect })
  current.current = { data, selected, phase, onSelect }
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [streets, setStreets] = useState(false)
  const [streetError, setStreetError] = useState('')

  function update(map: LibreMap) {
    if (!map.getSource('districts')) return
    const { data, selected, phase } = current.current
    ;(map.getSource('districts') as GeoJSONSource).setData(data)
    map.setPaintProperty('district-fill', 'fill-color', [
      'case', ['==', ['get', 'value'], null], '#a8b3c1',
      phase === 'change'
        ? ['case', ['<', ['get', 'value'], -0.001], '#b94c4c', ['>', ['get', 'value'], 0.001], '#157a65', '#e1e7ee']
        : ['step', ['get', 'value'], '#be514d', 40, '#bc8737', 60, '#187967'],
    ])
    map.setFilter('district-selected', ['==', ['to-string', ['id']], selected])
  }

  useEffect(() => {
    if (!container.current) return
    let map: LibreMap
    try {
      map = new LibreMap({ container: container.current, style: baseStyle,
        center: [71.43, 51.13], zoom: 10, minZoom: 8, maxZoom: 17,
        attributionControl: { compact: false }, cooperativeGestures: true })
    } catch {
      setError('Карта WebGL недоступна. Выберите район в списке — показатели и выбор сценария доступны.')
      return
    }
    mapRef.current = map
    fitFeatures(map, current.current.data.features)
    const addDistricts = () => {
      if (map.getSource('districts')) return
      map.addSource('districts', { type: 'geojson', data: current.current.data,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>' })
      map.addLayer({ id: 'district-fill', type: 'fill', source: 'districts', paint: { 'fill-opacity': 0.34 } })
      map.addLayer({ id: 'district-outline', type: 'line', source: 'districts', paint: { 'line-color': '#526b87', 'line-width': 1.5 } })
      map.addLayer({ id: 'district-selected', type: 'line', source: 'districts',
        paint: { 'line-color': '#1467b4', 'line-width': 4 } })
      update(map)
    }
    map.on('style.load', addDistricts)
    map.on('idle', () => { if (map.getSource('districts') && map.isSourceLoaded('districts')) setReady(true) })
    map.on('click', 'district-fill', e => {
      const id = e.features?.[0]?.id
      if (id !== undefined) current.current.onSelect(String(id))
    })
    map.on('mouseenter', 'district-fill', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'district-fill', () => { map.getCanvas().style.cursor = '' })
    map.on('error', () => setStreetError('Часть подложки недоступна. Границы районов загружены отдельно.'))
    const observer = new ResizeObserver(() => {
      map.resize()
      const { data, selected } = current.current
      const feature = data.features.find(row => String(row.id) === selected)
      fitFeatures(map, feature ? [feature] : data.features)
    })
    observer.observe(container.current)
    return () => { observer.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map?.isStyleLoaded()) update(map)
  }, [data, selected, phase])

  useEffect(() => {
    const map = mapRef.current
    const feature = current.current.data.features.find(row => String(row.id) === selected)
    if (!map || !feature) return
    fitFeatures(map, [feature])
  }, [selected])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const controller = new AbortController()
    setStreetError('')
    if (!streets) {
      if (Object.keys(map.getStyle().sources).some(id => id !== 'districts')) map.setStyle(baseStyle)
      return () => controller.abort()
    }
    void fetch(tileStyle, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(response => { if (!response.ok) throw new Error(); return response.json() })
      .then((style: StyleSpecification) => { if (!controller.signal.aborted) map.setStyle(style) })
      .catch(() => { if (!controller.signal.aborted) setStreetError('Улицы не загрузились. Можно продолжать работу с границами районов.') })
    return () => controller.abort()
  }, [streets, ready])

  return <div className="map-canvas-wrap">
    <div className="map-canvas-actions">
      <button type="button" disabled={!ready} aria-label={t('Увеличить масштаб')} onClick={() => mapRef.current?.zoomIn()}>+</button>
      <button type="button" disabled={!ready} aria-label={t('Уменьшить масштаб')} onClick={() => mapRef.current?.zoomOut()}>−</button>
      <label><input type="checkbox" checked={streets} disabled={!ready} onChange={e => setStreets(e.target.checked)} />  {t("Улицы · OpenFreeMap")}</label>
      <button type="button" disabled={!ready} onClick={() => mapRef.current && fitFeatures(mapRef.current, current.current.data.features)}>{t("Вся Астана")}</button>
    </div>
    <div ref={container} className="astana-map-canvas" aria-label={t("Интерактивная карта районов Астаны")} data-testid="astana-map-canvas" data-ready={ready} />
    {error && <p role="status" className="map-notice">{t(error)}</p>}
    {streetError && <p role="status" className="map-notice">{t(streetError)}</p>}
    <small>{t("Масштаб — кнопками +/− или Ctrl + колесо. Улицы загружаются из внешнего сервиса по включению слоя.")}</small>
  </div>
}
