import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSoutenances, planifierSoutenance, affecterJury, calculerNoteFinale, telechargerPlanning, getFilieres, getSessionPreview, planifierSession } from '../../api/soutenances'
import { getPFEs, getAnneeActive, setDateLimiteSoutenance } from '../../api/pfe'
import { getUsers } from '../../api/auth'
import { COORD_NAV } from './Dashboard'
import { PVButton, ReleveButton } from '../../components/UI/PdfButtons'

const INIT_FORM = { pfe: '', date: '', salle: '', duree: 60 }

export default function CoordinateurSoutenances() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formTab, setFormTab] = useState('individuelle') // 'individuelle' | 'session'
  const [form, setForm] = useState(INIT_FORM)
  const [sessionForm, setSessionForm] = useState({ filiere: '', date_debut: '', salle: '', duree: 30 })
  const [sessionError, setSessionError] = useState('')
  const [juryTarget, setJuryTarget] = useState(null)
  const [selectedJury, setSelectedJury] = useState([])
  const [selectedPresident, setSelectedPresident] = useState(null)
  const [formError, setFormError] = useState('')
  const [showDeadlineForm, setShowDeadlineForm] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState('')

  const NAV_ITEMS = COORD_NAV(t)

  const { data: soutRes, isLoading } = useQuery({ queryKey: ['soutenances'], queryFn: () => getSoutenances() })
  const { data: pfeRes } = useQuery({ queryKey: ['pfe-list'], queryFn: () => getPFEs(), enabled: showForm && formTab === 'individuelle' })
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => getUsers(), enabled: !!juryTarget })
  const { data: anneeRes } = useQuery({ queryKey: ['annee-active'], queryFn: getAnneeActive })
  const { data: filieresRes } = useQuery({ queryKey: ['filieres'], queryFn: getFilieres, enabled: showForm && formTab === 'session' })
  const { data: previewRes } = useQuery({
    queryKey: ['session-preview', sessionForm.filiere],
    queryFn: () => getSessionPreview(sessionForm.filiere),
    enabled: showForm && formTab === 'session' && !!sessionForm.filiere,
  })

  const soutenances = soutRes?.data?.results ?? soutRes?.data?.data ?? []
  const soutsArr = Array.isArray(soutenances) ? soutenances : []
  const pfes = pfeRes?.data?.results ?? pfeRes?.data?.data ?? []
  const pfesArr = Array.isArray(pfes) ? pfes : []
  const users = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const juryUsers = Array.isArray(users) ? users.filter((u) => u.role === 'jury') : []
  const anneeActive = anneeRes?.data?.data ?? null
  const dateLimit = anneeActive?.date_limite_soutenance ?? null

  const joursRestants = dateLimit
    ? Math.ceil((new Date(dateLimit) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const dateDepassee = joursRestants !== null && joursRestants < 0
  const dateProche   = joursRestants !== null && joursRestants >= 0 && joursRestants <= 14

  const formDateDepasseLimit = dateLimit && form.date
    ? new Date(form.date) > new Date(dateLimit)
    : false

  const planifierMut = useMutation({
    mutationFn: planifierSoutenance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soutenances'] }); setShowForm(false); setForm(INIT_FORM); setFormError('') },
    onError: (e) => setFormError(e.response?.data?.error?.message ?? 'Erreur lors de la planification'),
  })

  const juryMut = useMutation({
    mutationFn: ({ id, jury_ids, president_id }) => affecterJury(id, { jury_ids, president_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soutenances'] })
      setJuryTarget(null); setSelectedJury([]); setSelectedPresident(null)
    },
  })

  const noteMut = useMutation({
    mutationFn: calculerNoteFinale,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soutenances'] }),
  })

  const deadlineMut = useMutation({
    mutationFn: ({ id, date }) => setDateLimiteSoutenance(id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annee-active'] })
      setShowDeadlineForm(false)
      setDeadlineInput('')
    },
  })

  const sessionMut = useMutation({
    mutationFn: planifierSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soutenances'] })
      setShowForm(false)
      setSessionForm({ filiere: '', date_debut: '', salle: '', duree: 30 })
      setSessionError('')
    },
    onError: (e) => setSessionError(e.response?.data?.error?.message ?? 'Erreur'),
  })

  const filieres = filieresRes?.data?.data ?? []
  const previewStudents = previewRes?.data?.data ?? []

  const handlePlanifier = (e) => {
    e.preventDefault()
    if (!form.pfe || !form.date || !form.salle) { setFormError('Remplissez tous les champs obligatoires'); return }
    setFormError('')
    planifierMut.mutate({ pfe: parseInt(form.pfe), date: form.date, salle: form.salle, duree: parseInt(form.duree) })
  }

  const toggleJury = (id) => setSelectedJury((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('coordinateur.souts_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('coordinateur.souts_sub')}</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showForm ? <line x1="18" y1="6" x2="6" y2="18"/> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {showForm ? t('common.cancel') : t('coordinateur.planifier_btn')}
        </button>
        <button
          onClick={async () => {
            const { data } = await telechargerPlanning()
            const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
            const a = document.createElement('a'); a.href = url; a.download = 'planning_soutenances.pdf'; a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Planning PDF
        </button>
      </div>

      {anneeActive && (
        <div className="mb-5 rounded-xl border overflow-hidden"
          style={{ borderColor: dateDepassee ? '#fecaca' : dateProche ? '#fde68a' : dateLimit ? '#bbf7d0' : '#e5e7eb' }}>
          <div className="px-4 py-3 flex items-center justify-between gap-3"
            style={{ backgroundColor: dateDepassee ? '#fef2f2' : dateProche ? '#fffbeb' : dateLimit ? '#f0fdf4' : '#f9fafb' }}>
            <div className="flex items-center gap-3">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                style={{ color: dateDepassee ? '#b91c1c' : dateProche ? '#92400e' : dateLimit ? '#166534' : '#6b7280' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
              </svg>
              <span className="text-sm font-medium"
                style={{ color: dateDepassee ? '#b91c1c' : dateProche ? '#92400e' : dateLimit ? '#166534' : '#6b7280' }}>
                {dateLimit ? (
                  <>
                    {t('coordinateur.deadline_sout_label')} :{' '}
                    <strong>{new Date(dateLimit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    {dateDepassee && <span className="ml-2">— {t('coordinateur.deadline_depasse')}</span>}
                    {dateProche && !dateDepassee && <span className="ml-2">— {t('coordinateur.deadline_jours', { count: joursRestants })}</span>}
                  </>
                ) : (
                  <span className="text-gray-400">{t('coordinateur.deadline_non_definie')}</span>
                )}
              </span>
            </div>
            <button onClick={() => { setShowDeadlineForm((v) => !v); setDeadlineInput(dateLimit ?? '') }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
              style={{ backgroundColor: '#1a2744', color: '#fff' }}>
              {dateLimit ? t('coordinateur.deadline_modifier') : t('coordinateur.deadline_definir')}
            </button>
          </div>

          {showDeadlineForm && (
            <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
              <input type="date" value={deadlineInput} onChange={(e) => setDeadlineInput(e.target.value)}
                min={anneeActive.date_debut} max={anneeActive.date_fin}
                className="px-3 py-2 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }} />
              <button
                onClick={() => deadlineMut.mutate({ id: anneeActive.id, date: deadlineInput })}
                disabled={!deadlineInput || deadlineMut.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: !deadlineInput ? 0.5 : 1 }}>
                {t('common.save') ?? 'Enregistrer'}
              </button>
              {dateLimit && (
                <button onClick={() => deadlineMut.mutate({ id: anneeActive.id, date: '' })}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                  {t('common.delete') ?? 'Supprimer'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Card className="mb-5"
          title={
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#f3f4f6' }}>
              {['individuelle', 'session'].map((tab) => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{
                    backgroundColor: formTab === tab ? '#1a2744' : 'transparent',
                    color: formTab === tab ? '#fff' : '#6b7280',
                  }}>
                  {tab === 'individuelle' ? t('coordinateur.tab_individuelle') : t('coordinateur.tab_session')}
                </button>
              ))}
            </div>
          }
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>

          {/* ── Onglet Session par filière ── */}
          {formTab === 'session' && (
            <div className="space-y-4">
              {sessionError && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                  {sessionError}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.filiere_label')}</label>
                  <select value={sessionForm.filiere} onChange={(e) => setSessionForm({ ...sessionForm, filiere: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}>
                    <option value="">{t('coordinateur.select_filiere')}</option>
                    {filieres.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.datetime')}</label>
                  <input type="datetime-local" value={sessionForm.date_debut}
                    onChange={(e) => setSessionForm({ ...sessionForm, date_debut: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.salle')}</label>
                  <input type="text" value={sessionForm.salle}
                    onChange={(e) => setSessionForm({ ...sessionForm, salle: e.target.value })}
                    placeholder={t('coordinateur.salle_ph')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.duree')}</label>
                  <input type="number" value={sessionForm.duree} min="15" max="120" step="15"
                    onChange={(e) => setSessionForm({ ...sessionForm, duree: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
              </div>

              {sessionForm.filiere && previewStudents.length > 0 && (
                <div className="rounded-xl p-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#166534' }}>
                    {t('coordinateur.session_preview', { count: previewStudents.length })}
                  </p>
                  <div className="space-y-1">
                    {previewStudents.map((s, i) => {
                      const h = sessionForm.date_debut
                        ? new Date(new Date(sessionForm.date_debut).getTime() + i * sessionForm.duree * 60000)
                            .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : `+${i * sessionForm.duree}min`
                      return (
                        <div key={s.pfe_id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-mono w-12 font-semibold" style={{ color: '#2db84b' }}>{h}</span>
                          <span>{s.etudiant}</span>
                          <span className="text-gray-400">— {s.titre?.slice(0, 30)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {sessionForm.filiere && previewStudents.length === 0 && (
                <p className="text-sm text-gray-400">{t('coordinateur.session_no_eligible')}</p>
              )}

              <div className="flex justify-end">
                <button type="button"
                  disabled={!sessionForm.filiere || !sessionForm.date_debut || !sessionForm.salle || previewStudents.length === 0 || sessionMut.isPending}
                  onClick={() => sessionMut.mutate(sessionForm)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2db84b', opacity: (!sessionForm.filiere || !sessionForm.date_debut || !sessionForm.salle || previewStudents.length === 0) ? 0.5 : 1 }}>
                  {sessionMut.isPending ? t('coordinateur.planning') : t('coordinateur.session_btn', { count: previewStudents.length })}
                </button>
              </div>
            </div>
          )}

          {/* ── Onglet Individuelle ── */}
          {formTab === 'individuelle' && (
          <form onSubmit={handlePlanifier} className="grid sm:grid-cols-2 gap-4">
            {formError && (
              <div className="sm:col-span-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.pfe_label')}</label>
              <select value={form.pfe} onChange={(e) => setForm({ ...form, pfe: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}>
                <option value="">{t('coordinateur.select_pfe')}</option>
                {pfesArr.map((p) => {
                  const rapportOk = p.livrables?.some((l) => l.type_livrable === 'rapport' && l.statut === 'VALIDE')
                  const plagiatOk = (p.score_plagiat ?? 0) <= 30
                  const pret = rapportOk && plagiatOk
                  return (
                    <option key={p.id} value={p.id}>
                      {pret ? '✅' : '⚠️'} {p.etudiant?.prenom} {p.etudiant?.nom} — {p.titre?.slice(0, 25)}
                      {!rapportOk ? ' (rapport manquant)' : ''}
                      {!plagiatOk ? ` (plagiat ${p.score_plagiat}%)` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.datetime')}</label>
              <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ borderColor: formDateDepasseLimit ? '#ef4444' : '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = formDateDepasseLimit ? '#ef4444' : '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = formDateDepasseLimit ? '#ef4444' : '#e5e7eb')} />
              {formDateDepasseLimit && (
                <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>
                  ⚠ {t('coordinateur.date_apres_limite', {
                    date: new Date(dateLimit).toLocaleDateString('fr-FR')
                  })}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.salle')}</label>
              <input type="text" value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })}
                placeholder={t('coordinateur.salle_ph')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('coordinateur.duree')}</label>
              <input type="number" value={form.duree} onChange={(e) => setForm({ ...form, duree: e.target.value })}
                min="15" max="120" step="15"
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={planifierMut.isPending}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: planifierMut.isPending ? 0.7 : 1 }}>
                {planifierMut.isPending ? t('coordinateur.planning') : t('coordinateur.confirm_btn')}
              </button>
            </div>
          </form>
          )}
        </Card>
      )}

      {juryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>{t('coordinateur.affecter_jury')}</h3>
            <p className="text-sm text-gray-400 mb-4">{juryTarget.pfe?.etudiant?.prenom} {juryTarget.pfe?.etudiant?.nom}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {juryUsers.length === 0 && <p className="text-sm text-gray-400">{t('coordinateur.no_jury')}</p>}
              {juryUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selectedJury.includes(u.id)} onChange={() => toggleJury(u.id)} className="rounded" />
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                       style={{ backgroundColor: '#1e3a5f' }}>
                    {u.prenom?.[0]}{u.nom?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{u.prenom} {u.nom}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  {selectedJury.includes(u.id) && (
                    <button type="button"
                      onClick={(e) => { e.preventDefault(); setSelectedPresident(selectedPresident === u.id ? null : u.id) }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition"
                      style={{
                        borderColor: selectedPresident === u.id ? '#7e22ce' : '#e5e7eb',
                        backgroundColor: selectedPresident === u.id ? '#faf5ff' : 'transparent',
                        color: selectedPresident === u.id ? '#7e22ce' : '#9ca3af',
                      }}>
                      {selectedPresident === u.id ? '★ Président' : '☆ Président'}
                    </button>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setJuryTarget(null); setSelectedJury([]) }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                {t('common.cancel')}
              </button>
              <button onClick={() => juryMut.mutate({ id: juryTarget.id, jury_ids: selectedJury, president_id: selectedPresident })}
                disabled={selectedJury.length === 0 || juryMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: selectedJury.length > 0 ? '#2db84b' : '#86c99a' }}>
                {t('common.confirm')} ({selectedJury.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <Card title={t('coordinateur.all_souts', { count: soutsArr.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
        {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}</div>}
        {!isLoading && soutsArr.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">{t('coordinateur.no_souts_list')}</p>}
        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {soutsArr.map((s) => (
              <div key={s.id} className="py-4 flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: '#faf5ff' }}>
                  <span className="text-sm font-bold" style={{ color: '#7e22ce' }}>{new Date(s.date).getDate()}</span>
                  <span className="text-[9px] font-medium" style={{ color: '#a78bfa' }}>
                    {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                      {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                    </span>
                    <Badge statut={s.statut} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {s.salle} · {s.duree} {t('common.min')}
                  </p>
                  {s.membres_jury?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('coordinateur.jury_prefix')}{s.membres_jury.map((m) => `${m.prenom} ${m.nom}`).join(', ')}
                    </p>
                  )}
                  {s.note_finale != null && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: s.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                      {t('coordinateur.note_finale', { note: s.note_finale })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {s.statut === 'PLANIFIEE' && (
                    <button onClick={() => { setJuryTarget(s); setSelectedJury(s.membres_jury?.map((m) => m.id) ?? []); setSelectedPresident(s.president_jury?.id ?? null) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
                      {t('coordinateur.jury_btn')}
                    </button>
                  )}
                  {s.statut === 'TERMINEE' && s.note_finale == null && (
                    <button onClick={() => noteMut.mutate(s.id)} disabled={noteMut.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: '#0ea5e9' }}>
                      {t('coordinateur.calculer')}
                    </button>
                  )}
                  {s.statut === 'TERMINEE' && s.note_finale != null && (
                    <div className="flex gap-1.5 flex-wrap">
                      <PVButton soutenanceId={s.id} />
                      <ReleveButton soutenanceId={s.id} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
