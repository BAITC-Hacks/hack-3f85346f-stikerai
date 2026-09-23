import { useEffect, useReducer, useState } from 'react'
import { citizens, civicInitiatives, directions, supportByCode, type CivicInitiative, type DistrictCode } from '../data/citizens'
import { petitions, demoThresholds, type Petition } from '../data/petitions'
import { crowdfunding } from '../data/crowdfunding'
import { issues, type CitizenIssue } from '../data/issues'
import { citizenProjects, voteOptions } from '../data/votes'
import type { CatalogRead, ScenarioRead } from '../types/domain'
export type CivicEvent = { id: string; text: string; district: DistrictCode | 'city'; at: number }
export type CivicState = {
  version: 1; issues: CitizenIssue[]; petitions: Petition[]; initiatives: CivicInitiative[];
  confirmed: string[]; signed: string[]; supported: string[]; ideaVotes: string[]; ideaSigned: string[];
  vote: string | null; allocation: Record<string, number> | null;
  donations: { id: string; project: string; amount: number }[];
  pledges: { id: string; initiative: string; amount: number }[];
  events: CivicEvent[]; thresholds: number[];
}
export const initialCivic: CivicState = { version: 1, issues, petitions, initiatives: civicInitiatives, confirmed: [], signed: [], supported: [], ideaVotes: [], ideaSigned: [], vote: null, allocation: null, donations: [], pledges: [], events: [], thresholds: demoThresholds }
type Action =
  | { type: 'confirm' | 'sign' | 'support' | 'idea-vote' | 'idea-sign'; id: string }
  | { type: 'vote'; id: string }
  | { type: 'allocate'; points: Record<string, number> }
  | { type: 'donate'; id: string; amount: number }
  | { type: 'pledge'; id: string; amount: number }
  | { type: 'issue'; issue: CitizenIssue }
  | { type: 'petition'; petition: Petition }
  | { type: 'initiative'; initiative: CivicInitiative }
  | { type: 'comment'; id: string; text: string }
  | { type: 'thresholds'; values: number[] }
  | { type: 'reset' }
function event(state: CivicState, text: string, district: CivicEvent['district']): CivicState {
  return { ...state, events: [{ id: crypto.randomUUID(), text, district, at: Date.now() }, ...state.events].slice(0, 40) }
}
export function civicReducer(state: CivicState, action: Action): CivicState {
  if (action.type === 'reset') return structuredClone(initialCivic)
  if (action.type === 'confirm') {
    const item = state.issues.find(x => x.id === action.id)
    if (!item || state.confirmed.includes(item.id)) return state
    return event({ ...state, confirmed: [...state.confirmed, item.id] }, `A resident confirmed “${item.title}”`, item.district)
  }
  if (action.type === 'sign') {
    const item = state.petitions.find(x => x.id === action.id)
    if (!item || state.signed.includes(item.id) || item.status === 'Implemented' || item.status === 'Response published') return state
    return event({ ...state, signed: [...state.signed, item.id] }, `+1 signature · ${item.title}`, item.district)
  }
  if (action.type === 'vote') {
    const item = voteOptions.find(x => x.id === action.id)
    if (!item || state.vote !== null) return state
    return event({ ...state, vote: item.id }, `+1 vote · ${item.title}`, 'city')
  }
  if (action.type === 'allocate') {
    const values = Object.values(action.points)
    if (Object.keys(action.points).some(key => !citizenProjects.some(p => p.id === key)) || values.some(n => !Number.isInteger(n) || n < 0) || values.reduce((a, b) => a + b, 0) !== 10 || state.allocation) return state
    return event({ ...state, allocation: action.points }, 'A resident allocated 10 citizen points', 'city')
  }
  if (action.type === 'donate') {
    const project = crowdfunding.find(p => p.id === action.id)
    if (!project || !Number.isSafeInteger(action.amount) || action.amount < 1 || action.amount > 10000000) return state
    return event({ ...state, donations: [...state.donations, { id: crypto.randomUUID(), project: project.id, amount: action.amount }] }, `+₸${action.amount.toLocaleString('en-US')} demo support · ${project.title}`, project.district)
  }
  if (action.type === 'pledge') {
    const item = state.initiatives.find(p => p.id === action.id)
    if (!item || !Number.isSafeInteger(action.amount) || action.amount < 1 || action.amount > 10000000) return state
    return event({ ...state, pledges: [...state.pledges, { id: crypto.randomUUID(), initiative: item.id, amount: action.amount }] }, `A resident pledged demo funding · ${item.title}`, item.district)
  }
  if (action.type === 'support' || action.type === 'idea-vote' || action.type === 'idea-sign') {
    const item = state.initiatives.find(p => p.id === action.id)
    const key = action.type === 'support' ? 'supported' : action.type === 'idea-vote' ? 'ideaVotes' : 'ideaSigned'
    if (!item || state[key].includes(item.id)) return state
    return event({ ...state, [key]: [...state[key], item.id] }, `A resident ${action.type === 'idea-sign' ? 'signed for' : 'supported'} “${item.title}”`, item.district)
  }
  if (action.type === 'comment') {
    if (!action.text.trim() || action.text.length > 500 || !state.initiatives.some(x => x.id === action.id)) return state
    return { ...state, initiatives: state.initiatives.map(x => x.id === action.id ? { ...x, comments: [...x.comments, action.text.trim()] } : x) }
  }
  if (action.type === 'issue') return event({ ...state, issues: [action.issue, ...state.issues] }, `New issue · ${action.issue.title}`, action.issue.district)
  if (action.type === 'petition') return event({ ...state, petitions: [action.petition, ...state.petitions] }, `New petition · ${action.petition.title}`, action.petition.district)
  if (action.type === 'initiative') return event({ ...state, initiatives: [action.initiative, ...state.initiatives] }, `New idea · ${action.initiative.title}`, action.initiative.district)
  if (action.type === 'thresholds' && action.values.length === 3 && action.values.every((n, i, list) => Number.isSafeInteger(n) && n > 0 && (i === 0 || n > list[i - 1]))) return { ...state, thresholds: action.values }
  return state
}
function restore(): CivicState {
  try {
    const stored = JSON.parse(localStorage.getItem('astana.civic.v1') || 'null')
    if (stored?.version !== 1) return structuredClone(initialCivic)
    for (const [key, value] of Object.entries(initialCivic)) if (Array.isArray(value) && !Array.isArray(stored[key])) return structuredClone(initialCivic)
    if (!stored.issues.every((x: CitizenIssue) => typeof x?.title === 'string' && x.district in citizens) || !stored.petitions.every((x: Petition) => typeof x?.title === 'string' && x.district in citizens) || !stored.initiatives.every((x: CivicInitiative) => typeof x?.title === 'string' && Array.isArray(x.comments))) return structuredClone(initialCivic)
    return stored
  } catch { return structuredClone(initialCivic) }
}
export function useCivic() {
  const [state, dispatch] = useReducer(civicReducer, undefined, restore)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => { try { localStorage.setItem('astana.civic.v1', JSON.stringify(state)); setStorageError(false) } catch { setStorageError(true) } }, [state])
  const projects = crowdfunding.map(p => ({ ...p, raised: p.raised + state.donations.filter(d => d.project === p.id).reduce((s, d) => s + d.amount, 0), supporters: p.supporters + Number(state.donations.some(d => d.project === p.id)) }))
  const allPetitions = state.petitions.map(p => ({ ...p, signatures: p.signatures + Number(state.signed.includes(p.id)) }))
  const allIssues = state.issues.map(p => ({ ...p, confirmations: p.confirmations + Number(state.confirmed.includes(p.id)) }))
  const allIdeas = state.initiatives.map(p => ({ ...p, supporters: p.supporters + Number(state.supported.includes(p.id)), votes: p.votes + Number(state.ideaVotes.includes(p.id)), signatures: p.signatures + Number(state.ideaSigned.includes(p.id)), pledged: p.pledged + state.pledges.filter(d => d.initiative === p.id).reduce((s, d) => s + d.amount, 0) }))
  return { state, dispatch, storageError, projects, petitions: allPetitions, issues: allIssues, initiatives: allIdeas }
}
export type Civic = ReturnType<typeof useCivic>
export function civicSummary(civic: Civic, catalog: CatalogRead | null, scenario: ScenarioRead | null) {
  const selected = scenario?.decisions.map(d => ({ decision: d, item: catalog?.initiatives.find(i => i.id === d.initiative_id) })).filter(x => x.item) ?? []
  const alignment = selected.length ? selected.reduce((sum, x) => sum + (supportByCode[x.item!.code] ?? 0), 0) / selected.length : null
  const relatedProjects = civic.projects.filter(p => selected.some(({ decision, item }) => p.related.includes(item!.code) && (p.district === 'city' || item!.scope === 'city' || catalog?.districts.find(d => d.id === decision.district_id)?.code === p.district)))
  const funding = relatedProjects.reduce((sum, p) => sum + p.raised, 0)
  const government = directions.map(d => ({ ...d, amount: selected.filter(x => x.item!.direction === d.id).reduce((sum, x) => sum + x.item!.cost, 0) }))
  return { selected, alignment, funding, government, relatedProjects }
}
