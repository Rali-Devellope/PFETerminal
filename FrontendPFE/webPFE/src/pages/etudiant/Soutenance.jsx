import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getMaSoutenance } from '../../api/soutenances'
import { ReleveButton, AttestationButton } from '../../components/UI/PdfButtons'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-50 last:border-0 gap-1">
      <span className="text-xs text-gray-400 sm:w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{value ?? '—'}</span>
    </div>
  )
}

function NoteBar({ note, t }) {
  const admis = note >= 10
  const pct   = Math.min((note / 20) * 100, 100)
  const color = note >= 16 ? '#15803d' : note >= 14 ? '#2db84b' : note >= 12 ? '#f59e0b' : note >= 10 ? '#d97706' : '#ef4444'
  const mention = note >= 16 ? t('soutenance_page.mention_tb') : note >= 14 ? t('soutenance_page.mention_b') : note >= 12 ? t('soutenance_page.mention_ab') : note >= 10 ? t('soutenance_page.mention_p') : t('soutenance_page.mention_i')

  return (
    <div>
      {/* Décision ADMIS / AJOURNÉ */}
      <div className="flex items-center justify-center mb-5 py-3 rounded-xl"
           style={{ backgroundColor: admis ? '#f0fdf4' : '#fef2f2', border: `1px solid ${admis ? '#bbf7d0' : '#fecaca'}` }}>
        <div className="flex items-center gap-2">
          {admis
            ? <svg width="20" height="20" fill="none" stroke="#15803d" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="20" height="20" fill="none" stroke="#b91c1c" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
          <span className="text-base font-bold" style={{ color: admis ? '#15803d' : '#b91c1c' }}>
            {admis ? t('soutenance_page.decision_admis') : t('soutenance_page.decision_ajourne')}
          </span>
        </div>
      </div>

      {/* Note + mention */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">{t('soutenance_page.note_finale')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold" style={{ color }}>{note}</span>
            <span className="text-sm text-gray-400 font-medium">/ 20</span>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: color + '1a', color }}>
          {mention}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div className="h-3 rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  )
}


export default function EtudiantSoutenance() {
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ma-soutenance'],
    queryFn: getMaSoutenance,
    retry: false,
  })

  const s = data?.data?.data

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Ma Soutenance</h1>
        <p className="text-sm text-gray-500 mt-1">Informations sur votre soutenance de PFE</p>
      </div>

      {isLoading && (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
               style={{ backgroundColor: '#f0f9ff' }}>
            <svg width="28" height="28" fill="none" stroke="#0ea5e9" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: '#1a2744' }}>
            Soutenance non encore planifiée
          </p>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
            Le coordinateur vous informera de la date, de l&apos;heure et de la salle.
          </p>
        </div>
      )}

      {s && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Détails */}
          <Card title="Détails de la soutenance"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}>
            <InfoRow
              label="Date et heure"
              value={new Date(s.date).toLocaleString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            />
            <InfoRow label="Salle" value={s.salle} />
            <InfoRow label="Durée" value={`${s.duree} minutes`} />
            <InfoRow label="Statut" value={<Badge statut={s.statut} />} />
          </Card>

          {/* Jury */}
          <Card title="Membres du jury"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}>
            {s.membres_jury?.length > 0 ? (
              <div className="space-y-2.5">
                {s.membres_jury.map((m) => {
                  const isPresident = s.president_jury?.id === m.id
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl transition"
                         style={{ backgroundColor: isPresident ? '#fffbeb' : '#f8fafc' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                           style={{ background: isPresident
                             ? 'linear-gradient(135deg, #b45309, #d97706)'
                             : 'linear-gradient(135deg, #1e3a5f, #2d5a8f)' }}>
                        {m.prenom?.[0]}{m.nom?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>
                            {m.prenom} {m.nom}
                          </p>
                          {isPresident && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                              Président
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Jury non encore affecté</p>
            )}
          </Card>

          {/* Résultat final — notes individuelles confidentielles, jamais affichées */}
          {s.note_finale != null && (
            <Card title={t('soutenance_page.card_resultat')}
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}>
              <NoteBar note={s.note_finale} t={t} />
              {s.note_finale >= 10 && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                  <ReleveButton soutenanceId={s.id} />
                  <AttestationButton soutenanceId={s.id} />
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
