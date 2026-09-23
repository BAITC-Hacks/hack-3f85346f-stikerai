import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowUpRight, Bus, Leaf, HeartPulse, ShieldCheck, Building2, X } from 'lucide-react'
import type { Direction } from '../types/domain'
export const directionIcons = { transport: Bus, ecology: Leaf, social: HeartPulse, safety: ShieldCheck, services: Building2 }
export function DirectionIcon({ direction, size = 17 }: { direction: Direction; size?: number }) { const Icon = directionIcons[direction]; return <Icon size={size} strokeWidth={1.6} /> }
export function Progress({ value, tone = '' }: { value: number; tone?: string }) { return <div className={`progress ${tone}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div> }
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span> }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div> }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><Building2 size={28} /><h3>{title}</h3><p>{children ?? 'Choose a different district or start a new conversation.'}</p></div> }
export function Dialog({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close() }, [])
  return <dialog ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose() }}><div className="dialog-header"><h2>{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>
}
export function Orb({ small = false }: { small?: boolean }) { return <div className={`city-orb ${small ? 'small' : ''}`} aria-hidden="true"><svg viewBox="0 0 200 200">{Array.from({ length: 5 }, (_, i) => <g key={i} transform={`rotate(${i * 72} 100 100)`}><path d="M100 66V18" /><circle cx="100" cy="18" r="3" /></g>)}<circle className="orb-ring" cx="100" cy="100" r="49" /><circle className="orb-core" cx="100" cy="100" r="30" /><path className="orb-stem" d="M84 95L100 117L116 95M100 117V135" /></svg></div> }
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={15} /></button> }
