import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getAllLivrables, validerLivrableById, refuserLivrableById } from '../../api/pfe'

const TYPE_ICONS = {
  rapport: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  presentation: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  code: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
}

export default function EncadrantLivrables() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [refusTarget, setRefusTarget] = useState(null)
  const [remarques, setRemarques] = useState('')
  const [refusError, setRefusError] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const NAV_ITEMS = [
    { to: '/encadrant', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/encadrant/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/encadrant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['livrables-encadrant', filterStatut],
    queryFn: () => getAllLivrables(filterStatut ? { statut: filterStatut } : {}),
  })

  const livrables = data?.data?.results ?? data?.data?.data ?? data?.data ?? []
  const livrablesArr = Array.isArray(livrables) ? livrables : []

  const enAttente = livrablesArr.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length

  const validerMut = useMutation({
    mutationFn: ({ id, remarques }) => validerLivrableById(id, { remarques }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['livrables-encadrant'] }),
  })

  const refuserMut = useMutation({
    mutationFn: ({ id, remarques }) => refuserLivrableById(id, { remarques }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livrables-encadrant'] })
      setRefusTarget(null)
      setRemarques('')
      setRefusError('')
    },
    onError: (e) => {
      setRefusError(e.response?.data?.error?.message ?? 'Erreur')
    },
  })

  const handleRefuser = () => {
    if (!remarques.trim()) { setRefusError('Les remarques sont obligatoires'); return }
    refuserMut.mutate({ id: refusTarget.id, remarques })
  }

  const STATUTS = ['', 'EN_ATTENTE_VALIDATION', 'VALIDE', 'REJETE']

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('encadrant_livrables.page_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('encadrant_livrables.page_sub')}</p>
        </div>
        {enAttente > 0 && (
          <span className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#f59e0b' }}>
            {enAttente} en attente
          </span>
        )}
      </div>

      {/* Filtre statut */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUTS.map((s) => (
          <button key={s} onClick={() => setFilterStatut(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            style={{
              backgroundColor: filterStatut === s ? '#1e3a5f' : '#f1f5f9',
              color: filterStatut === s ? '#fff' : '#6b7280',
            }}>
            {s === '' ? 'Tous' : t(`badge.${s}`, { defaultValue: s })}
          </button>
        ))}
      </div>

      <Card title={t('encadrant_livrables.all_count', { count: livrablesArr.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!isLoading && livrablesArr.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">{t('encadrant_livrables.none')}</p>
        )}

        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {livrablesArr.map((l) => (
              <div key={l.id} className="py-4 flex items-start gap-4 flex-wrap">
                {/* Icône type */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: '#f0fdf4', color: '#2db84b' }}>
                  {TYPE_ICONS[l.type_livrable] ?? TYPE_ICONS.rapport}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                      {l.type_livrable_display ?? l.type_livrable}
                    </span>
                    {l.version > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                        v{l.version}
                      </span>
                    )}
                    <Badge statut={l.statut} />
                    {l.hors_delai && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#fef9ec', color: '#d97706' }}>
                        Hors délai
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    <span className="font-medium">{t('encadrant_livrables.student_label')} :</span>{' '}
                    {l.pfe?.etudiant?.prenom} {l.pfe?.etudiant?.nom}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('encadrant_livrables.depose_le')} :{' '}
                    {new Date(l.date_depot).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {l.remarques && (
                    <p className="text-xs mt-1 italic" style={{ color: '#6b7280' }}>
                      {t('encadrant_livrables.remarques_label')} : {l.remarques}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {l.statut === 'EN_ATTENTE_VALIDATION' && (
                    <>
                      <button
                        onClick={() => validerMut.mutate({ id: l.id, remarques: '' })}
                        disabled={validerMut.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: '#2db84b', opacity: validerMut.isPending ? 0.7 : 1 }}
                      >
                        {validerMut.isPending ? t('encadrant_livrables.validating') : t('encadrant_livrables.valider')}
                      </button>
                      <button
                        onClick={() => { setRefusTarget(l); setRemarques(''); setRefusError('') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                      >
                        {t('encadrant_livrables.refuser')}
                      </button>
                    </>
                  )}
                  {l.fichier && (
                    <a href={l.fichier} target="_blank" rel="noreferrer"
                       className="px-3 py-1.5 rounded-lg text-xs font-semibold text-center"
                       style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      Télécharger
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal refus */}
      {refusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                 style={{ backgroundColor: '#fef2f2' }}>
              <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>
              {t('encadrant_livrables.modal_title')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{t('encadrant_livrables.modal_sub')}</p>

            {refusError && (
              <div className="mb-3 px-3 py-2.5 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                {refusError}
              </div>
            )}

            <textarea
              value={remarques} onChange={(e) => setRemarques(e.target.value)}
              placeholder={t('encadrant_livrables.remarques_ph')} rows={4}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none mb-4"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />

            <div className="flex gap-2">
              <button onClick={() => setRefusTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleRefuser} disabled={refuserMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#ef4444', opacity: refuserMut.isPending ? 0.7 : 1 }}>
                {refuserMut.isPending ? t('encadrant_livrables.refusing') : t('encadrant_livrables.confirmer_refus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
