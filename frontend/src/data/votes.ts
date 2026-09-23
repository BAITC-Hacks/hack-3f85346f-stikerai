import type { Direction } from '../types/domain'
export const voteOptions = [
  { id: 'school', title: 'Schools & kindergartens', district: 'Nura', cost: 24, votes: 1482, related: 'M7' },
  { id: 'transport', title: 'Better public transport', district: 'Nura', cost: 18, votes: 1276, related: 'M1' },
  { id: 'safety', title: 'Safer school crossings', district: 'Almaty', cost: 10, votes: 692, related: 'M11' },
]
export const citizenProjects: { id: string; title: string; category: Direction; basePoints: number }[] = [
  { id: 'school', title: 'School in Nura', category: 'social', basePoints: 350 },
  { id: 'bus', title: 'Better public transport', category: 'transport', basePoints: 210 },
  { id: 'park', title: 'Park in Saryarka', category: 'ecology', basePoints: 180 },
  { id: 'crossing', title: 'Safe school crossings', category: 'safety', basePoints: 180 },
  { id: 'app', title: 'Resident service platform', category: 'services', basePoints: 80 },
]
