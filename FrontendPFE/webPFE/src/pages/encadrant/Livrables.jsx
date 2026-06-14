import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getAllLivrables, validerLivrableById, refuserLivrableById } from '../../api/pfe'

const TYPE_META = {
  rapport: {
    label: 'Rapport',
    color: '#1a2744', bg: '#eef1f8',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  presentation: {
    label: 'Présentation',
    color: '#7e22ce', bg: '#faf5ff',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  code: {
    label: 'Code source',
    color: '#0ea5e9', bg: '#f0f9ff',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
}

const STATUT_COLOR = {
  EN_ATTENTE_VALIDATION: '#f59e0b',
  VALIDE:                '#2db84b',
  REJETE:                '#ef4444',
}

function StatChip({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl"
         style={{ backgroundColor: color + '12', border: `1px solid ${color}22` }}>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      <span className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

export default function EncadrantLivrables() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [rejetTarget, setRejetTarget]   = useState(null)
  const [remarques, setRemarques]       = useState('')
  const [rejetError, setRejetError]     = useState('')
  const [valideTarget, setValideTarget] = useState(null)
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType]     = useState('')

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
    queryKey: ['livrables-encadrant', filterStatut, filterType],
    queryFn: () => {
      const params = {}
      if (filterStatut) params.statut = filterStatut
      if (filterType)   params.type   = filterType
      return getAllLivrables(params)
    },
  })

  const raw       = data?.data?.results ?? data?.data?.data ?? data?.data ?? []
  const livrables = Array.isArray(raw) ? raw : []

  const enAttente = livrables.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
  const valides   = livrables.filter((l) => l.statut === 'VALIDE').length
  const rejetes   = livrables.filter((l) => l.statut === 'REJETE').length

  /* Grouper par PFE */
  const byPfe = livrables.reduce((acc, l) => {
    const key = l.pfe?.id ?? 0
    if (!acc[key]) acc[key] = { pfe: l.pfe, livrables: [] }
    acc[key].livrables.push(l)
    return acc
  }, {})
  const groupes = Object.values(byPfe)

  const validerMut = useMutation({
    mutationFn: ({ id }) => validerLivrableById(id, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livrables-encadrant'] })
      setValideTarget(null)
    },
  })

  const rejeterMut = useMutation({
    mutationFn: ({ id, remarques }) => refuserLivrableById(id, { remarques }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livrables-encadrant'] })
      setRejetTarget(null)
      setRemarques('')
      setRejetError('')
    },
    onError: (e) => setRejetError(e.response?.data?.error?.message ?? 'Erreur'),
  })

  const handleRejeter = () => {
    if (!remarques.trim()) { setRejetError('Les remarques sont obligatoires'); return }
    rejeterMut.mutate({ id: rejetTarget.id, remarques })
  }

  const FILTRE_STATUTS = ['', 'EN_ATTENTE_VALIDATION', 'VALIDE', 'REJETE']
  const FILTRE_TYPES   = ['', 'rapport', 'code', 'presentation']

  return (
    <DashboardLayout navItems={NAV_ITEMS}>

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          Livrables de mes étudiants
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Consultez et validez les livrables déposés par vos étudiants
        </p>
      </div>

      {/* Stats */}
      {!isLoading && livrables.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatChip label="En attente"  value={enAttente} color="#f59e0b" />
          <StatChip label="Validés"     value={valides}   color="#2db84b" />
          <StatChip label="Rejetés"     value={rejetes}   color="#ef4444" />
          <StatChip label="Total"       value={livrables.length} color="#1a2744" />
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        {/* Filtre statut */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTRE_STATUTS.map((s) => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              style={{
                backgroundColor: filterStatut === s
                  ? (s ? STATUT_COLOR[s] : '#1e3a5f')
                  : '#f1f5f9',
                color: filterStatut === s ? '#fff' : '#6b7280',
              }}>
              {s === '' ? 'Tous les statuts' : t(`badge.${s}`, { defaultValue: s })}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

        {/* Filtre type */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTRE_TYPES.map((tp) => (
            <button key={tp} onClick={() => setFilterType(tp)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              style={{
                backgroundColor: filterType === tp ? '#1e3a5f' : '#f1f5f9',
                color: filterType === tp ? '#fff' : '#6b7280',
              }}>
              {tp === '' ? 'Tous les types' : (TYPE_META[tp]?.label ?? tp)}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-50 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && livrables.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ backgroundColor: '#f8fafc' }}>
            <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">Aucun livrable trouvé</p>
          {(filterStatut || filterType) && (
            <button onClick={() => { setFilterStatut(''); setFilterType('') }}
              className="mt-3 text-xs text-blue-500 hover:underline">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Groupes par PFE */}
      {!isLoading && groupes.map(({ pfe, livrables: livs }) => {
        const etudiant = livs[0]?.pfe?.etudiant
        const attenteCount = livs.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
        return (
          <div key={pfe?.id ?? 0} className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* En-tête groupe */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap"
                 style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg,#1e3a5f,#2db84b)' }}>
                  {(etudiant?.prenom?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1a2744' }}>
                    {etudiant?.prenom} {etudiant?.nom}
                  </p>
                  {pfe?.titre && (
                    <p className="text-xs text-gray-400 truncate">{pfe.titre}</p>
                  )}
                </div>
              </div>
              {attenteCount > 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: '#f59e0b' }}>
                  {attenteCount} en attente
                </span>
              )}
            </div>

            {/* Livrables du groupe */}
            <div className="divide-y divide-gray-50">
              {livs.map((l) => {
                const meta = TYPE_META[l.type_livrable] ?? TYPE_META.rapport
                return (
                  <div key={l.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">

                    {/* Icône type */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: '#f1f5f9', color: '#6b7280' }}>
                          v{l.version}
                        </span>
                        <Badge statut={l.statut} />
                        {l.hors_delai && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                            Hors délai
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Déposé le{' '}
                        {new Date(l.date_depot).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {l.remarques && (
                        <p className="text-xs mt-1 italic" style={{ color: '#6b7280' }}>
                          Remarque : {l.remarques}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {l.statut === 'EN_ATTENTE_VALIDATION' && (
                        <>
                          <button
                            onClick={() => setValideTarget(l)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: '#2db84b' }}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Valider
                          </button>
                          <button
                            onClick={() => { setRejetTarget(l); setRemarques(''); setRejetError('') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Rejeter
                          </button>
                        </>
                      )}
                      {l.fichier && (
                        <a href={l.fichier} target="_blank" rel="noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                           style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Télécharger
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Modal validation */}
      {valideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                 style={{ backgroundColor: '#f0fdf4' }}>
              <svg width="18" height="18" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>
              Valider ce livrable ?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Le livrable <strong>{TYPE_META[valideTarget.type_livrable]?.label}</strong> de{' '}
              <strong>{valideTarget.pfe?.etudiant?.prenom} {valideTarget.pfe?.etudiant?.nom}</strong> sera marqué comme validé
              et l'étudiant sera notifié.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setValideTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                Annuler
              </button>
              <button
                onClick={() => validerMut.mutate({ id: valideTarget.id })}
                disabled={validerMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: validerMut.isPending ? 0.7 : 1 }}>
                {validerMut.isPending ? 'Validation...' : 'Confirmer la validation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet */}
      {rejetTarget && (
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
              Rejeter le livrable
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Livrable <strong>{TYPE_META[rejetTarget.type_livrable]?.label}</strong> —{' '}
              {rejetTarget.pfe?.etudiant?.prenom} {rejetTarget.pfe?.etudiant?.nom}
              <br/>
              <span className="text-xs text-gray-400">Le motif est obligatoire et sera transmis à l'étudiant.</span>
            </p>

            {rejetError && (
              <div className="mb-3 px-3 py-2.5 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                {rejetError}
              </div>
            )}

            <textarea
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Expliquez pourquoi ce livrable est rejeté et ce que l'étudiant doit corriger..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none mb-4"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />

            <div className="flex gap-2">
              <button onClick={() => setRejetTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                Annuler
              </button>
              <button onClick={handleRejeter} disabled={rejeterMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#ef4444', opacity: rejeterMut.isPending ? 0.7 : 1 }}>
                {rejeterMut.isPending ? 'Rejet...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
