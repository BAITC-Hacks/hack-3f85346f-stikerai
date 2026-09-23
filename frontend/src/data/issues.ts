import type { DistrictCode } from './citizens'
import type { Direction } from '../types/domain'
export type CitizenIssue = { id: string; title: string; district: DistrictCode; category: Direction; description: string; location: string; image?: string; reports: number; confirmations: number; status: string }
export const issues: CitizenIssue[] = [
  { id: 'issue-crossing', title: 'Unsafe pedestrian crossing', district: 'almaty', category: 'safety', description: 'The school crossing needs better visibility and a longer pedestrian signal.', location: 'School neighborhood', reports: 24, confirmations: 348, status: 'Under review' },
  { id: 'issue-school', title: 'Not enough kindergarten places', district: 'nura', category: 'social', description: 'Young families need more kindergarten places close to home.', location: 'Residential quarter', reports: 61, confirmations: 842, status: 'Confirmed by residents' },
  { id: 'issue-air', title: 'Heavy smoke on cold evenings', district: 'saryarka', category: 'ecology', description: 'Residents report smoke from private heating during the evening.', location: 'Private housing area', reports: 43, confirmations: 620, status: 'Under review' },
  { id: 'issue-traffic', title: 'Long queues on the bridge', district: 'esil', category: 'transport', description: 'The morning commute is slowed by queues at the bridge approach.', location: 'Bridge approach', reports: 37, confirmations: 514, status: 'Confirmed by residents' },
]
