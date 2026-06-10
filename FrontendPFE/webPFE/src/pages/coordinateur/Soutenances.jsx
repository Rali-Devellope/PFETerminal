import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSoutenances, planifierSoutenance, affecterJury, calculerNoteFinale, telechargerPlanning } from '../../api/soutenances'
import { getPFEs } from '../../api/pfe'
import { getUsers } from '../../api/auth'
import { PVButton, ReleveButton } from '../../components/UI/PdfButtons'

const INIT_FORM = { pfe: '', date: '', salle: '', duree: 60 }

export default function CoordinateurSoutenances() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INIT_FORM)
  const [juryTarget, setJuryTarget] = useState(null)
  const [selectedJury, setSelectedJury] = useState([])
  const [formError, setFormError] = useState('')

  const NAV_ITEMS = [
    { to: '/coordinateur', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/coordinateur/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { to: '/coordinateur/soutenances', label: t('nav.soutenances'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: soutRes, isLoading } = useQuery({ queryKey: ['soutenances'], queryFn: () => getSoutenances() })
  const { data: pfeRes } = useQuery({ queryKey: ['pfe-list'], queryFn: () => getPFEs(), enabled: showForm })
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => getUsers(), enabled: !!juryTarget })

  const soutenances = soutRes?.data?.results ?? soutRes?.data?.data ?? []
  const soutsArr = Array.isArray(soutenances) ? soutenances : []
  const pfes = pfeRes?.data?.results ?? pfeRes?.data?.data ?? []
  const pfesArr = Array.isArray(pfes) ? pfes : []
  const users = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const juryUsers = Array.isArray(users) ? users.filter((u) => u.role === 'jury') : []

  const planifierMut = useMutation({
    mutationFn: planifierSoutenance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soutenances'] }); setShowForm(false); setForm(INIT_FORM); setFormError('') },
    onError: (e) => setFormError(e.response?.data?.error?.message ?? 'Erreur lors de la planification'),
  })

  const juryMut = useMutation({
    mutationFn: ({ id, jury_ids }) => affecterJury(id, { jury_ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soutenances'] }); setJuryTarget(null); setSelectedJury([]) },
  })

  const noteMut = useMutation({
    mutationFn: calculerNoteFinale,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soutenances'] }),
  })

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

      {showForm && (
        <Card title={t('coordinateur.new_sout_title')} className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
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
                      {pret ? '✅' : '⚠️'} {p.etudiant?.prenom} {p.etudiant?.nom} — {p.sujet?.titre?.slice(0, 25)}
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
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
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
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{u.prenom} {u.nom}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setJuryTarget(null); setSelectedJury([]) }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                {t('common.cancel')}
              </button>
              <button onClick={() => juryMut.mutate({ id: juryTarget.id, jury_ids: selectedJury })}
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
                    <button onClick={() => { setJuryTarget(s); setSelectedJury(s.membres_jury?.map((m) => m.id) ?? []) }}
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
