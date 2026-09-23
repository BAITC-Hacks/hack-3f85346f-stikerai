import { useState, type FormEvent } from 'react'
import { districtNames, directions, type DistrictCode } from '../data/citizens'
import type { Direction } from '../types/domain'
import type { Civic } from '../hooks/useCivic'
import { Dialog } from './UI'
export type FormKind = 'issue' | 'petition' | 'initiative'
export function CivicForm({ kind, district, civic, onClose, notify }: { kind: FormKind; district: DistrictCode; civic: Civic; onClose: () => void; notify: (text: string) => void }) {
  const [image, setImage] = useState<string>()
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const title = { issue: 'Report an issue', petition: 'Start a petition', initiative: 'Propose an initiative' }[kind]
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()
    if (!value('title') || !value('description') || (kind !== 'issue' && !value('solution')) || (kind === 'initiative' && !value('impact'))) { setError('Please complete all required fields.'); return }
    const base = { id: crypto.randomUUID(), title: value('title'), district: value('district') as DistrictCode, category: value('category') as Direction }
    if (kind === 'issue') civic.dispatch({ type: 'issue', issue: { ...base, description: value('description'), location: value('location'), image, reports: 1, confirmations: 0, status: 'Submitted' } })
    if (kind === 'petition') civic.dispatch({ type: 'petition', petition: { ...base, author: 'Demo resident', signatures: 1, goal: 3000, status: 'Collecting signatures', problem: value('description'), solution: value('solution'), related: [], metrics: directions.find(d => d.id === base.category)!.metrics } })
    if (kind === 'initiative') {
      const cost = Number(value('cost')); if (!Number.isSafeInteger(cost) || cost < 0 || cost > 1000000000) { setError('Enter an estimated cost between ₸0 and ₸1 billion.'); return }
      civic.dispatch({ type: 'initiative', initiative: { ...base, problem: value('description'), solution: value('solution'), impact: value('impact'), cost, supporters: 0, votes: 0, comments: [], pledged: 0, signatures: 0, stage: 0, related: '' } })
    }
    notify(`${kind === 'issue' ? 'Issue' : kind === 'petition' ? 'Petition' : 'Initiative'} published to your demo community.`); onClose()
  }
  return <Dialog title={title} onClose={onClose}><form className="civic-form" onSubmit={submit}><p className="muted">Your neighborhood. Your voice. Shared locally in this fictional demo.</p><label>Title<input name="title" required maxLength={100} placeholder="What would you like to change?" /></label><div className="form-columns"><label>District<select aria-label="District" name="district" defaultValue={district}>{Object.entries(districtNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Category<select aria-label="Category" name="category">{directions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div><label>{kind === 'issue' ? 'Description' : 'Problem'}<textarea name="description" required maxLength={1500} rows={3} placeholder="Tell us what is happening and who it affects." /></label>{kind === 'issue' ? <><label>Location <span className="muted">(optional)</span><input name="location" maxLength={180} placeholder="Street, landmark or neighborhood" /></label><label>Image <span className="muted">(optional · up to 1 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file = e.target.files?.[0]; setImage(undefined); setError(''); if (!file) return; if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1000000) { setError('Choose a PNG, JPEG or WebP image under 1 MB.'); e.target.value = ''; return }; setReading(true); const reader = new FileReader(); reader.onload = () => { setImage(String(reader.result)); setReading(false) }; reader.onerror = () => { setError('This image could not be read. Try another file.'); setReading(false) }; reader.readAsDataURL(file) }} /></label>{image && <img className="upload-preview" src={image} alt="Your issue attachment" />}</> : <label>Proposed solution<textarea name="solution" required maxLength={1500} rows={3} /></label>}{kind === 'initiative' && <><label>Expected impact<textarea name="impact" required maxLength={800} rows={2} /></label><label>Estimated cost (₸)<input type="number" name="cost" required min={0} max={1000000000} step={1} /></label></>}{kind === 'petition' && <p className="notice">Petition targets are fictional demo thresholds, not legal Astana requirements.</p>}{error && <p role="alert" className="error-text">{error}</p>}<button className="btn primary" disabled={reading} type="submit">Publish {kind}</button></form></Dialog>
}
