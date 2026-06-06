import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSoutenances, soumettreNote } from '../../api/soutenances'
import { useAuthStore } from '../../store/authStore'

function NoteModal({ soutenance, onClose, onSubmit, loading }) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')
  const [commentaire, setCommentaire] = useState('')

  const noteNum = parseFloat(note)
  const valid = note !== '' && !isNaN(noteNum) && noteNum >= 0 && noteNum <= 20

  const getMention = (n) => {
    if (n >= 16) return { label: t('jury.tres_bien'), color: '#15803d' }
    if (n >= 14) return { label: t('jury.bien'), color: '#1d4ed8' }
    if (n >= 12) return { label: t('jury.assez_bien'), color: '#0ea5e9' }
    if (n >= 10) return { label: t('jury.passable'), color: '#b45309' }
    return { label: t('jury.insuffisant'), color: '#b91c1c' }
  }

  const mention = valid ? getMention(noteNum) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>{t('jury.modal_title')}</h3>
        <p className="text-sm text-gray-400 mb-4">
          {soutenance.pfe?.etudiant?.prenom} {soutenance.pfe?.etudiant?.nom}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('jury.note_label')}</label>
          <div className="relative">
            <input type="number" min="0" max="20" step="0.5"
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t('jury.note_ph')}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none pr-20"
              style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              autoFocus />
            {mention && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: mention.color }}>
                {mention.label}
              </span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('jury.comment_label')}</label>
          <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            rows={3} placeholder={t('jury.comment_ph')}
            className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
            style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
            onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
            {t('common.cancel')}
          </button>
          <button onClick={() => onSubmit({ valeur: noteNum, type: 'jury', commentaire: commentaire || '' })}
            disabled={!valid || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: valid && !loading ? '#2db84b' : '#86c99a' }}>
            {loading ? t('jury.sending') : t('jury.submit_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JuryDashboard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [noteTarget, setNoteTarget] = useState(null)

  const NAV_ITEMS = [
    { to: '/jury', end: true, label: t('nav.mes_soutenances'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ]

  const { data: soutRes, isLoading } = useQuery({
    queryKey: ['soutenances-jury'],
    queryFn: () => getSoutenances(),
  })

  const allSouts = soutRes?.data?.results ?? soutRes?.data?.data ?? []
  const soutsArr = Array.isArray(allSouts) ? allSouts : []

  const mesSoutenances = soutsArr.filter((s) => s.membres_jury?.some((m) => m.id === user?.id))
  const planifiees = mesSoutenances.filter((s) => s.statut === 'PLANIFIEE')
  const terminees = mesSoutenances.filter((s) => s.statut === 'TERMINEE')

  const noteMut = useMutation({
    mutationFn: ({ id, data }) => soumettreNote(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soutenances-jury'] }); setNoteTarget(null) },
  })

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {noteTarget && (
        <NoteModal soutenance={noteTarget} onClose={() => setNoteTarget(null)}
          onSubmit={(data) => noteMut.mutate({ id: noteTarget.id, data })}
          loading={noteMut.isPending} />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          {t('jury.hello', { name: user?.prenom })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('jury.sub')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label={t('jury.stat_total')} value={mesSoutenances.length} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <StatCard label={t('jury.stat_avenir')} value={planifiees.length} color="#f59e0b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label={t('jury.stat_terminees')} value={terminees.length} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
      </div>

      <div className="space-y-5">
        <Card title={t('jury.planif_title', { count: planifiees.length })}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
          {isLoading && (
            <div className="space-y-3">
              {[1,2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}
            </div>
          )}
          {!isLoading && planifiees.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">{t('jury.no_planif')}</p>
          )}
          {!isLoading && planifiees.map((s) => {
            const plagiat = s.pfe?.score_plagiat ?? 0
            const plagiatColor = plagiat > 30 ? '#ef4444' : plagiat > 20 ? '#f59e0b' : '#2db84b'
            return (
              <div key={s.id} className="py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: '#faf5ff' }}>
                    <span className="text-sm font-bold" style={{ color: '#7e22ce' }}>{new Date(s.date).getDate()}</span>
                    <span className="text-[9px] font-medium" style={{ color: '#a78bfa' }}>
                      {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                        {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                      </p>
                      <Badge statut={s.statut} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {s.salle} · {s.duree} {t('common.min')}
                    </p>
                    <p className="text-xs font-medium mt-1" style={{ color: '#1a2744' }}>
                      {s.pfe?.titre ?? s.pfe?.sujet?.titre}
                    </p>
                  </div>
                  <button onClick={() => setNoteTarget(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)' }}>
                    {t('jury.noter_btn')}
                  </button>
                </div>

                {/* Fiche PFE */}
                <div className="mt-3 ms-16 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                    <p className="text-[10px] text-gray-400 mb-0.5">Filière</p>
                    <p className="text-xs font-semibold" style={{ color: '#1a2744' }}>{s.pfe?.filiere ?? '—'}</p>
                  </div>
                  <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                    <p className="text-[10px] text-gray-400 mb-0.5">Encadrant</p>
                    <p className="text-xs font-semibold truncate" style={{ color: '#1a2744' }}>
                      {s.pfe?.encadrant_acad ? `${s.pfe.encadrant_acad.prenom} ${s.pfe.encadrant_acad.nom}` : '—'}
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                    <p className="text-[10px] text-gray-400 mb-0.5">Année</p>
                    <p className="text-xs font-semibold" style={{ color: '#1a2744' }}>{s.pfe?.annee ?? '—'}</p>
                  </div>
                  <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                    <p className="text-[10px] text-gray-400 mb-0.5">Score plagiat</p>
                    <p className="text-xs font-bold" style={{ color: plagiatColor }}>{plagiat}%</p>
                  </div>
                </div>

                {/* Livrables téléchargeables */}
                {s.pfe?.livrables?.length > 0 && (
                  <div className="mt-2 ms-16 flex flex-wrap gap-2">
                    {s.pfe.livrables.filter((l) => l.fichier && l.statut === 'VALIDE').map((l) => (
                      <a key={l.id} href={l.fichier} target="_blank" rel="noreferrer"
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                         style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {l.type_livrable_display ?? l.type_livrable}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Card>

        <Card title={t('jury.term_title', { count: terminees.length })}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}>
          {!isLoading && terminees.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">{t('jury.no_term')}</p>
          )}
          {!isLoading && terminees.map((s) => {
            const maNote = s.notes?.find((n) => n.evaluateur?.id === user?.id)
            return (
              <div key={s.id} className="py-4 flex items-start gap-4 border-b border-gray-50 last:border-0">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0fdf4' }}>
                  <span className="text-sm font-bold" style={{ color: '#15803d' }}>{new Date(s.date).getDate()}</span>
                  <span className="text-[9px] font-medium" style={{ color: '#4ade80' }}>
                    {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                    {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString('fr-FR')} · {s.salle}</p>
                  {s.note_finale != null && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: s.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                      Note finale : {s.note_finale}/20
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {maNote ? (
                    <span className="text-sm font-bold" style={{ color: maNote.valeur >= 10 ? '#15803d' : '#b91c1c' }}>
                      {maNote.valeur}/20
                    </span>
                  ) : (
                    <button onClick={() => setNoteTarget(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: '#2db84b' }}>
                      {t('jury.noter_btn')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </DashboardLayout>
  )
}
