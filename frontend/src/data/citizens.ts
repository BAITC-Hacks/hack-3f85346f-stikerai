import type { Direction, Metric } from '../types/domain'
export type DistrictCode = 'esil' | 'almaty' | 'saryarka' | 'baikonur' | 'nura'
export const districtNames: Record<DistrictCode, string> = { esil: 'Yesil', almaty: 'Almaty', saryarka: 'Saryarka', baikonur: 'Baikonur', nura: 'Nura' }
export const directions: { id: Direction; name: string; short: string; metrics: Metric[] }[] = [
  { id: 'transport', name: 'Transportation', short: 'Transport', metrics: ['t1', 't2'] },
  { id: 'ecology', name: 'Ecology', short: 'Ecology', metrics: ['e1', 'e2'] },
  { id: 'social', name: 'Social infrastructure', short: 'Social', metrics: ['s1', 's2'] },
  { id: 'safety', name: 'Safety', short: 'Safety', metrics: ['b1', 'b2'] },
  { id: 'services', name: 'City services', short: 'Services', metrics: ['c1', 'c2'] },
]
export const metricNames: Record<Metric, string> = { t1: 'Road congestion relief', t2: 'Public transport', e1: 'Green space', e2: 'Air quality', s1: 'Schools & kindergartens', s2: 'Healthcare', b1: 'Street safety', b2: 'Road safety', c1: 'Utilities', c2: 'Resident services' }
export const metricKeys = Object.keys(metricNames) as Metric[]
export const initiativeNames: Record<string, string> = { M1: 'Dedicated bus lanes', M2: 'Adaptive traffic lights', M3: 'LRT extension', M4: 'Neighborhood park', M5: 'Clean heating for private homes', M6: 'City greening & wind protection', M7: 'Modular school + kindergarten', M8: 'Family health center', M9: 'Neighborhood sports hubs', M10: 'Street lighting + Safe City', M11: 'Safe crossings & school zones', M12: 'Unified resident services', M13: 'Heating & water modernization', M14: 'Emergency utility teams' }
// Fictional citizen context. Never consumed by the official scoring engine.
export const citizens: Record<DistrictCode, { pulse: number; concern: string; priority: Direction; signals: number; growth: number }> = {
  esil: { pulse: 78, concern: 'Bridge congestion', priority: 'transport', signals: 2840, growth: 11 },
  almaty: { pulse: 72, concern: 'Safer school crossings', priority: 'safety', signals: 736, growth: 8 },
  saryarka: { pulse: 67, concern: 'Cleaner air in winter', priority: 'ecology', signals: 2106, growth: 34 },
  baikonur: { pulse: 76, concern: 'Reliable local services', priority: 'services', signals: 942, growth: 7 },
  nura: { pulse: 63, concern: 'More schools in Nura', priority: 'social', signals: 3481, growth: 23 },
}
export const supportByCode: Record<string, number> = { M1: 86, M2: 72, M3: 76, M4: 88, M5: 89, M6: 73, M7: 91, M8: 87, M9: 78, M10: 83, M11: 90, M12: 79, M13: 81, M14: 74 }
export type CivicInitiative = { id: string; title: string; district: DistrictCode; category: Direction; problem: string; solution: string; impact: string; cost: number; supporters: number; votes: number; comments: string[]; pledged: number; signatures: number; stage: number; related: string }
export const civicInitiatives: CivicInitiative[] = [
  { id: 'idea-park', title: 'Turn unused land into a neighborhood park', district: 'saryarka', category: 'ecology', problem: 'Families have few green spaces within walking distance.', solution: 'Create a pocket park with shade, paths and seating.', impact: 'An accessible space to meet, walk and play.', cost: 8000000, supporters: 1284, votes: 1104, comments: ['Please include a wheelchair-accessible path.'], pledged: 3200000, signatures: 846, stage: 1, related: 'M4' },
  { id: 'idea-route', title: 'A safer walk to school', district: 'nura', category: 'safety', problem: 'School routes cross poorly lit roads.', solution: 'Add safe crossings and continuous lighting.', impact: 'Safer journeys for children and caregivers.', cost: 2500000, supporters: 648, votes: 587, comments: ['The crossing by the clinic is a priority.'], pledged: 620000, signatures: 420, stage: 2, related: 'M11' },
]
export const fmt = (n: number, digits = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
export const tenge = (n: number) => n >= 1000000 ? `₸${fmt(n / 1000000, 1)}M` : `₸${fmt(n)}`
