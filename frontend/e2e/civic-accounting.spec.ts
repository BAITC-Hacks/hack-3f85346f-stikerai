import { test, expect } from '@playwright/test'
import { civicReducer, initialCivic, civicSummary, type Civic } from '../src/hooks/useCivic'
import { crowdfunding } from '../src/data/crowdfunding'
import type { CatalogRead, ScenarioRead } from '../src/types/domain'

test('civic reducer rejects repeat votes, duplicate signatures, invalid funding and point overflow', () => {
  const initial = structuredClone(initialCivic)
  const voted = civicReducer(initial, { type: 'vote', id: 'school' })
  expect(civicReducer(voted, { type: 'vote', id: 'transport' })).toEqual(voted)
  const signed = civicReducer(initial, { type: 'sign', id: 'petition-bus' })
  expect(civicReducer(signed, { type: 'sign', id: 'petition-bus' })).toEqual(signed)
  for (const amount of [-1, 0, 0.5, Infinity, 10000001]) {
    expect(civicReducer(initial, { type: 'donate', id: 'fund-play', amount })).toEqual(initial)
  }
  expect(civicReducer(initial, { type: 'donate', id: 'unknown-project', amount: 1000 })).toEqual(initial)
  expect(civicReducer(initial, { type: 'allocate', points: { school: 11 } })).toEqual(initial)
  expect(civicReducer(initial, { type: 'allocate', points: { school: 8, park: -1 } })).toEqual(initial)
  expect(civicReducer(initial, { type: 'allocate', points: { fake: 10 } })).toEqual(initial)
  const allocated = civicReducer(initial, { type: 'allocate', points: { school: 4, bus: 2, park: 2, app: 2 } })
  expect(allocated.allocation).toEqual({ school: 4, bus: 2, park: 2, app: 2 })
  expect(civicReducer(allocated, { type: 'allocate', points: { park: 10 } })).toEqual(allocated)
  expect(initial).toEqual(initialCivic)
})

test('alignment uses a mean and linked community funding is counted once with district matching', async ({ request }) => {
  const catalog: CatalogRead = await (await request.get('/api/catalog')).json()
  const state = structuredClone(initialCivic)
  const civic: Civic = { state, dispatch: () => {}, storageError: false, projects: crowdfunding, petitions: state.petitions, issues: state.issues, initiatives: state.initiatives }
  const nura = catalog.districts.find(d => d.code === 'nura')!
  const scenario: ScenarioRead = { id: 'test', dataset_id: catalog.dataset.id, team_name: 'QA', status: 'draft', created_at: '', submitted_at: null, initial_budget: 100, spent_budget: 34, remaining_budget: 66, revision: 0,
    decisions: ['M7', 'M9'].map(code => ({ id: code, scenario_id: 'test', dataset_id: catalog.dataset.id, initiative_id: catalog.initiatives.find(i => i.code === code)!.id, district_id: nura.id, created_at: '' })) }
  const before = JSON.stringify(catalog)
  const summary = civicSummary(civic, catalog, scenario)
  expect(summary.alignment).toBe(84.5)
  expect(summary.relatedProjects.map(p => p.id)).toEqual(['fund-play'])
  expect(summary.funding).toBe(11840000)
  const elsewhere = { ...scenario, decisions: scenario.decisions.map(d => ({ ...d, district_id: catalog.districts.find(d => d.code === 'esil')!.id })) }
  expect(civicSummary(civic, catalog, elsewhere).funding).toBe(0)
  expect(civicSummary(civic, catalog, null).alignment).toBeNull()
  expect(JSON.stringify(catalog)).toBe(before)
})
