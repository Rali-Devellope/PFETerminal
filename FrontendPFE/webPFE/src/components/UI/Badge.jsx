import { useTranslation } from 'react-i18next'

const STYLES = {
  EN_COURS:   { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  EN_ATTENTE: { bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
  VALIDE:     { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  REFUSE:     { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  ARCHIVE:    { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' },
  PLANIFIEE:  { bg: '#faf5ff', color: '#7e22ce', dot: '#a855f7' },
  TERMINEE:   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  PROPOSE:    { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' },
}

export default function Badge({ statut }) {
  const { t } = useTranslation()
  const s = STYLES[statut] ?? { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' }
  const label = statut ? t(`badge.${statut}`, { defaultValue: statut }) : '—'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {label}
    </span>
  )
}
