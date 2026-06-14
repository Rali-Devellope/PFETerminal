import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Badge from '../../components/UI/Badge'
import { getPFEs } from '../../api/pfe'
import { getSoutenances, soumettreNote } from '../../api/soutenances'
import { useAuthStore } from '../../store/authStore'

/* ─── helpers ────────────────────────────────────────────────── */

function Avatar({ prenom, nom, size = 10 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg,#1e3a5f,#2db84b)' }}
    >
      {(prenom?.[0] ?? '').toUpperCase()}{(nom?.[0] ?? '').toUpperCase()}
    </div>
  )
}

function StatCard({ label, value, color, bg, icon, badge }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: bg, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: color }}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const TYPE_ICONS = {
  rapport:      { icon: '📄', label: 'Rapport' },
  code:         { icon: '💻', label: 'Code' },
  presentation: { icon: '📊', label: 'Présentation' },
}

function LivrablePills({ livrables }) {
  if (!livrables?.length) return <span className="text-[10px] text-gray-300">Aucun livrable</span>
  const derniers = {}
  for (const l of livrables) {
    if (!derniers[l.type_livrable ?? l.type] ||
        new Date(l.date_depot) > new Date(derniers[l.type_livrable ?? l.type].date_depot)) {
      derniers[l.type_livrable ?? l.type] = l
    }
  }
  const COLORS = {
    VALIDE:               { bg: '#dcfce7', color: '#15803d' },
    EN_ATTENTE_VALIDATION:{ bg: '#fef9c3', color: '#92400e' },
    REJETE:               { bg: '#fee2e2', color: '#b91c1c' },
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(derniers).map(([type, l]) => {
        const c = COLORS[l.statut] ?? { bg: '#f1f5f9', color: '#6b7280' }
        const icon = TYPE_ICONS[type]?.icon ?? '📄'
        return (
          <span key={type} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: c.bg, color: c.color }}>
            {icon} {TYPE_ICONS[type]?.label ?? type}
          </span>
        )
      })}
    </div>
  )
}

/* ─── dashboard ──────────────────────────────────────────────── */

export default function EncadrantDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [noteTarget, setNoteTarget] = useState(null)
  const [noteVal, setNoteVal]       = useState('')
  const [noteComment, setNoteComment] = useState('')
  const [noteError, setNoteError]   = useState('')

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

  const { data: pfesRes, isLoading: pfesLoading } = useQuery({
    queryKey: ['pfe-encadrant'],
    queryFn: getPFEs,
  })
  const { data: soutRes } = useQuery({
    queryKey: ['soutenances-encadrant'],
    queryFn: getSoutenances,
  })

  const pfes  = Array.isArray(pfesRes?.data?.results ?? pfesRes?.data?.data ?? pfesRes?.data) ? (pfesRes?.data?.results ?? pfesRes?.data?.data ?? pfesRes?.data) : []
  const souts = Array.isArray(soutRes?.data?.results ?? soutRes?.data?.data ?? soutRes?.data) ? (soutRes?.data?.results ?? soutRes?.data?.data ?? soutRes?.data) : []

  /* stats */
  const enCours    = pfes.filter((p) => p.statut === 'EN_COURS').length
  const archives   = pfes.filter((p) => p.statut === 'ARCHIVE').length
  const soutPlans  = souts.filter((s) => s.statut === 'PLANIFIEE')
  const prochaine  = soutPlans[0] ?? null

  const allLivrables  = pfes.flatMap((p) => p.livrables ?? [])
  const livAttenteCount = allLivrables.filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
  const pfesAvecAttente = pfes.filter((p) =>
    (p.livrables ?? []).some((l) => l.statut === 'EN_ATTENTE_VALIDATION')
  )

  const noteMut = useMutation({
    mutationFn: ({ id, data }) => soumettreNote(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soutenances-encadrant'] })
      setNoteTarget(null); setNoteVal(''); setNoteComment(''); setNoteError('')
    },
    onError: (e) => setNoteError(e.response?.data?.error?.message ?? 'Erreur lors de la soumission'),
  })

  const handleNote = () => {
    const v = parseFloat(noteVal)
    if (isNaN(v) || v < 0 || v > 20) { setNoteError('La note doit être entre 0 et 20'); return }
    setNoteError('')
    noteMut.mutate({ id: noteTarget.id, data: { valeur: v, type: 'encadrant', commentaire: noteComment } })
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>

      {/* ── Modal notation ─────────────────────────────────── */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ backgroundColor: '#f0fdf4' }}>
                <svg width="18" height="18" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1a2744' }}>Ma note — Encadrant</h3>
                <p className="text-xs text-gray-400">
                  {noteTarget.pfe?.etudiant?.prenom} {noteTarget.pfe?.etudiant?.nom}
                  {noteTarget.pfe?.titre && ` · ${noteTarget.pfe.titre}`}
                </p>
              </div>
            </div>

            {noteError && (
              <div className="mb-3 px-3 py-2 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                {noteError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">Note * (0 – 20)</label>
              <input type="number" min="0" max="20" step="0.5" value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                placeholder="Ex : 14.5" autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">Commentaire</label>
              <textarea value={noteComment} onChange={(e) => setNoteComment(e.target.value)} rows={3}
                placeholder="Observations sur le travail de l'étudiant..."
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setNoteTarget(null); setNoteError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                Annuler
              </button>
              <button onClick={handleNote} disabled={!noteVal || noteMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: noteVal ? '#2db84b' : '#86c99a' }}>
                {noteMut.isPending ? 'Envoi...' : 'Soumettre la note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête ────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble de vos étudiants et de l'avancement de leurs PFE
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Étudiants encadrés"
          value={pfes.length}
          color="#1a2744" bg="#eef1f8"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Livrables en attente"
          value={livAttenteCount}
          color={livAttenteCount > 0 ? '#d97706' : '#6b7280'}
          bg={livAttenteCount > 0 ? '#fffbeb' : '#f9fafb'}
          badge={livAttenteCount > 0 ? 'À valider' : undefined}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard
          label="PFE en cours"
          value={enCours}
          color="#0ea5e9" bg="#f0f9ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label="Soutenances planifiées"
          value={soutPlans.length}
          color="#7e22ce" bg="#faf5ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>}
        />
      </div>

      {/* ── Alerte livrables en attente ────────────────────── */}
      {livAttenteCount > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
             style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: '#fef3c7' }}>
              <svg width="16" height="16" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                {livAttenteCount} livrable{livAttenteCount > 1 ? 's' : ''} en attente de validation
              </p>
              <p className="text-xs text-amber-600">
                {pfesAvecAttente.length} étudiant{pfesAvecAttente.length > 1 ? 's' : ''} concerné{pfesAvecAttente.length > 1 ? 's' : ''} :{' '}
                {pfesAvecAttente.map((p) => `${p.etudiant?.prenom} ${p.etudiant?.nom}`).join(', ')}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/encadrant/livrables')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: '#d97706' }}>
            Valider →
          </button>
        </div>
      )}

      {/* ── Grille principale ──────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Liste étudiants — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                Mes étudiants ({pfes.length})
              </span>
            </div>
          </div>

          {pfesLoading && (
            <div className="p-5 space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-50 animate-pulse" />)}
            </div>
          )}

          {!pfesLoading && pfes.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">Aucun étudiant encadré pour le moment</p>
            </div>
          )}

          {!pfesLoading && (
            <div className="divide-y divide-gray-50">
              {pfes.map((p) => {
                const sout = souts.find((s) => s.pfe?.id === p.id)
                const plagiatColor = p.score_plagiat > 30 ? '#ef4444' : p.score_plagiat > 15 ? '#f59e0b' : '#2db84b'
                const livAttenteP = (p.livrables ?? []).filter((l) => l.statut === 'EN_ATTENTE_VALIDATION').length
                return (
                  <div key={p.id}
                       className="px-5 py-4 flex items-center gap-4 cursor-pointer transition hover:bg-gray-50"
                       onClick={() => navigate(`/encadrant/etudiant/${p.id}`)}>

                    {/* Avatar */}
                    <Avatar prenom={p.etudiant?.prenom} nom={p.etudiant?.nom} size={10} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                          {p.etudiant?.prenom} {p.etudiant?.nom}
                        </p>
                        <Badge statut={p.statut} />
                        {livAttenteP > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: '#f59e0b' }}>
                            {livAttenteP} en attente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-1.5">{p.titre ?? '—'}</p>
                      <LivrablePills livrables={p.livrables} />
                    </div>

                    {/* Score plagiat + soutenance */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {p.score_plagiat > 0 && (
                        <span className="text-[11px] font-bold" style={{ color: plagiatColor }}>
                          {p.score_plagiat}% plagiat
                        </span>
                      )}
                      {sout?.note_finale != null && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: sout.note_finale >= 10 ? '#dcfce7' : '#fee2e2',
                                       color: sout.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {sout.note_finale}/20
                        </span>
                      )}
                      <svg width="14" height="14" fill="none" stroke="#d1d5db" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Colonne droite — 1/3 */}
        <div className="flex flex-col gap-5">

          {/* Prochaine soutenance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#7e22ce" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Prochaine soutenance</span>
            </div>
            <div className="p-5">
              {!prochaine ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucune soutenance planifiée</p>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: '#ede9fe' }}>
                    <span className="text-sm font-bold leading-tight" style={{ color: '#7e22ce' }}>
                      {new Date(prochaine.date).getDate()}
                    </span>
                    <span className="text-[9px] font-semibold uppercase" style={{ color: '#a78bfa' }}>
                      {new Date(prochaine.date).toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                      {prochaine.pfe?.etudiant?.prenom} {prochaine.pfe?.etudiant?.nom}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{prochaine.pfe?.titre}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(prochaine.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{prochaine.salle}
                      {prochaine.duree && ` · ${prochaine.duree} min`}
                    </p>
                    {prochaine.membres_jury?.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Jury : {prochaine.membres_jury.map((m) => `${m.prenom} ${m.nom}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {soutPlans.length > 1 && (
                <p className="text-[11px] text-gray-400 mt-3 text-center">
                  + {soutPlans.length - 1} autre{soutPlans.length > 2 ? 's' : ''} soutenance{soutPlans.length > 2 ? 's' : ''} planifiée{soutPlans.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Soutenances terminées */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Soutenances terminées</span>
            </div>
            <div className="p-4">
              {souts.filter((s) => s.statut === 'TERMINEE').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucune soutenance terminée</p>
              ) : (
                <div className="space-y-2">
                  {souts.filter((s) => s.statut === 'TERMINEE').map((s) => {
                    const maNote = s.notes?.find((n) => n.evaluateur?.id === user?.id && n.type === 'encadrant')
                    return (
                      <div key={s.id} className="p-3 rounded-xl flex items-center justify-between gap-2"
                           style={{ backgroundColor: '#f0fdf4' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1a2744' }}>
                            {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(s.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {maNote ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                              Ma note : {maNote.valeur}/20
                            </span>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setNoteTarget(s); setNoteError('') }}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg text-white"
                              style={{ backgroundColor: '#2db84b' }}>
                              + Note
                            </button>
                          )}
                          {s.note_finale != null && (
                            <span className="text-xs font-bold"
                                  style={{ color: s.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                              {s.note_finale}/20
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PFE archivés */}
          {archives > 0 && (
            <div className="px-5 py-3.5 rounded-2xl flex items-center gap-3"
                 style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-600">{archives} PFE archivé{archives > 1 ? 's' : ''}</p>
                <p className="text-[11px] text-gray-400">Soutenances terminées</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
