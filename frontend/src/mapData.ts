import type { CalculationRead, CatalogRead, MapDistrictCollection, Metric } from './types/domain'

export const mapMetrics: Record<Metric | 'score', string> = {
  score: 'Оценка района', t1: 'Разгрузка дорог', t2: 'Общественный транспорт',
  e1: 'Озеленение', e2: 'Качество воздуха', s1: 'Школы и детсады',
  s2: 'Первичная медицина', b1: 'Безопасность улиц', b2: 'Дорожная безопасность',
  c1: 'Надёжность ЖКХ', c2: 'Обращения жителей',
}
export type MapMetric = keyof typeof mapMetrics
export type MapPhase = 'before' | 'after' | 'change'

export function districtValue(catalog: CatalogRead, result: CalculationRead | null, id: string,
  metric: MapMetric, phase: MapPhase): number | null {
  const before = catalog.baseline.districts.find(row => row.district_id === id)
  const after = result?.districts.find(row => row.district_id === id)
  if (!before || (phase !== 'before' && !after)) return null
  const initial = metric === 'score' ? before.final_score : before.after[metric]
  const final = after ? (metric === 'score' ? after.final_score : after.after[metric]) : null
  return phase === 'before' ? initial : phase === 'after' ? final : final! - initial
}

export function mapFeatures(collection: MapDistrictCollection, catalog: CatalogRead,
  result: CalculationRead | null, metric: MapMetric, phase: MapPhase) {
  return {
    type: 'FeatureCollection' as const,
    features: collection.features.map(feature => ({
      ...feature, properties: { ...feature.properties,
        value: feature.properties.mapping_status === 'verified' && feature.properties.district_id
          ? districtValue(catalog, result, feature.properties.district_id, metric, phase) : null },
    })),
  }
}

export function valueColour(value: number | null, phase: MapPhase): string {
  if (value === null) return '#a8b3c1'
  if (phase === 'change') return value < -0.001 ? '#b94c4c' : value > 0.001 ? '#157a65' : '#e1e7ee'
  return value < 40 ? '#be514d' : value < 60 ? '#bc8737' : '#187967'
}
