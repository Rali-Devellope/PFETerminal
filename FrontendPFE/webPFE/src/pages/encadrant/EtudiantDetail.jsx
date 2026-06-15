import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Badge from '../../components/UI/Badge'
import { getPFE, mettreAJourResume, validerLivrableById, refuserLivrableById } from '../../api/pfe'
import { getSoutenances, soumettreNote } from '../../api/soutenances'
import { useAuthStore } from '../../store/authStore'

/* ─── constantes ─────────────────────────────────────────────── */

const TYPE_META = {
  rapport:      { label: 'Rapport',       icon: '📄', color: '#1a2744', bg: '#eef1f8' },
  presentation: { label: 'Présentation',  icon: '📊', color: '#7e22ce', bg: '#faf5ff' },
  code:         { label: 'Code source',   icon: '💻', color: '#0ea5e9', bg: '#f0f9ff' },
}

const STATUT_LIVRABLE = {
  VALIDE:               { color: '#15803d', bg: '#f0fdf4', label: 'Validé',      icon: '✓' },
  EN_ATTENTE_VALIDATION:{ color: '#d97706', bg: '#fffbeb', label: 'En attente', icon: '⏳' },
  REJETE:               { color: '#b91c1c', bg: '#fef2f2', label: 'Rejeté',      icon: '✗' },
}

/* ─── composants locaux ──────────────────────────────────────── */

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-400 mb-0.5">{label}</span>
      <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{value}</span>
    </div>
  )
}

function StatPill({ label, value, color, bg }) {
  return (
    <div className="flex flex-col items-center px-4 py-2.5 rounded-xl" style={{ backgroundColor: bg }}>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

/* ─── page ────────────────────────────────────────────────────── */

export default function EtudiantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  /* états locaux */
  const [rejetTarget, setRejetTarget]   = useState(null)
  const [rejetRemarques, setRejetRemarques] = useState('')
  const [rejetError, setRejetError]     = useState('')
  const [valideTarget, setValideTarget] = useState(null)

  const [noteVal, setNoteVal]       = useState('')
  const [noteComment, setNoteComment] = useState('')
  const [noteError, setNoteError]   = useState('')

  const [editResume, setEditResume]     = useState(false)
  const [resumeVal, setResumeVal]       = useState('')
  const [motsClesVal, setMotsClesVal]   = useState('')

  /* NAV */
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

  /* queries */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pfe-detail', id],
    queryFn:  () => getPFE(id),
  })
  const pfe = data?.data?.data ?? data?.data

  const { data: soutRes } = useQuery({
    queryKey: ['soutenances-pfe', id],
    queryFn:  () => getSoutenances({ pfe: id }),
    enabled:  !!pfe,
  })
  const soutsArr  = soutRes?.data?.results ?? soutRes?.data?.data ?? soutRes?.data ?? []
  const soutenance = Array.isArray(soutsArr) ? soutsArr[0] : null

  /* stats livrables */
  const livrables    = pfe?.livrables ?? []
  const livValides   = livrables.filter((l) => l.statut === 'VALIDE').length
  const livAttente   = livrables.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
  const livRejetes   = livrables.filter((l) => l.statut === 'REJETE').length
  const progression  = livrables.length > 0 ? Math.round((livValides / livrables.length) * 100) : 0

  /* mutations */
  const validerMut = useMutation({
    mutationFn: ({ lid }) => validerLivrableById(lid, {}),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['pfe-detail', id] }); setValideTarget(null) },
  })

  const rejeterMut = useMutation({
    mutationFn: ({ lid, remarques }) => refuserLivrableById(lid, { remarques }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['pfe-detail', id] })
      setRejetTarget(null); setRejetRemarques(''); setRejetError('')
    },
    onError: (e) => setRejetError(e.response?.data?.error?.message ?? 'Erreur'),
  })

  const resumeMut = useMutation({
    mutationFn: ({ resume, mots_cles }) => mettreAJourResume(id, { resume, mots_cles }),
    onSuccess:  () => { setEditResume(false); qc.invalidateQueries({ queryKey: ['pfe-detail', id] }) },
  })

  const noterMut = useMutation({
    mutationFn: ({ sid, valeur, commentaire }) => soumettreNote(sid, { valeur, type: 'encadrant', commentaire }),
    onSuccess:  () => {
      setNoteError(''); setNoteVal(''); setNoteComment('')
      qc.invalidateQueries({ queryKey: ['soutenances-pfe', id] })
    },
    onError: (e) => setNoteError(e.response?.data?.error?.message ?? 'Erreur'),
  })

  const handleRejeter = () => {
    if (!rejetRemarques.trim()) { setRejetError('Les remarques sont obligatoires'); return }
    rejeterMut.mutate({ lid: rejetTarget.id, remarques: rejetRemarques })
  }

  const handleNote = () => {
    const v = parseFloat(noteVal)
    if (isNaN(v) || v < 0 || v > 20) { setNoteError('La note doit être entre 0 et 20'); return }
    noterMut.mutate({ sid: soutenance.id, valeur: v, commentaire: noteComment })
  }

  const maNote = soutenance?.notes?.find((n) => n.evaluateur?.id === user?.id && n.type === 'encadrant')

  /* ── render ─────────────────────────────────────────────────── */
  /* debug temporaire */
  console.log('[EtudiantDetail] id=', id, ' pfe=', pfe, ' isLoading=', isLoading, ' isError=', isError, ' raw=', data?.data)

  return (
    <DashboardLayout navItems={NAV_ITEMS}>

      {/* Modal validation livrable */}
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
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>Valider ce livrable ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Le {TYPE_META[valideTarget.type_livrable]?.label ?? valideTarget.type_livrable} sera marqué validé
              et l'étudiant sera notifié.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setValideTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Annuler</button>
              <button onClick={() => validerMut.mutate({ lid: valideTarget.id })}
                disabled={validerMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: validerMut.isPending ? 0.7 : 1 }}>
                {validerMut.isPending ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet livrable */}
      {rejetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                 style={{ backgroundColor: '#fef2f2' }}>
              <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>Rejeter le livrable</h3>
            <p className="text-sm text-gray-400 mb-4">
              {TYPE_META[rejetTarget.type_livrable]?.label} v{rejetTarget.version}
              <br/><span className="text-xs text-gray-300">Le motif sera transmis à l'étudiant.</span>
            </p>
            {rejetError && (
              <div className="mb-3 px-3 py-2 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                {rejetError}
              </div>
            )}
            <textarea
              value={rejetRemarques} onChange={(e) => setRejetRemarques(e.target.value)}
              placeholder="Expliquez ce que l'étudiant doit corriger..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none mb-4"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            <div className="flex gap-2">
              <button onClick={() => { setRejetTarget(null); setRejetError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Annuler</button>
              <button onClick={handleRejeter} disabled={rejeterMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#ef4444', opacity: rejeterMut.isPending ? 0.7 : 1 }}>
                {rejeterMut.isPending ? '...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl transition hover:bg-gray-100 flex-shrink-0"
          style={{ color: '#6b7280' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {pfe && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg,#1e3a5f,#2db84b)' }}>
              {(pfe.etudiant?.prenom?.[0] ?? '').toUpperCase()}{(pfe.etudiant?.nom?.[0] ?? '').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>
                  {pfe.etudiant?.prenom} {pfe.etudiant?.nom}
                </h1>
                <Badge statut={pfe.statut} />
              </div>
              <p className="text-sm text-gray-400 truncate">{pfe.titre}</p>
            </div>
          </div>
        )}
        {isLoading && <div className="h-10 w-48 rounded-xl bg-gray-100 animate-pulse" />}
      </div>

      {isError && (
        <div className="py-16 text-center text-sm text-red-400">PFE introuvable ou accès refusé.</div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-50 animate-pulse" />)}
        </div>
      )}

      {pfe && (
        <>
          {/* ── Stats rapides ──────────────────────────────── */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <StatPill label="Livrables validés" value={`${livValides}/${livrables.length}`}
              color="#15803d" bg="#f0fdf4" />
            {livAttente > 0 && (
              <StatPill label="En attente" value={livAttente} color="#d97706" bg="#fffbeb" />
            )}
            {livRejetes > 0 && (
              <StatPill label="Rejetés" value={livRejetes} color="#b91c1c" bg="#fef2f2" />
            )}
            <StatPill label="Plagiat" value={`${pfe.score_plagiat ?? 0}%`}
              color={pfe.score_plagiat > 30 ? '#b91c1c' : pfe.score_plagiat > 15 ? '#d97706' : '#15803d'}
              bg={pfe.score_plagiat > 30 ? '#fef2f2' : pfe.score_plagiat > 15 ? '#fffbeb' : '#f0fdf4'} />
            {soutenance && (
              <StatPill label="Soutenance" value={<Badge statut={soutenance.statut} />}
                color="#7e22ce" bg="#faf5ff" />
            )}
          </div>

          {/* ── Alerte livrables en attente ────────────────── */}
          {livAttente > 0 && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
                 style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <svg width="15" height="15" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-sm font-medium" style={{ color: '#92400e' }}>
                {livAttente} livrable{livAttente > 1 ? 's' : ''} en attente de votre validation
              </p>
            </div>
          )}

          {/* ── Grille principale ──────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Colonne gauche — 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* Infos PFE */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Informations PFE</span>
                </div>
                <div className="px-5 py-2 grid sm:grid-cols-2 gap-x-6">
                  <InfoRow label="Filière"       value={pfe.filiere} />
                  <InfoRow label="Année"         value={pfe.annee} />
                  <InfoRow label="Email étudiant" value={pfe.etudiant?.email} />
                  <InfoRow label="Année académique" value={pfe.annee_academique?.libelle} />
                  {pfe.mention && <InfoRow label="Mention" value={pfe.mention_display ?? pfe.mention} />}
                </div>
              </div>

              {/* Livrables */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                      Livrables ({livrables.length})
                    </span>
                  </div>
                  {/* Barre progression */}
                  {livrables.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full transition-all"
                             style={{ width: `${progression}%`,
                                      backgroundColor: progression === 100 ? '#2db84b' : '#0ea5e9' }} />
                      </div>
                      <span className="text-xs font-semibold"
                            style={{ color: progression === 100 ? '#15803d' : '#1a2744' }}>
                        {progression}%
                      </span>
                    </div>
                  )}
                </div>

                {livrables.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400">Aucun livrable déposé</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {livrables.map((l) => {
                      const meta = TYPE_META[l.type_livrable] ?? TYPE_META.rapport
                      const st   = STATUT_LIVRABLE[l.statut] ?? { color: '#6b7280', bg: '#f9fafb', label: l.statut, icon: '?' }
                      return (
                        <div key={l.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
                          {/* Icône type */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                               style={{ backgroundColor: meta.bg }}>
                            {meta.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                                {meta.label}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#f1f5f9', color: '#6b7280' }}>
                                v{l.version}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: st.bg, color: st.color }}>
                                {st.icon} {st.label}
                              </span>
                              {l.hors_delai && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                                  Hors délai
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Déposé le {new Date(l.date_depot).toLocaleDateString('fr-FR', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            {l.remarques && l.statut === 'REJETE' && (
                              <p className="text-xs mt-1 italic" style={{ color: '#b91c1c' }}>
                                Motif : {l.remarques}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {l.statut === 'EN_ATTENTE_VALIDATION' && (
                              <>
                                <button onClick={() => setValideTarget(l)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                                  style={{ backgroundColor: '#2db84b' }}>
                                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                  Valider
                                </button>
                                <button onClick={() => { setRejetTarget(l); setRejetRemarques(''); setRejetError('') }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                  Rejeter
                                </button>
                              </>
                            )}
                            {l.fichier && (
                              <a href={l.fichier} target="_blank" rel="noreferrer"
                                 className="p-2 rounded-lg hover:bg-gray-100 transition" title="Télécharger">
                                <svg width="13" height="13" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Soutenance */}
              {soutenance && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="#7e22ce" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Soutenance</span>
                    <Badge statut={soutenance.statut} />
                  </div>
                  <div className="px-5 py-4">
                    <div className="grid sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-[11px] text-gray-400 mb-0.5">Date</p>
                        <p className="text-sm font-medium" style={{ color: '#1a2744' }}>
                          {new Date(soutenance.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 mb-0.5">Salle</p>
                        <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{soutenance.salle || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 mb-0.5">Durée</p>
                        <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{soutenance.duree ? `${soutenance.duree} min` : '—'}</p>
                      </div>
                    </div>

                    {soutenance.membres_jury?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11px] text-gray-400 mb-1.5">Membres du jury</p>
                        <div className="flex flex-wrap gap-1.5">
                          {soutenance.membres_jury.map((m) => (
                            <span key={m.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{ backgroundColor: '#f1f5f9', color: '#374151' }}>
                              {m.prenom} {m.nom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {soutenance.note_finale != null && (
                      <div className="px-4 py-3 rounded-xl mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                        <p className="text-[11px] text-gray-500 mb-0.5">Note finale</p>
                        <p className="text-2xl font-black" style={{ color: soutenance.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {soutenance.note_finale}/20
                        </p>
                      </div>
                    )}

                    {/* Notation encadrant */}
                    {maNote ? (
                      <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
                        <p className="text-[11px] text-gray-500 mb-0.5">Ma note (encadrant)</p>
                        <p className="text-xl font-black" style={{ color: '#15803d' }}>{maNote.valeur}/20</p>
                        {maNote.commentaire && (
                          <p className="text-xs text-gray-400 mt-1 italic">"{maNote.commentaire}"</p>
                        )}
                      </div>
                    ) : (soutenance.statut === 'PLANIFIEE' || soutenance.statut === 'TERMINEE') && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-3">Soumettre ma note (encadrant)</p>
                        {noteError && (
                          <div className="mb-3 px-3 py-2 rounded-xl text-sm"
                               style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            {noteError}
                          </div>
                        )}
                        <div className="flex gap-3 items-end">
                          <div>
                            <label className="block text-[11px] text-gray-500 mb-1">Note /20</label>
                            <input type="number" min="0" max="20" step="0.5" value={noteVal}
                              onChange={(e) => setNoteVal(e.target.value)} placeholder="0—20"
                              className="w-24 px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: '#e5e7eb' }}
                              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] text-gray-500 mb-1">Commentaire (optionnel)</label>
                            <input type="text" value={noteComment} onChange={(e) => setNoteComment(e.target.value)}
                              placeholder="Observations..."
                              className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                              style={{ borderColor: '#e5e7eb' }}
                              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                          </div>
                          <button onClick={handleNote} disabled={!noteVal || noterMut.isPending}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                            style={{ backgroundColor: noteVal ? '#2db84b' : '#86c99a' }}>
                            {noterMut.isPending ? '...' : 'Soumettre'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne droite — 1/3 */}
            <div className="space-y-5">

              {/* Score plagiat */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Taux de plagiat</span>
                </div>
                {(() => {
                  const sc = pfe.score_plagiat ?? 0
                  const color = sc > 30 ? '#ef4444' : sc > 15 ? '#f59e0b' : '#2db84b'
                  const label = sc > 30 ? 'Score élevé — à revoir' : sc > 15 ? 'Score modéré' : 'Score acceptable'
                  return (
                    <>
                      <p className="text-4xl font-black mb-1" style={{ color }}>{sc}%</p>
                      <div className="h-2 rounded-full bg-gray-100 mb-2">
                        <div className="h-2 rounded-full transition-all"
                             style={{ width: `${Math.min(sc, 100)}%`, backgroundColor: color }} />
                      </div>
                      <p className="text-xs" style={{ color }}>{label}</p>
                    </>
                  )
                })()}
              </div>

              {/* Résumé & mots-clés */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Résumé</span>
                  </div>
                  {!editResume && (
                    <button onClick={() => { setResumeVal(pfe.resume || ''); setMotsClesVal(pfe.mots_cles || ''); setEditResume(true) }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                      Modifier
                    </button>
                  )}
                </div>
                <div className="p-5">
                  {!editResume ? (
                    <>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        {pfe.resume || <span className="italic text-gray-300 text-xs">Non renseigné</span>}
                      </p>
                      {pfe.mots_cles && (
                        <div className="flex flex-wrap gap-1.5">
                          {pfe.mots_cles.split(',').map((m) => m.trim()).filter(Boolean).map((m) => (
                            <span key={m} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>{m}</span>
                          ))}
                        </div>
                      )}
                      {!pfe.mots_cles && (
                        <p className="text-xs italic text-gray-300">Pas de mots-clés</p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-600">Résumé</label>
                        <textarea rows={5} value={resumeVal} onChange={(e) => setResumeVal(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                          style={{ borderColor: '#e5e7eb' }}
                          onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                          placeholder="Description du travail..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-600">Mots-clés (virgules)</label>
                        <input type="text" value={motsClesVal} onChange={(e) => setMotsClesVal(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                          style={{ borderColor: '#e5e7eb' }}
                          onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                          placeholder="finance, audit, ERP..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditResume(false)}
                          className="flex-1 py-2 rounded-xl text-sm border font-medium"
                          style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Annuler</button>
                        <button onClick={() => resumeMut.mutate({ resume: resumeVal, mots_cles: motsClesVal })}
                          disabled={resumeMut.isPending}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                          style={{ backgroundColor: '#2db84b', opacity: resumeMut.isPending ? 0.7 : 1 }}>
                          {resumeMut.isPending ? '...' : 'Sauvegarder'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
