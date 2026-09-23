import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { FeatureCollection, Point } from 'geojson'

type SchoolProperties = {
  name?: string
  'name:ru'?: string
  'name:kk'?: string
  operator?: string
  osm_type?: string
  osm_id?: number
  osm_url?: string
}

type SchoolsCollection = FeatureCollection<Point, SchoolProperties> & {
  source_snapshot: string
  attribution: string
  license: string
}

export function CityContextMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [summary, setSummary] = useState('Загружаем снимок объектов OpenStreetMap…')
  const [sourceDate, setSourceDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([51.1694, 71.4491], 11)
    const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map)

    const controller = new AbortController()
    void fetch('/api/context/schools', { headers: { Accept: 'application/geo+json' }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json() as SchoolsCollection
      })
      .then((collection) => {
        const points = L.geoJSON(collection, {
          pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
            radius: 5,
            color: '#fbfaf4',
            weight: 1.5,
            fillColor: '#a7473f',
            fillOpacity: 0.92,
          }),
          onEachFeature: (feature, layer) => {
            const properties = feature.properties ?? {}
            const name = properties['name:ru'] || properties.name || properties['name:kk'] || 'Без названия в OSM'
            const popup = document.createElement('div')
            const title = document.createElement('strong')
            title.textContent = name
            popup.append(title)
            const detail = document.createElement('div')
            detail.textContent = `OSM ${properties.osm_type}/${properties.osm_id}`
            popup.append(detail)
            if (properties.operator) {
              const operator = document.createElement('div')
              operator.textContent = `Оператор: ${properties.operator}`
              popup.append(operator)
            }
            if (properties.osm_url) {
              const link = document.createElement('a')
              link.href = properties.osm_url
              link.target = '_blank'
              link.rel = 'noreferrer'
              link.textContent = 'Открыть объект в OpenStreetMap'
              popup.append(link)
            }
            layer.bindPopup(popup)
          },
        }).addTo(map)
        const count = collection.features.length
        setSummary(`${count} объектов с тегом amenity=school в снимке`)
        setSourceDate(collection.source_snapshot)
        if (points.getBounds().isValid()) map.fitBounds(points.getBounds().pad(0.08), { maxZoom: 12 })
        window.setTimeout(() => map.invalidateSize(), 0)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить слой')
        setSummary('Слой объектов не загрузился')
      })

    return () => {
      controller.abort()
      map.remove()
    }
  }, [])

  return (
    <section className="city-context-view" aria-labelledby="city-context-title">
      <div className="section-heading">
        <div><span className="section-kicker">РЕАЛЬНЫЙ КАРТОГРАФИЧЕСКИЙ КОНТЕКСТ · НЕ ВЛИЯЕТ НА СЧЁТ</span><h2 id="city-context-title">Школы, отмеченные на карте</h2></div>
        <span className="context-source-status">OpenStreetMap · ODbL</span>
      </div>
      <p className="city-context-copy">Точки показывают объекты, которые участники OpenStreetMap пометили как amenity=school. Это не официальный реестр: запись может быть неполной, устаревшей или относиться к колледжу/дошкольной организации. Проверяйте площадку на месте и сверяйте с Управлением образования.</p>
      <div className="city-context-map" ref={containerRef} role="application" aria-label="Карта объектов, помеченных как школы в OpenStreetMap" />
      <div className="city-context-meta"><span>{summary}</span>{sourceDate && <span>Данные OSM на {sourceDate}</span>}{error && <span role="status">Ошибка слоя: {error}</span>}</div>
      <small>Снимок: <a href="https://overpass-api.de/">Overpass API</a> · Геоданные © OpenStreetMap contributors, лицензия <a href="https://www.openstreetmap.org/copyright">ODbL</a>. Подложка OSM загружается по видимой области и зависит от доступности публичного сервера; для эксплуатации нужен согласованный тайл-провайдер.</small>
    </section>
  )
}
