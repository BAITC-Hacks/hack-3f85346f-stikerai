import { useState } from 'react'
import { Compass, Layers3, MapPin, ArrowUpRight } from 'lucide-react'
import { citizens, districtNames, fmt, metricKeys, metricNames, type DistrictCode } from '../data/citizens'
import type { CatalogRead, CalculationRead } from '../types/domain'
import type { Civic } from '../hooks/useCivic'
import { Badge, Progress } from './UI'
const shapes: { id: DistrictCode; path: string; x: number; y: number }[] = [
  { id: 'saryarka', path: 'M55 58L203 35L279 100L253 210L170 241L47 187Z', x: 150, y: 129 },
  { id: 'baikonur', path: 'M218 35L403 45L456 129L384 192L265 204L292 98Z', x: 352, y: 111 },
  { id: 'almaty', path: 'M467 141L566 175L558 359L454 401L376 317L397 204Z', x: 478, y: 262 },
  { id: 'esil', path: 'M176 260L270 226L363 222L362 310L439 413L316 482L203 419L160 336Z', x: 296, y: 345 },
  { id: 'nura', path: 'M43 206L148 257L134 334L180 432L102 469L30 387L19 287Z', x: 97, y: 328 },
]
export function CityMap({ catalog, shown, civic, district, onDistrict }: { catalog: CatalogRead; shown: CalculationRead; civic: Civic; district: DistrictCode; onDistrict: (d: DistrictCode) => void }) {
  const [hover, setHover] = useState<DistrictCode | null>(null)
  const active = hover ?? district
  const item = catalog.districts.find(d => d.code === active)!
  const result = shown.districts.find(d => d.district_id === item.id)!
  const weakest = metricKeys.reduce((a, b) => result.after[a] < result.after[b] ? a : b)
  return <div className="map-card"><div className="map-toolbar"><span><span className="live-dot" /> DISTRICT INTELLIGENCE</span><span><Layers3 size={14} /> 5 districts</span></div>
    <svg className="city-map" viewBox="0 0 600 515" role="group" aria-label="Interactive abstract map of Astana districts">
      <defs><pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dbe4eb" strokeWidth=".5" /></pattern><pattern id="city-blocks" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect x="3" y="3" width="12" height="12" rx="2" fill="none" stroke="#ccd8e2" strokeWidth=".65" /></pattern></defs>
      <rect width="600" height="515" fill="url(#map-grid)" />
      <path className="river-outline" d="M-10 183C70 201 120 263 173 249S265 210 341 212S411 180 459 145S548 149 622 194" />
      <path className="river" d="M-10 183C70 201 120 263 173 249S265 210 341 212S411 180 459 145S548 149 622 194" />
      {shapes.map(shape => { const d = catalog.districts.find(d => d.code === shape.id)!; const score = shown.districts.find(r => r.district_id === d.id)!.final_score; return <g key={shape.id} className={`map-district ${district === shape.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Explore ${districtNames[shape.id]}`} aria-pressed={district === shape.id} onClick={() => onDistrict(shape.id)} onMouseEnter={() => setHover(shape.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(shape.id)} onBlur={() => setHover(null)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDistrict(shape.id) } }}><path className="district-area" d={shape.path} /><path d={shape.path} fill="url(#city-blocks)" pointerEvents="none" /><rect className="map-label-bg" x={shape.x - 53} y={shape.y - 23} width="106" height={shape.id === 'nura' ? 72 : 55} rx="10" /><text x={shape.x} y={shape.y - 4} className="map-name">{districtNames[shape.id].toUpperCase()}</text><text x={shape.x} y={shape.y + 17} className="map-score">{fmt(score, 2)}</text>{shape.id === 'nura' && <text x={shape.x} y={shape.y + 36} className="map-priority">HIGH PRIORITY</text>}</g> })}
      <g className="map-baiterek" transform="translate(329 244)"><circle r="17" /><path d="M-8 0L0 12L8 0M0 12V23" /><circle cy="-6" r="5" /></g><text x="280" y="193" className="river-label">ISHIM RIVER</text>
    </svg>
    <div className="map-info"><div><span className="eyebrow">DISTRICT SPOTLIGHT</span><h3>{districtNames[active]} <Badge tone={active === 'nura' ? 'amber' : 'blue'}>{active === 'nura' ? 'Priority area' : 'City district'}</Badge></h3></div><div className="map-info-stats"><span><small>Population weight</small><b>{fmt(item.population_share * 100)}%</b></span><span><small>Citizen pulse</small><b>{citizens[active].pulse}%</b></span><span><small>Petitions</small><b>{civic.petitions.filter(p => p.district === active).length}</b></span><span><small>Projects & ideas</small><b>{civic.projects.filter(p => p.district === active).length + civic.initiatives.filter(p => p.district === active).length}</b></span></div><p><MapPin size={13} /> Main concern: <strong>{metricNames[weakest]}</strong></p></div>
    <div className="map-footer"><span><i className="legend-dot blue" /> Stable <i className="legend-dot gold" /> Priority</span><span>Abstract district map · demo <Compass size={17} /></span></div>
  </div>
}
export function DistrictCard({ code, catalog, shown, civic, onPulse }: { code: DistrictCode; catalog: CatalogRead; shown: CalculationRead; civic: Civic; onPulse: () => void }) {
  const d = catalog.districts.find(d => d.code === code)!
  const r = shown.districts.find(r => r.district_id === d.id)!
  const sorted = [...metricKeys].sort((a, b) => r.after[a] - r.after[b])
  return <article className="card district-detail"><div className="section-title"><div><p className="eyebrow">DISTRICT BRIEF</p><h2>{districtNames[code]}</h2></div><strong className="district-big">{fmt(r.final_score, 2)}</strong></div><div className="strengths"><span><small>Main weakness</small>{metricNames[sorted[0]]}</span><span><small>Main strength</small>{metricNames[sorted[9]]}</span></div><div className="indicator-grid">{metricKeys.map(m => <div key={m}><div><span>{metricNames[m]}</span><b>{fmt(r.after[m], 1)}</b></div><Progress value={r.after[m]} tone={r.after[m] < 40 ? 'critical' : ''} /></div>)}</div><div className="citizen-context"><p className="eyebrow">CITIZEN SIGNALS · FICTIONAL DEMO</p><h3>{citizens[code].concern}</h3><p>{fmt(citizens[code].signals)} resident signals · {civic.petitions.filter(p => p.district === code).length} petitions · {civic.projects.filter(p => p.district === code).length} community projects</p><button className="text-link" onClick={onPulse}>View City Pulse <ArrowUpRight size={16} /></button></div></article>
}
