const STYLES = {
  EN_COURS:   { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6', label: 'En cours' },
  EN_ATTENTE: { bg: '#fffbeb', color: '#b45309', dot: '#f59e0b', label: 'En attente' },
  VALIDE:     { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Validé' },
  REFUSE:     { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444', label: 'Refusé' },
  ARCHIVE:    { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af', label: 'Archivé' },
  PLANIFIEE:  { bg: '#faf5ff', color: '#7e22ce', dot: '#a855f7', label: 'Planifiée' },
  TERMINEE:   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Terminée' },
  PROPOSE:    { bg: '#fff7ed', color: '#c2410c', dot: '#f97316', label: 'Proposée' },
}

export default function Badge({ statut }) {
  const s = STYLES[statut] ?? { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af', label: statut ?? '—' }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  )
}
