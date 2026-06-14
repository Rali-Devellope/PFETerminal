import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getMonPFE, getAnneeActive, getDeadlines } from '../../api/pfe'
import { getMaSoutenance } from '../../api/soutenances'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-50 last:border-0 gap-1">
      <span className="text-xs text-gray-400 sm:w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{value ?? '—'}</span>
    </div>
  )
}

function PlagiatGauge({ score }) {
  const { t } = useTranslation()
  const pct = Math.min(score, 100)
  const color = score > 30 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e'
  const label = score > 30 ? t('etudiant.score_high') : score > 20 ? t('etudiant.score_med') : t('etudiant.score_low')
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-gray-500">{t('etudiant.taux')}</span>
        <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div className="h-2.5 rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
      <p className="text-xs mt-2" style={{ color }}>{label}</p>
    </div>
  )
}

const TYPE_COLORS = {
  rapport:      { bg: '#eef1f8', color: '#1a2744' },
  code:         { bg: '#f0f9ff', color: '#0ea5e9' },
  presentation: { bg: '#fdf4ff', color: '#9333ea' },
}

const STATUT_ICON = {
  VALIDE:               { icon: '✓', color: '#15803d', bg: '#f0fdf4' },
  EN_ATTENTE_VALIDATION: { icon: '⏳', color: '#d97706', bg: '#fffbeb' },
  REJETE:               { icon: '✗', color: '#b91c1c', bg: '#fef2f2' },
}

export default function EtudiantDashboard() {
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { to: '/etudiant', end: true, label: t('nav.mon_pfe'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { to: '/etudiant/sujets', label: t('nav.sujets_dispo'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/etudiant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
    { to: '/etudiant/soutenance', label: t('nav.ma_soutenance'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  ]

  const { data: pfeRes, isLoading: pfeLoading, isError: pfeError } = useQuery({
    queryKey: ['mon-pfe'],
    queryFn: getMonPFE,
  })
  const { data: soutRes } = useQuery({
    queryKey: ['ma-soutenance'],
    queryFn: getMaSoutenance,
    retry: false,
  })
  const { data: anneeRes } = useQuery({
    queryKey: ['annee-active'],
    queryFn: getAnneeActive,
  })
  const anneeActive = anneeRes?.data?.data ?? null

  const { data: deadlineRes } = useQuery({
    queryKey: ['deadlines', anneeActive?.id],
    queryFn: () => getDeadlines(anneeActive.id),
    enabled: !!anneeActive?.id,
  })

  const pfe = pfeRes?.data?.data
  const soutenance = soutRes?.data?.data
  const deadlines = deadlineRes?.data?.data ?? []

  const encadrant = pfe?.encadrant_acad ?? pfe?.encadrant_entr
  const livrables = pfe?.livrables ?? []
  const livrablesValides   = livrables.filter((l) => l.statut === 'VALIDE').length
  const livrablesEnAttente = livrables.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
  const livrablesRefuses   = livrables.filter((l) => l.statut === 'REJETE').length

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          {t('etudiant.page_title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('etudiant.page_sub')}</p>
      </div>

      {pfeLoading && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {pfeError && (
        <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center"
             style={{ backgroundColor: '#fffbeb' }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
               style={{ backgroundColor: '#fef3c7' }}>
            <svg width="24" height="24" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>{t('etudiant.no_pfe_title')}</p>
          <p className="text-xs text-amber-600 mt-1">{t('etudiant.no_pfe_msg')}</p>
        </div>
      )}

      {pfe && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <StatCard label={t('etudiant.stat_statut')} value={<Badge statut={pfe.statut} />}
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
            <StatCard label={t('etudiant.stat_plagiat')}
              value={pfe.score_plagiat != null ? `${pfe.score_plagiat}%` : '—'}
              sub={pfe.score_plagiat != null ? (pfe.score_plagiat > 30 ? t('etudiant.score_review') : t('etudiant.score_ok')) : t('etudiant.score_none')}
              color={pfe.score_plagiat > 30 ? '#ef4444' : '#2db84b'}
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" /></svg>} />
            <StatCard label={t('etudiant.stat_soutenance')}
              value={soutenance ? new Date(soutenance.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              sub={soutenance ? soutenance.salle : t('etudiant.not_planned')}
              color="#7e22ce"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Infos PFE */}
            <Card title={t('etudiant.info_title')}
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>}>
              <InfoRow label={t('etudiant.titre')} value={pfe.titre} />
              <InfoRow label={t('etudiant.filiere')} value={pfe.filiere} />
              <InfoRow label={t('etudiant.annee')} value={pfe.annee} />
              <InfoRow
                label={t('etudiant.encadrant')}
                value={encadrant
                  ? `${encadrant.prenom} ${encadrant.nom}`
                  : <span className="text-gray-400">{t('etudiant.not_assigned')}</span>}
              />
              <InfoRow label={t('etudiant.statut_label')} value={<Badge statut={pfe.statut} />} />
              {anneeActive && (
                <InfoRow label="Année académique" value={anneeActive.libelle} />
              )}
            </Card>

            <div className="flex flex-col gap-5">
              {/* Plagiat */}
              <Card title={t('etudiant.plagiat_title')}
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18" /></svg>}>
                {pfe.score_plagiat != null
                  ? <PlagiatGauge score={pfe.score_plagiat} />
                  : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-400">{t('etudiant.no_livrable_analyzed')}</p>
                      <Link to="/etudiant/livrables" className="text-xs font-medium mt-1 inline-block" style={{ color: '#2db84b' }}>
                        {t('etudiant.deposit_link')}
                      </Link>
                    </div>
                  )}
              </Card>

              {/* Soutenance */}
              <Card title={t('etudiant.sout_title')}
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                action={
                  <Link to="/etudiant/soutenance" className="text-xs font-medium px-2.5 py-1 rounded-lg transition"
                        style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    {t('etudiant.details')}
                  </Link>
                }>
                {soutenance ? (
                  <>
                    <InfoRow label={t('etudiant.date_label')}
                      value={new Date(soutenance.date).toLocaleString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })} />
                    <InfoRow label={t('etudiant.salle_label')} value={soutenance.salle} />
                    <InfoRow label={t('etudiant.statut_label')} value={<Badge statut={soutenance.statut} />} />
                    {soutenance.note_finale != null && (
                      <InfoRow label={t('etudiant.note_finale')} value={
                        <span className="font-bold text-base" style={{ color: soutenance.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {soutenance.note_finale} <span className="text-xs font-normal text-gray-400">/ 20</span>
                        </span>
                      } />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-1">{t('etudiant.not_planned')}</p>
                )}
              </Card>
            </div>

            {/* Livrables */}
            <Card title={`${t('etudiant.livrables_title')}${livrables.length > 0 ? ` (${livrables.length})` : ''}`}
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
              action={
                <Link to="/etudiant/livrables"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition"
                      style={{ backgroundColor: '#2db84b' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {t('etudiant.deposit_btn')}
                </Link>
              }>
              {livrables.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">{t('livrables.none_deposited')}</p>
              ) : (
                <>
                  {/* Résumé rapide */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {livrablesValides > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                        ✓ {livrablesValides} validé{livrablesValides > 1 ? 's' : ''}
                      </span>
                    )}
                    {livrablesEnAttente > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                        ⏳ {livrablesEnAttente} en attente
                      </span>
                    )}
                    {livrablesRefuses > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                        ✗ {livrablesRefuses} refusé{livrablesRefuses > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Liste compacte */}
                  <div className="space-y-2">
                    {livrables.slice(0, 4).map((l) => {
                      const tc = TYPE_COLORS[l.type_livrable] ?? { bg: '#f1f5f9', color: '#6b7280' }
                      const si = STATUT_ICON[l.statut] ?? { icon: '?', color: '#6b7280', bg: '#f1f5f9' }
                      return (
                        <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                             style={{ backgroundColor: '#f8fafc' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                                  style={{ backgroundColor: tc.bg, color: tc.color }}>
                              {l.type_livrable_display ?? l.type_livrable}
                            </span>
                            {l.hors_delai && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                                hors délai
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: si.color }}>
                            {si.icon}
                          </span>
                        </div>
                      )
                    })}
                    {livrables.length > 4 && (
                      <p className="text-xs text-center text-gray-400 pt-1">
                        + {livrables.length - 4} autre{livrables.length - 4 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </>
              )}
            </Card>

            {/* Deadlines */}
            <Card title="Prochaines deadlines"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
              {deadlines.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Aucune deadline définie pour cette année.</p>
              ) : (
                <div className="space-y-2.5">
                  {deadlines.map((d) => {
                    const dt = new Date(d.date_limite)
                    const now = new Date()
                    const diff = Math.ceil((dt - now) / (1000 * 60 * 60 * 24))
                    const isPast = diff < 0
                    const isUrgent = diff >= 0 && diff <= 7
                    const color = isPast ? '#6b7280' : isUrgent ? '#b91c1c' : '#1a2744'
                    const bg    = isPast ? '#f1f5f9' : isUrgent ? '#fef2f2' : '#f0fdf4'
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                           style={{ backgroundColor: bg }}>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold" style={{ color }}>
                            {d.type_livrable_display ?? d.type_livrable}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold flex-shrink-0" style={{ color }}>
                          {isPast ? 'Passée' : diff === 0 ? "Aujourd'hui" : `J-${diff}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
