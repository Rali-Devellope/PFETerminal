import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getPFEs } from '../../api/pfe'
import { getSoutenances } from '../../api/soutenances'
import { useAuthStore } from '../../store/authStore'

export default function EncadrantDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const NAV_ITEMS = [
    { to: '/encadrant', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/encadrant/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: pfesRes, isLoading: pfesLoading } = useQuery({
    queryKey: ['pfe-encadrant'],
    queryFn: () => getPFEs(),
  })
  const { data: soutRes } = useQuery({
    queryKey: ['soutenances-encadrant'],
    queryFn: () => getSoutenances(),
  })

  const allPfes = pfesRes?.data?.results ?? pfesRes?.data?.data ?? []
  const pfesArr = Array.isArray(allPfes) ? allPfes : []
  const allSouts = soutRes?.data?.results ?? soutRes?.data?.data ?? []
  const soutsArr = Array.isArray(allSouts) ? allSouts : []

  const enCours = pfesArr.filter((p) => p.statut === 'EN_COURS').length
  const termines = pfesArr.filter((p) => p.statut === 'TERMINE').length
  const prochaine = soutsArr.find((s) => s.statut === 'PLANIFIEE')

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          {t('encadrant.hello', { name: user?.prenom })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('encadrant.sub')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label={t('encadrant.stat_students')} value={pfesArr.length} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
        <StatCard label={t('encadrant.stat_en_cours')} value={enCours} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label={t('encadrant.stat_termines')} value={termines} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('encadrant.my_students', { count: pfesArr.length })}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
          className="lg:col-span-2">
          {pfesLoading && (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}
            </div>
          )}
          {!pfesLoading && pfesArr.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">{t('encadrant.no_students')}</p>
          )}
          {!pfesLoading && pfesArr.length > 0 && (
            <div className="divide-y divide-gray-50">
              {pfesArr.map((p) => (
                <div key={p.id} className="py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                       style={{ backgroundColor: '#1e3a5f' }}>
                    {p.etudiant?.prenom?.[0]}{p.etudiant?.nom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                      {p.etudiant?.prenom} {p.etudiant?.nom}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{p.sujet?.titre ?? '—'}</p>
                    {p.sujet?.filiere && <p className="text-xs text-gray-400">{p.sujet.filiere}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge statut={p.statut} />
                    {p.note_finale != null && (
                      <span className="text-xs font-semibold" style={{ color: p.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                        {p.note_finale}/20
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={t('encadrant.next_sout')}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
          {!prochaine ? (
            <p className="text-sm text-gray-400 py-4 text-center">{t('encadrant.no_sout')}</p>
          ) : (
            <div className="flex items-start gap-4 p-3 rounded-xl" style={{ backgroundColor: '#faf5ff' }}>
              <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: '#ede9fe' }}>
                <span className="text-sm font-bold" style={{ color: '#7e22ce' }}>{new Date(prochaine.date).getDate()}</span>
                <span className="text-[9px] font-medium" style={{ color: '#a78bfa' }}>
                  {new Date(prochaine.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                  {prochaine.pfe?.etudiant?.prenom} {prochaine.pfe?.etudiant?.nom}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(prochaine.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {prochaine.salle} · {prochaine.duree} {t('common.min')}
                </p>
                {prochaine.membres_jury?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('encadrant.jury_prefix')}{prochaine.membres_jury.map((m) => `${m.prenom} ${m.nom}`).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title={t('encadrant.done_souts')}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}>
          {soutsArr.filter((s) => s.statut === 'TERMINEE').length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">{t('encadrant.no_done')}</p>
          ) : (
            <div className="space-y-2">
              {soutsArr.filter((s) => s.statut === 'TERMINEE').map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>
                      {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString('fr-FR')} · {s.salle}</p>
                  </div>
                  {s.note_finale != null && (
                    <span className="text-sm font-bold flex-shrink-0"
                          style={{ color: s.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                      {s.note_finale}/20
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
