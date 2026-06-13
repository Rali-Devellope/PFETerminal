import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getPFE, mettreAJourResume } from '../../api/pfe'
import { getSoutenances, soumettreNote } from '../../api/soutenances'

export default function EtudiantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { to: '/encadrant', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/encadrant/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/encadrant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  ]

  const qc = useQueryClient()
  const [noteVal, setNoteVal] = useState('')
  const [noteComment, setNoteComment] = useState('')
  const [noteError, setNoteError] = useState('')
  const [noteSuccess, setNoteSuccess] = useState(false)
  const [editResume, setEditResume] = useState(false)
  const [resumeVal, setResumeVal] = useState('')
  const [motsClesVal, setMotsClesVal] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pfe-detail', id],
    queryFn: () => getPFE(id),
  })

  const pfe = data?.data?.data ?? data?.data

  const { data: soutenancesRes } = useQuery({
    queryKey: ['soutenances-pfe', id],
    queryFn: () => getSoutenances({ pfe: id }),
    enabled: !!pfe,
  })
  const soutenancesList = soutenancesRes?.data?.results ?? soutenancesRes?.data?.data ?? soutenancesRes?.data ?? []
  const soutenance = Array.isArray(soutenancesList) ? soutenancesList[0] : null

  const resumeMut = useMutation({
    mutationFn: ({ resume, mots_cles }) => mettreAJourResume(id, { resume, mots_cles }),
    onSuccess: () => { setEditResume(false); qc.invalidateQueries({ queryKey: ['pfe-detail', id] }) },
  })

  const noterMut = useMutation({
    mutationFn: ({ sid, valeur, commentaire }) => soumettreNote(sid, { valeur, type: 'encadrant', commentaire }),
    onSuccess: () => {
      setNoteSuccess(true); setNoteError(''); setNoteVal(''); setNoteComment('')
      qc.invalidateQueries({ queryKey: ['soutenances-pfe', id] })
    },
    onError: (e) => setNoteError(e.response?.data?.error?.message ?? 'Erreur lors de la soumission'),
  })

  const TYPE_LABELS = { rapport: 'Rapport', presentation: 'Présentation', code: 'Code source' }
  const livrablesValides = pfe?.livrables?.filter((l) => l.statut === 'VALIDE').length ?? 0
  const livrablesTotal = pfe?.livrables?.length ?? 0
  const progression = livrablesTotal > 0 ? Math.round((livrablesValides / livrablesTotal) * 100) : 0

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
          style={{ color: '#6b7280' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {pfe ? `${pfe.etudiant?.prenom} ${pfe.etudiant?.nom}` : '...'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Détail du PFE</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-50 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500 py-6 text-center">PFE introuvable ou accès refusé.</p>
      )}

      {pfe && (
        <div className="space-y-5">
          {/* Infos PFE */}
          <Card title="Informations PFE"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Titre', value: pfe.titre },
                { label: 'Filière', value: pfe.filiere },
                { label: 'Année', value: pfe.annee },
                { label: 'Email', value: pfe.etudiant?.email },
              ].map(({ label, value }) => (
                <div key={label} className="py-2.5 border-b border-gray-50">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{value ?? '—'}</p>
                </div>
              ))}
              <div className="py-2.5 border-b border-gray-50 sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Statut</p>
                <Badge statut={pfe.statut} />
              </div>
            </div>
          </Card>

          {/* Résumé + mots-clés */}
          <Card title="Résumé & Mots-clés"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}>
            {!editResume ? (
              <div>
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Résumé</p>
                  <p className="text-sm" style={{ color: '#1a2744' }}>
                    {pfe.resume || <span className="italic text-gray-300">Non renseigné</span>}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1">Mots-clés</p>
                  {pfe.mots_cles
                    ? <div className="flex flex-wrap gap-1.5">
                        {pfe.mots_cles.split(',').map((m) => m.trim()).filter(Boolean).map((m) => (
                          <span key={m} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>{m}</span>
                        ))}
                      </div>
                    : <span className="text-sm italic text-gray-300">Non renseigné</span>
                  }
                </div>
                <button onClick={() => { setResumeVal(pfe.resume || ''); setMotsClesVal(pfe.mots_cles || ''); setEditResume(true) }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                  Modifier
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Résumé</label>
                  <textarea rows={4} value={resumeVal} onChange={(e) => setResumeVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                    style={{ borderColor: '#e5e7eb' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                    placeholder="Description du travail réalisé..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Mots-clés (séparés par des virgules)</label>
                  <input type="text" value={motsClesVal} onChange={(e) => setMotsClesVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: '#e5e7eb' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                    placeholder="finance, audit, ERP, ..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditResume(false)}
                    className="flex-1 py-2 rounded-xl text-sm border font-medium"
                    style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                    Annuler
                  </button>
                  <button onClick={() => resumeMut.mutate({ resume: resumeVal, mots_cles: motsClesVal })}
                    disabled={resumeMut.isPending}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: '#2db84b', opacity: resumeMut.isPending ? 0.7 : 1 }}>
                    {resumeMut.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Progression livrables */}
          <Card title={`Livrables (${livrablesValides}/${livrablesTotal} validés)`}
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
            {/* Barre progression */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progression</span>
                <span className="font-semibold" style={{ color: progression === 100 ? '#15803d' : '#1a2744' }}>
                  {progression}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full transition-all duration-500"
                     style={{ width: `${progression}%`, backgroundColor: progression === 100 ? '#2db84b' : '#0ea5e9' }} />
              </div>
            </div>

            {pfe.livrables?.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun livrable déposé</p>
            )}
            <div className="divide-y divide-gray-50">
              {pfe.livrables?.map((l) => (
                <div key={l.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: l.statut === 'VALIDE' ? '#f0fdf4' : l.statut === 'REFUSE' ? '#fef2f2' : '#f1f5f9' }}>
                    <svg width="15" height="15" fill="none"
                         stroke={l.statut === 'VALIDE' ? '#2db84b' : l.statut === 'REFUSE' ? '#ef4444' : '#94a3b8'}
                         strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: '#1a2744' }}>
                        {TYPE_LABELS[l.type_livrable] ?? l.type_livrable}
                      </p>
                      {l.version > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                          v{l.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(l.date_depot).toLocaleDateString('fr-FR')}
                      {l.hors_delai && <span className="ml-1 text-orange-500">· Hors délai</span>}
                      {l.remarques && ` · ${l.remarques}`}
                    </p>
                  </div>
                  <Badge statut={l.statut} />
                  {l.fichier && (
                    <a href={l.fichier} target="_blank" rel="noreferrer"
                       className="p-1.5 rounded-lg hover:bg-gray-100 transition" title="Télécharger">
                      <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Score plagiat */}
          {pfe.score_plagiat != null && (
            <Card title="Analyse plagiat"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-3xl font-black"
                     style={{ color: pfe.score_plagiat > 30 ? '#ef4444' : pfe.score_plagiat > 20 ? '#f59e0b' : '#2db84b' }}>
                    {pfe.score_plagiat}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {pfe.score_plagiat > 30 ? 'Score élevé — à revoir' : pfe.score_plagiat > 20 ? 'Score modéré' : 'Score acceptable'}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-gray-100">
                    <div className="h-3 rounded-full transition-all"
                         style={{
                           width: `${Math.min(pfe.score_plagiat, 100)}%`,
                           backgroundColor: pfe.score_plagiat > 30 ? '#ef4444' : pfe.score_plagiat > 20 ? '#f59e0b' : '#2db84b'
                         }} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Soutenance + note encadrant */}
          {soutenance && (
            <Card title="Soutenance"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Date', value: new Date(soutenance.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) },
                  { label: 'Salle', value: soutenance.salle || '—' },
                  { label: 'Statut', value: <Badge statut={soutenance.statut} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="py-2 border-b border-gray-50">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <div className="text-sm font-medium" style={{ color: '#1a2744' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Note encadrant déjà soumise */}
              {soutenance.notes?.filter((n) => n.type === 'encadrant').length > 0 && (
                <div className="px-3 py-2.5 rounded-xl mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                  <p className="text-xs text-gray-500 mb-0.5">Ma note soumise</p>
                  <p className="text-2xl font-black" style={{ color: '#15803d' }}>
                    {soutenance.notes.filter((n) => n.type === 'encadrant')[0]?.valeur}/20
                  </p>
                </div>
              )}

              {/* Formulaire de note */}
              {soutenance.statut === 'PLANIFIEE' && soutenance.notes?.filter((n) => n.type === 'encadrant').length === 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">Soumettre ma note (encadrant)</p>
                  {noteError && (
                    <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                      {noteError}
                    </p>
                  )}
                  {noteSuccess && (
                    <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                      Note soumise avec succès.
                    </p>
                  )}
                  <div className="flex gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Note /20</label>
                      <input type="number" min="0" max="20" step="0.5" value={noteVal}
                        onChange={(e) => setNoteVal(e.target.value)}
                        placeholder="0—20"
                        className="w-24 px-3 py-2 rounded-xl text-sm border outline-none"
                        style={{ borderColor: '#e5e7eb' }}
                        onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Commentaire (optionnel)</label>
                      <input type="text" value={noteComment}
                        onChange={(e) => setNoteComment(e.target.value)}
                        placeholder="Commentaire..."
                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                        style={{ borderColor: '#e5e7eb' }}
                        onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                    </div>
                    <button
                      onClick={() => {
                        const v = parseFloat(noteVal)
                        if (isNaN(v) || v < 0 || v > 20) { setNoteError('Note invalide (0–20)'); return }
                        noterMut.mutate({ sid: soutenance.id, valeur: v, commentaire: noteComment })
                      }}
                      disabled={noterMut.isPending || !noteVal}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ backgroundColor: noteVal ? '#2db84b' : '#86c99a' }}>
                      {noterMut.isPending ? '...' : 'Soumettre'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
