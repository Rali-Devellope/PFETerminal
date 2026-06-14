import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getAnneeActive } from '../../api/pfe'
import { getSujets } from '../../api/sujets'
import { getSoutenances } from '../../api/soutenances'
import { getDashboardCoordinateur, getStatsGlobales } from '../../api/stats'

export const COORD_NAV = (t) => [
  { to: '/coordinateur', end: true, label: t('nav.vue_ensemble'),
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { to: '/coordinateur/sujets', label: t('nav.sujets'),
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to: '/coordinateur/soutenances', label: t('nav.soutenances'),
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { to: '/coordinateur/deadlines', label: t('nav.deadlines'),
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { to: '/stats', label: t('nav.statistiques'),
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
]

function Skeleton({ h = 'h-8', w = 'w-full' }) {
  return <div className={`${h} ${w} rounded-xl bg-gray-100 animate-pulse`} />
}

function KpiCard({ label, value, sub, color, bg, icon, to, loading }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        {loading
          ? <><Skeleton h="h-7" w="w-16" /><Skeleton h="h-3" w="w-28" /></>
          : <>
              <p className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{value ?? '—'}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
              {sub && <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>}
            </>
        }
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function AlertDeadlines({ alertes }) {
  if (!alertes?.length) return null
  const LABELS = { rapport: 'Rapport', code: 'Code source', presentation: 'Présentation' }
  return (
    <div className="mb-5 rounded-2xl border px-5 py-4 flex items-start gap-3"
      style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
      <svg width="18" height="18" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#92400e' }}>{t('coordinateur.deadlines_alert')}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {alertes.map((a) => (
            <span key={a.type_livrable} className="text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              {LABELS[a.type_livrable] ?? a.type_livrable} — J{a.jours_restants >= 0 ? `-${a.jours_restants}` : '+' + Math.abs(a.jours_restants)}
            </span>
          ))}
        </div>
      </div>
      <Link to="/coordinateur/deadlines" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
        style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
        Gérer
      </Link>
    </div>
  )
}

function ProgressBar({ pct, color = '#2db84b' }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: '#f1f5f9' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  )
}

export default function CoordinateurDashboard() {
  const { t } = useTranslation()

  const { data: anneeRes } = useQuery({ queryKey: ['annee-active'], queryFn: getAnneeActive })
  const anneeActive = anneeRes?.data?.data ?? null

  const { data: dashRes, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-coord', anneeActive?.id],
    queryFn: () => getDashboardCoordinateur(anneeActive?.id),
    enabled: anneeRes !== undefined,
  })

  const { data: statsRes } = useQuery({ queryKey: ['stats-globales'], queryFn: getStatsGlobales })

  const { data: sujetsRes } = useQuery({
    queryKey: ['sujets-propose'],
    queryFn: () => getSujets({ statut: 'PROPOSE' }),
  })

  const { data: soutRes } = useQuery({
    queryKey: ['soutenances-list'],
    queryFn: () => getSoutenances(),
  })

  const dash   = dashRes?.data?.data ?? {}
  const stats  = statsRes?.data?.data ?? {}

  const sujetsArr = (() => {
    const r = sujetsRes?.data?.results ?? sujetsRes?.data ?? []
    return Array.isArray(r) ? r : []
  })()

  const soutsArr = (() => {
    const r = soutRes?.data?.results ?? soutRes?.data?.data ?? []
    const arr = Array.isArray(r) ? r : []
    return arr
      .filter((s) => s.statut === 'PLANIFIEE' && new Date(s.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6)
  })()

  const pctRapport = dash.pct_rapport_valide ?? 0

  return (
    <DashboardLayout navItems={COORD_NAV(t)}>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('coordinateur.dash_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('coordinateur.dash_sub')}</p>
        </div>
        {anneeActive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            {anneeActive.libelle} — Active
          </span>
        ) : (
          <span className="text-xs font-medium px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            Aucune année active
          </span>
        )}
      </div>

      {/* Alertes deadlines */}
      <AlertDeadlines alertes={dash.alertes_deadlines} />

      {/* 6 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <KpiCard loading={dashLoading}
          label={t('coordinateur.kpi_pfe_en_cours')}
          value={dash.pfe_en_cours}
          sub={stats.total_pfe ? t('coordinateur.kpi_pfe_total', { count: stats.total_pfe }) : undefined}
          color="#2db84b" bg="#f0fdf4"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
          to="/coordinateur/sujets" />

        <KpiCard loading={dashLoading}
          label={t('coordinateur.kpi_sujets_attente')}
          value={dash.sujets_en_attente}
          color="#f59e0b" bg="#fffbeb"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          to="/coordinateur/sujets" />

        <KpiCard loading={dashLoading}
          label={t('coordinateur.kpi_livrables')}
          value={dash.livrables_en_attente}
          color="#0ea5e9" bg="#f0f9ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />

        <KpiCard loading={dashLoading}
          label={t('coordinateur.kpi_sans_encadrant')}
          value={dash.pfe_sans_encadrant}
          sub={dash.pfe_sans_encadrant > 0 ? t('coordinateur.kpi_affectation_requise') : t('coordinateur.kpi_tous_encadres')}
          color={dash.pfe_sans_encadrant > 0 ? '#ef4444' : '#2db84b'}
          bg={dash.pfe_sans_encadrant > 0 ? '#fef2f2' : '#f0fdf4'}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />

        <KpiCard loading={dashLoading}
          label={t('coordinateur.kpi_sans_soutenance')}
          value={dash.etudiants_sans_soutenance}
          sub={dash.etudiants_sans_soutenance > 0 ? t('coordinateur.kpi_a_planifier') : undefined}
          color="#7e22ce" bg="#faf5ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          to="/coordinateur/soutenances" />

        <KpiCard loading={false}
          label={t('coordinateur.kpi_rapports')}
          value={`${pctRapport}%`}
          sub={stats.moyenne_notes ? t('coordinateur.kpi_moyenne', { note: stats.moyenne_notes }) : undefined}
          color="#1a2744" bg="#f8fafc"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
      </div>

      {/* Barre avancement rapports */}
      {!dashLoading && dash.pfe_en_cours > 0 && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>{t('coordinateur.kpi_progression')}</p>
            <span className="text-sm font-bold" style={{ color: pctRapport === 100 ? '#166534' : '#1a2744' }}>
              {pctRapport}%
            </span>
          </div>
          <ProgressBar pct={pctRapport}
            color={pctRapport >= 80 ? '#2db84b' : pctRapport >= 50 ? '#f59e0b' : '#ef4444'} />
          <p className="text-xs text-gray-400 mt-1.5">
            {t('coordinateur.kpi_progression_detail', {
              done: Math.round(dash.pfe_en_cours * pctRapport / 100),
              total: dash.pfe_en_cours,
            })}
          </p>
        </div>
      )}

      {/* Grille cartes */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Sujets à valider */}
        <Card
          title={t('coordinateur.kpi_sujets_title', { count: sujetsArr.length })}
          action={
            <Link to="/coordinateur/sujets"
              className="text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              {t('coordinateur.voir_tout')}
            </Link>
          }
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
          {sujetsArr.length === 0
            ? <p className="text-sm text-gray-400 py-2">{t('coordinateur.no_sujets_attente')}</p>
            : <div className="space-y-2">
                {sujetsArr.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: '#fffbeb' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ backgroundColor: '#f59e0b' }}>
                      {s.filiere?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>{s.titre}</p>
                      <p className="text-xs text-gray-400">
                        {s.filiere} · {s.propose_par?.prenom} {s.propose_par?.nom}
                      </p>
                    </div>
                    <Badge statut={s.statut} />
                  </div>
                ))}
                {sujetsArr.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    {t('coordinateur.plus_autres', { count: sujetsArr.length - 5 })}
                  </p>
                )}
              </div>
          }
        </Card>

        {/* Soutenances prochaines */}
        <Card
          title={`Soutenances planifiées (${soutsArr.length})`}
          action={
            <Link to="/coordinateur/soutenances"
              className="text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
              Planifier
            </Link>
          }
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
          {soutsArr.length === 0
            ? <p className="text-sm text-gray-400 py-2">{t('coordinateur.no_souts_avenir')}</p>
            : <div className="space-y-2">
                {soutsArr.map((s) => {
                  const d = new Date(s.date)
                  const jours = Math.ceil((d - new Date()) / 86400000)
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: '#faf5ff' }}>
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                        style={{ backgroundColor: '#ede9fe' }}>
                        <span className="text-xs font-bold leading-tight" style={{ color: '#7e22ce' }}>
                          {d.getDate()}
                        </span>
                        <span className="text-[9px] uppercase leading-tight" style={{ color: '#a78bfa' }}>
                          {d.toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>
                          {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.salle} · {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: jours <= 3 ? '#fef2f2' : jours <= 7 ? '#fffbeb' : '#f0fdf4',
                          color: jours <= 3 ? '#b91c1c' : jours <= 7 ? '#b45309' : '#166534',
                        }}>
                        J-{jours}
                      </span>
                    </div>
                  )
                })}
              </div>
          }
        </Card>

        {/* Activité récente — livrables en attente */}
        {(dash.livrables_en_attente > 0 || dash.pfe_sans_encadrant > 0) && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <p className="text-sm font-semibold mb-4" style={{ color: '#1a2744' }}>{t('coordinateur.actions_requises')}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {dash.livrables_en_attente > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f0f9ff' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#bae6fd' }}>
                    <svg width="18" height="18" fill="none" stroke="#0369a1" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: '#0369a1' }}>
                      {t('coordinateur.action_livrables', { count: dash.livrables_en_attente })}
                    </p>
                    <p className="text-xs text-gray-500">{t('coordinateur.action_livrables_sub')}</p>
                  </div>
                </div>
              )}
              {dash.pfe_sans_encadrant > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#fecaca' }}>
                    <svg width="18" height="18" fill="none" stroke="#b91c1c" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: '#b91c1c' }}>
                      {t('coordinateur.action_encadrant', { count: dash.pfe_sans_encadrant })}
                    </p>
                    <p className="text-xs text-gray-500">{t('coordinateur.action_encadrant_sub')}</p>
                  </div>
                  <Link to="/coordinateur/sujets"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 text-white"
                    style={{ backgroundColor: '#b91c1c' }}>
                    Affecter
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
