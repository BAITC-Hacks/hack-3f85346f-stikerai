import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import type { CalculationRead, CatalogRead, DecisionSelect, Direction, ExplanationRead, Metric, ScenarioRead } from '../types/domain'

const storage = {
  get(key: string) { try { return localStorage.getItem(key) } catch { return null } },
  set(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* Session still works without local storage. */ } },
  remove(key: string) { try { localStorage.removeItem(key) } catch { /* Optional persistence. */ } },
}
let sessionReady: Promise<unknown> | null = null
function initializeSession() {
  sessionReady ??= api('/session', 'POST').catch(error => { sessionReady = null; throw error })
  return sessionReady
}

export function useSimulator() {
  const [catalog, setCatalog] = useState<CatalogRead | null>(null)
  const [scenario, setScenario] = useState<ScenarioRead | null>(null)
  const [history, setHistory] = useState<ScenarioRead[]>([])
  const [result, setResult] = useState<CalculationRead | null>(null)
  const [explanation, setExplanation] = useState<ExplanationRead | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [teamName, setTeamName] = useState('Команда Астаны')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const inflight = useRef(false)

  async function loadScenario(id: string, signal?: AbortSignal) {
    const current = await api<ScenarioRead>(`/scenarios/${id}`, 'GET', undefined, signal)
    const data = await api<CatalogRead>(`/catalog?dataset_id=${current.dataset_id}`, 'GET', undefined, signal)
    let calculation: CalculationRead | null = null
    let ai: ExplanationRead | null = null
    if (current.status !== 'draft') {
      calculation = await api<CalculationRead>(`/scenarios/${id}/result`, 'GET', undefined, signal)
      ai = await api<ExplanationRead>(`/scenarios/${id}/explanation`, 'GET', undefined, signal)
    } else if (current.decisions.length === 5) {
      calculation = await api<CalculationRead>(`/scenarios/${id}/preview`, 'POST', { expected_revision: current.revision }, signal)
    }
    if (signal?.aborted) return
    setCatalog(data); setScenario(current); setResult(calculation); setExplanation(ai)
    setTargets(Object.fromEntries(current.decisions.filter(d => d.district_id).map(d => [d.initiative_id, d.district_id!])) )
    storage.set('stikerai.scenario', current.id)
  }

  useEffect(() => {
    const controller = new AbortController()
    async function boot() {
      await initializeSession()
      const rows = await api<ScenarioRead[]>('/scenarios', 'GET', undefined, controller.signal)
      if (controller.signal.aborted) return
      setHistory(rows)
      const current = rows.find(row => row.id === storage.get('stikerai.scenario')) ?? rows[0]
      if (current) await loadScenario(current.id, controller.signal)
      else {
        const data = await api<CatalogRead>('/catalog', 'GET', undefined, controller.signal)
        if (!controller.signal.aborted) setCatalog(data)
      }
    }
    void boot().catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!scenario || explanation?.status !== 'running') return
    const controller = new AbortController()
    const id = scenario.id
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const next = await api<ExplanationRead>(`/scenarios/${id}/explanation`, 'GET', undefined, controller.signal)
        if (!controller.signal.aborted) setExplanation(next)
        if (next.status === 'running' && !controller.signal.aborted) timer = setTimeout(poll, 2000)
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message)
          timer = setTimeout(poll, 5000)
        }
      }
    }
    timer = setTimeout(poll, 1200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [scenario?.id, explanation?.status])

  async function execute(action: () => Promise<void>) {
    if (inflight.current) return
    inflight.current = true; setBusy(true); setError('')
    try { await action() }
    catch (e) {
      setError((e as Error).message)
      if (e instanceof ApiError && e.code === 'STALE_REVISION' && scenario) {
        try { await loadScenario(scenario.id) } catch { /* Keep actionable original error. */ }
      }
    } finally { inflight.current = false; setBusy(false) }
  }

  async function create(copy = false) {
    if (!catalog) return
    const key = `stikerai.request.${copy ? scenario?.id : 'new'}`
    const requestId = storage.get(key) ?? crypto.randomUUID()
    storage.set(key, requestId)
    const current = copy && scenario
      ? await api<ScenarioRead>(`/scenarios/${scenario.id}/copy`, 'POST', { request_id: requestId })
      : await api<ScenarioRead>('/scenarios', 'POST', { dataset_id: catalog.dataset.id, team_name: teamName, request_id: requestId })
    await loadScenario(current.id)
    storage.remove(key)
    setHistory(await api<ScenarioRead[]>('/scenarios'))
  }

  async function save(choices: DecisionSelect[]) {
    if (!scenario) return
    const current = await api<ScenarioRead>(`/scenarios/${scenario.id}/decisions`, 'PUT', {
      expected_revision: scenario.revision, decisions: choices,
    })
    setScenario(current); setResult(null); setExplanation(null)
    if (current.decisions.length === 5) {
      const next = await api<CalculationRead>(`/scenarios/${current.id}/preview`, 'POST', { expected_revision: current.revision })
      setResult(next)
    }
  }

  async function toggle(initiativeId: string) {
    if (!scenario) return
    const exists = scenario.decisions.some(d => d.initiative_id === initiativeId)
    const choices = scenario.decisions.filter(d => d.initiative_id !== initiativeId)
      .map(d => ({ initiative_id: d.initiative_id, district_id: d.district_id }))
    if (!exists) choices.push({ initiative_id: initiativeId, district_id: targets[initiativeId] || null })
    await save(choices)
  }

  async function analyze(civicContext?: unknown) {
    if (!scenario) return
    const calculation = await api<CalculationRead>(`/scenarios/${scenario.id}/submit`, 'POST', { expected_revision: scenario.revision })
    setResult(calculation)
    setScenario({ ...scenario, status: 'evaluated', revision: scenario.revision + 1 })
    setScenario(await api<ScenarioRead>(`/scenarios/${scenario.id}`))
    setExplanation(await api<ExplanationRead>(`/scenarios/${scenario.id}/explanation`, 'POST', civicContext))
  }

  return { catalog, scenario, history, result, explanation, targets, setTargets, teamName, setTeamName,
    busy, error, execute, create, save, toggle, analyze, loadScenario, setExplanation }
}
export type Simulator = ReturnType<typeof useSimulator>
