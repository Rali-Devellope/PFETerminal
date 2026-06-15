import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Badge from '../../components/UI/Badge'
import { getSujets, createSujet } from '../../api/sujets'
import { getEtudiants } from '../../api/auth'
import { useFilieres } from '../../hooks/useFilieres'
import { useAuthStore } from '../../store/authStore'

/* ─── constantes ─────────────────────────────────────────────── */

const STATUT_META = {
  PROPOSE:  { color: '#d97706', bg: '#fffbeb', label: 'Proposé',   dot: '#f59e0b' },
  VALIDE:   { color: '#15803d', bg: '#f0fdf4', label: 'Validé',    dot: '#2db84b' },
  REFUSE:   { color: '#b91c1c', bg: '#fef2f2', label: 'Refusé',    dot: '#ef4444' },
  AFFECTE:  { color: '#1d4ed8', bg: '#eff6ff', label: 'Affecté',   dot: '#3b82f6' },
}

const ORIGINE_META = {
  academique: { color: '#15803d', bg: '#f0fdf4', label: 'Académique' },
  entreprise: { color: '#c2410c', bg: '#fff7ed', label: 'Entreprise' },
}

/* ─── page ────────────────────────────────────────────────────── */

export default function EncadrantSujets() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const initOrigine = user?.role === 'encadrant_entr' ? 'entreprise' : 'academique'
  const INIT_FORM = {
    titre: '', description: '', origine: initOrigine,
    filiere: '', annee: new Date().getFullYear(), etudiant_cible: '', confidentiel: false,
  }

  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(INIT_FORM)
  const [formError, setFormError]   = useState('')
  const [filterStatut, setFilterStatut] = useState('TOUS')

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
  const { data: sujetsRes, isLoading } = useQuery({
    queryKey: ['sujets-encadrant'],
    queryFn: () => getSujets(),
  })
  const { data: etudiantsRes } = useQuery({
    queryKey: ['etudiants-list'],
    queryFn: () => getEtudiants(),
    enabled: showForm,
  })
  const { filieres: filieresData } = useFilieres({ activeOnly: false })

  const sujetsRaw = sujetsRes?.data?.results ?? sujetsRes?.data?.data ?? []
  const sujets = Array.isArray(sujetsRaw) ? sujetsRaw : []

  const etudiantsRaw = etudiantsRes?.data?.results ?? etudiantsRes?.data?.data ?? etudiantsRes?.data ?? []
  const etudiants = Array.isArray(etudiantsRaw) ? etudiantsRaw : []

  /* stats */
  const counts = sujets.reduce((acc, s) => {
    acc[s.statut] = (acc[s.statut] ?? 0) + 1
    return acc
  }, {})

  /* filtrage */
  const filtered = filterStatut === 'TOUS' ? sujets : sujets.filter((s) => s.statut === filterStatut)

  /* mutation */
  const proposerMut = useMutation({
    mutationFn: (data) => createSujet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sujets-encadrant'] })
      setShowForm(false)
      setForm(INIT_FORM)
      setFormError('')
    },
    onError: (e) => {
      const d = e.response?.data
      setFormError(d?.error?.message ?? d?.detail ?? 'Erreur lors de la proposition')
    },
  })

  const handleProposer = (e) => {
    e.preventDefault()
    if (!form.titre || !form.description || !form.filiere || !form.annee || !form.etudiant_cible) {
      setFormError('Remplissez tous les champs obligatoires')
      return
    }
    setFormError('')
    proposerMut.mutate({
      titre: form.titre,
      description: form.description,
      origine: form.origine,
      filiere: form.filiere,
      annee: parseInt(form.annee),
      etudiant_cible: parseInt(form.etudiant_cible),
    })
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white"
  const inputStyle = { borderColor: '#e5e7eb' }
  const onFocus = (e) => (e.target.style.borderColor = '#2db84b')
  const onBlur  = (e) => (e.target.style.borderColor = '#e5e7eb')

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <DashboardLayout navItems={NAV_ITEMS}>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
             onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: '#f0fdf4' }}>
                  <svg width="14" height="14" fill="none" stroke="#2db84b" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h2 className="text-base font-bold" style={{ color: '#1a2744' }}>Proposer un sujet</h2>
              </div>
              <button onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition" style={{ color: '#6b7280' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleProposer} className="p-6">
              {formError && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                     style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Étudiant cible */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Étudiant cible <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select value={form.etudiant_cible}
                    onChange={(e) => setForm({ ...form, etudiant_cible: e.target.value })}
                    className={inputCls} style={inputStyle}>
                    <option value="">Sélectionner un étudiant</option>
                    {etudiants.map((u) => (
                      <option key={u.id} value={u.id}>{u.prenom} {u.nom} — {u.email}</option>
                    ))}
                  </select>
                </div>

                {/* Origine */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">Origine</label>
                  <select value={form.origine} onChange={(e) => setForm({ ...form, origine: e.target.value })}
                    className={inputCls} style={inputStyle}>
                    <option value="academique">Académique</option>
                    <option value="entreprise">Entreprise</option>
                  </select>
                </div>

                {/* Titre */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Titre <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="text" value={form.titre}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                    placeholder="Titre du sujet de PFE"
                    className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Description <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Décrivez le sujet, les objectifs et les technologies..."
                    rows={4} className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none bg-white"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Filière */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Filière <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                    className={inputCls} style={inputStyle}>
                    <option value="">Sélectionner une filière</option>
                    {filieresData.map((f) => (
                      <option key={f.id} value={f.libelle}>{f.libelle}</option>
                    ))}
                  </select>
                </div>

                {/* Année */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Année <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="number" value={form.annee}
                    onChange={(e) => setForm({ ...form, annee: e.target.value })}
                    min="2020" max="2100" className={inputCls} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Confidentiel */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.confidentiel}
                      onChange={(e) => setForm({ ...form, confidentiel: e.target.checked })}
                      className="w-4 h-4 rounded accent-orange-500" />
                    <span className="text-xs font-semibold" style={{ color: '#c2410c' }}>
                      🔒 Sujet confidentiel (accès restreint aux membres autorisés)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                  style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Annuler</button>
                <button type="submit" disabled={proposerMut.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2db84b', opacity: proposerMut.isPending ? 0.7 : 1 }}>
                  {proposerMut.isPending ? 'Envoi...' : 'Proposer le sujet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Sujets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Vos propositions et sujets affectés ({sujets.length})
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#2db84b,#1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Proposer un sujet
        </button>
      </div>

      {/* ── Stats rapides ─────────────────────────────────────── */}
      {sujets.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {Object.entries(STATUT_META).map(([key, meta]) => {
            const n = counts[key] ?? 0
            if (!n) return null
            return (
              <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                   style={{ backgroundColor: meta.bg }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                <span className="text-xs font-semibold" style={{ color: meta.color }}>
                  {n} {meta.label}{n > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filtres statut ────────────────────────────────────── */}
      {sujets.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {['TOUS', 'PROPOSE', 'VALIDE', 'REFUSE', 'AFFECTE'].map((s) => {
            const active = filterStatut === s
            const meta = STATUT_META[s]
            const n = s === 'TOUS' ? sujets.length : (counts[s] ?? 0)
            if (s !== 'TOUS' && !n) return null
            return (
              <button key={s} onClick={() => setFilterStatut(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{
                  backgroundColor: active ? (meta?.bg ?? '#eff6ff') : '#f8fafc',
                  color: active ? (meta?.color ?? '#1d4ed8') : '#6b7280',
                  border: `1px solid ${active ? (meta?.dot ?? '#3b82f6') : '#e5e7eb'}`,
                }}>
                {s === 'TOUS' ? 'Tous' : meta?.label}
                <span className="text-[10px] opacity-70">({n})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Liste ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {isLoading && (
          <div className="p-5 space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ backgroundColor: '#f8fafc' }}>
              <svg width="24" height="24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-400">
              {filterStatut === 'TOUS' ? 'Aucune proposition pour le moment' : `Aucun sujet "${STATUT_META[filterStatut]?.label}"`}
            </p>
            {filterStatut !== 'TOUS' && (
              <button onClick={() => setFilterStatut('TOUS')}
                className="mt-2 text-xs font-semibold"
                style={{ color: '#2db84b' }}>Voir tous</button>
            )}
            {filterStatut === 'TOUS' && (
              <button onClick={() => setShowForm(true)}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: '#2db84b' }}>
                Proposer un premier sujet
              </button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-gray-50">
            {filtered.map((s) => {
              const sm = STATUT_META[s.statut] ?? { color: '#6b7280', bg: '#f9fafb', label: s.statut, dot: '#9ca3af' }
              const om = ORIGINE_META[s.origine] ?? { color: '#6b7280', bg: '#f9fafb', label: s.origine }
              const isProposePar = s.propose_par?.id === user?.id
              return (
                <div key={s.id} className="px-5 py-4 flex items-start gap-4">
                  {/* Icône origine */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ backgroundColor: om.bg }}>
                    <svg width="18" height="18" fill="none" stroke={om.color} strokeWidth="2" viewBox="0 0 24 24">
                      {s.origine === 'entreprise'
                        ? <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>
                        : <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>
                      }
                    </svg>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{s.titre}</span>
                        {s.confidentiel && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>🔒 Confidentiel</span>
                        )}
                      </div>
                      {/* Statut badge */}
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                            style={{ backgroundColor: sm.bg, color: sm.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sm.dot }} />
                        {sm.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{s.description}</p>

                    {/* Méta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                        {s.filiere}
                      </span>
                      <span className="text-[11px] text-gray-400">{s.annee}</span>

                      {/* Étudiant cible */}
                      {s.etudiant_cible && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          {s.etudiant_cible?.prenom ?? s.etudiant?.prenom} {s.etudiant_cible?.nom ?? s.etudiant?.nom}
                        </span>
                      )}

                      {/* Proposé par */}
                      {!isProposePar && s.propose_par && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          Proposé par {s.propose_par?.prenom} {s.propose_par?.nom}
                        </span>
                      )}

                      {/* Encadrant affecté */}
                      {s.encadrant && s.encadrant?.id !== user?.id && (
                        <span className="text-[11px] text-gray-500">
                          Encadrant : {s.encadrant?.prenom} {s.encadrant?.nom}
                        </span>
                      )}
                    </div>

                    {/* Motif refus */}
                    {s.motif_refus && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs"
                           style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                        <span className="font-semibold">Motif de refus :</span> {s.motif_refus}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
