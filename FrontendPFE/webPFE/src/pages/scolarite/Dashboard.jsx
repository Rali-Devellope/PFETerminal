import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { StatCard } from '../../components/UI/Card'
import { getStatsGlobales } from '../../api/stats'
import { getAnneeActive } from '../../api/pfe'
import { SCOLARITE_NAV_ITEMS } from './_nav'

function NavIcon({ d }) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  )
}

export default function ScolariteDashboard() {
  const { t } = useTranslation()

  const NAV_ITEMS = SCOLARITE_NAV_ITEMS.map((item) => ({
    ...item,
    icon: <NavIcon d={item.iconPath} />,
  }))

  const { data: statsRes }      = useQuery({ queryKey: ['stats-globales'], queryFn: getStatsGlobales })
  const { data: anneeActiveRes} = useQuery({ queryKey: ['annee-active'],   queryFn: getAnneeActive })

  const stats       = statsRes?.data?.data ?? {}
  const anneeActive = anneeActiveRes?.data?.data ?? null

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('scolarite.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('scolarite.sub')}</p>
      </div>

      {anneeActive ? (
        <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>● ACTIVE</span>
          <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{anneeActive.libelle}</span>
          <span className="text-xs text-gray-400">
            {new Date(anneeActive.date_debut).toLocaleDateString('fr-FR')} — {new Date(anneeActive.date_fin).toLocaleDateString('fr-FR')}
          </span>
        </div>
      ) : (
        <div className="mb-6 px-4 py-3 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <p className="text-sm" style={{ color: '#92400e' }}>
            ⚠ Aucune année académique active — rendez-vous dans <strong>Années académiques</strong> pour en créer une.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('scolarite.stat_pfe')}      value={stats.total_pfe ?? '—'}             color="#1e3a5f"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} />
        <StatCard label={t('scolarite.stat_archives')} value={stats.pfe_archives ?? '—'}          color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} />
        <StatCard label={t('scolarite.stat_souts')}    value={stats.soutenances_terminees ?? '—'} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <StatCard label={t('scolarite.stat_moyenne')}  value={stats.moyenne_notes ? `${stats.moyenne_notes}/20` : '—'} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>
    </DashboardLayout>
  )
}
