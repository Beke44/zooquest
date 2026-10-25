import type { ReactNode } from 'react'
import type { Rarity } from '@/types'

export const RARITY_STYLE: Record<Rarity, { ring: string; bg: string; chip: string; glow: string }> = {
  common: { ring: 'ring-jungle-200', bg: 'from-jungle-50 to-sand-50', chip: 'bg-jungle-100 text-jungle-800', glow: '' },
  rare: { ring: 'ring-sky-300', bg: 'from-sky-50 to-sand-50', chip: 'bg-sky-100 text-sky-800', glow: 'shadow-sky-200/70' },
  epic: { ring: 'ring-violet-300', bg: 'from-violet-50 to-sand-50', chip: 'bg-violet-100 text-violet-800', glow: 'shadow-violet-200/80' },
  legendary: { ring: 'ring-amber-400', bg: 'from-amber-50 via-sand-50 to-amber-100', chip: 'bg-amber-100 text-amber-900', glow: 'shadow-amber-300/80' },
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white/90 shadow-sm ring-1 ring-black/5 ${className}`}>{children}</div>
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
        active ? 'bg-jungle-700 text-white shadow' : 'bg-white text-jungle-900 ring-1 ring-jungle-200 hover:bg-jungle-50'
      }`}
    >
      {children}
    </button>
  )
}

export function Button({
  children, onClick, variant = 'primary', className = '', disabled, type = 'button',
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'accent'; className?: string; disabled?: boolean; type?: 'button' | 'submit'
}) {
  const v =
    variant === 'primary'
      ? 'bg-jungle-700 text-white hover:bg-jungle-800'
      : variant === 'accent'
        ? 'bg-clay-500 text-white hover:bg-clay-600'
        : 'bg-white text-jungle-900 ring-1 ring-jungle-200 hover:bg-jungle-50'
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold transition active:scale-[0.98] disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  )
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-jungle-900/40 backdrop-blur-[2px]" onClick={onClose} aria-label="close" />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-sand-50 p-5 pb-8 shadow-2xl sm:rounded-[2rem] animate-[rise_.25s_ease-out]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-jungle-200 sm:hidden" />
        {title && <h2 className="mb-3 font-display text-2xl font-semibold text-jungle-900">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[1100] flex justify-center px-4">
      <div className="rounded-2xl bg-jungle-900 px-4 py-3 text-sm font-bold text-white shadow-xl animate-[rise_.2s_ease-out]">{text}</div>
    </div>
  )
}
