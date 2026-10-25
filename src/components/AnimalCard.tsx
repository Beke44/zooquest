import { useTranslation } from 'react-i18next'
import { loc } from '@/i18n'
import type { Rarity, Species } from '@/types'
import { RARITY_STYLE } from './ui'

/** The virtual trading card that sits next to the family's real photo. */
export default function AnimalCard({ sp, rarity, locked, size = 'md' }: { sp: Species; rarity?: Rarity; locked?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const { t, i18n } = useTranslation()
  const r = rarity ?? sp.rarity
  const st = RARITY_STYLE[r]
  const emoji = size === 'lg' ? 'text-7xl' : size === 'md' ? 'text-5xl' : 'text-4xl'
  return (
    <div
      className={`relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${st.bg} p-2 ring-2 ${st.ring} ${locked ? 'opacity-60 grayscale' : `shadow-lg ${st.glow}`}`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${st.chip}`}>{t(`rarity.${r}`)}</span>
        {r === 'legendary' && !locked && <span className="text-sm">✨</span>}
      </div>
      <div className="animal-habitat relative my-2 grid flex-1 place-items-center overflow-hidden rounded-xl">
        <div className="absolute inset-4 rounded-full bg-white/60 blur-xl" />
        <span className={`relative z-10 ${emoji} ${locked ? 'brightness-0 opacity-30' : 'drop-shadow-md'}`} aria-hidden>
          {sp.emoji}
        </span>
      </div>
      <div className="relative z-10 rounded-xl bg-white/90 px-2 py-1 text-center">
        <p className="truncate text-sm font-extrabold text-jungle-900">{locked ? '???' : loc(sp.name, i18n.language)}</p>
        {size !== 'sm' && <p className="truncate text-[10px] italic text-jungle-600">{locked ? '' : sp.latin}</p>}
      </div>
    </div>
  )
}
