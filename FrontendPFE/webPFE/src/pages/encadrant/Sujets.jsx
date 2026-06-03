import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSujets, createSujet } from '../../api/sujets'
import { getUsers } from '../../api/auth'

const INIT_FORM = {
  titre: '', description: '', origine: 'academique',
  filiere: '', annee: new Date().getFullYear(), etudiant_cible: '',
}

export default function EncadrantSujets() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INIT_FORM)
  const [formError, setFormError] = useState('')

  const NAV_ITEMS = [
    { to: '/encadrant', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/encadrant/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: sujetsRes, isLoading } = useQuery({
    queryKey: ['sujets-encadrant'],
    queryFn: () => getSujets(),
  })
  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: showForm,
  })

  const sujets = sujetsRes?.data?.results ?? sujetsRes?.data?.data ?? []
  const sujetsArr = Array.isArray(sujets) ? sujets : []

  const users = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const etudiants = Array.isArray(users) ? users.filter((u) => u.role === 'etudiant') : []

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
      setFormError(d?.error?.message ?? d?.detail ?? JSON.stringify(d) ?? 'Erreur')
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

  const field = (label, child) => (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
      {child}
    </div>
  )

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white"
  const inputStyle = { borderColor: '#e5e7eb' }
  const onFocus = (e) => (e.target.style.borderColor = '#2db84b')
  const onBlur = (e) => (e.target.style.borderColor = '#e5e7eb')

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('nav.sujets')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('coordinateur.sujets_sub')}</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showForm ? <line x1="18" y1="6" x2="6" y2="18"/> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {showForm ? t('sujet_form.cancel') : t('sujet_form.proposer_btn')}
        </button>
      </div>

      {showForm && (
        <Card title={t('sujet_form.title_encadrant')} className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
          <form onSubmit={handleProposer} className="grid sm:grid-cols-2 gap-4">
            {formError && (
              <div className="sm:col-span-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                {formError}
              </div>
            )}

            {field(t('sujet_form.etudiant'),
              <select value={form.etudiant_cible} onChange={(e) => setForm({ ...form, etudiant_cible: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="">{t('sujet_form.select_etudiant')}</option>
                {etudiants.map((u) => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom} — {u.email}</option>
                ))}
              </select>
            )}

            {field(t('sujet_form.origine'),
              <select value={form.origine} onChange={(e) => setForm({ ...form, origine: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="academique">{t('sujet_form.academique')}</option>
                <option value="entreprise">{t('sujet_form.entreprise')}</option>
              </select>
            )}

            {field(t('sujet_form.titre'),
              <input type="text" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder={t('sujet_form.titre_ph')} className={`${inputCls} sm:col-span-2`} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur} />
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('sujet_form.description_ph')} rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none" style={inputStyle}
                onFocus={onFocus} onBlur={onBlur} />
            </div>

            {field(t('sujet_form.filiere'),
              <input type="text" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                placeholder={t('sujet_form.filiere_ph')} className={inputCls} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur} />
            )}

            {field(t('sujet_form.annee'),
              <input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })}
                min="2020" max="2100" className={inputCls} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur} />
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={proposerMut.isPending}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: proposerMut.isPending ? 0.7 : 1 }}>
                {proposerMut.isPending ? t('sujet_form.submitting') : t('sujet_form.submit')}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={t('sujet_form.my_proposals', { count: sujetsArr.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}>
        {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}</div>}
        {!isLoading && sujetsArr.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">{t('sujet_form.no_proposals')}</p>
        )}
        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {sujetsArr.map((s) => (
              <div key={s.id} className="py-4 flex items-start gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: s.origine === 'entreprise' ? '#fff7ed' : '#f0fdf4' }}>
                  <svg width="18" height="18" fill="none" stroke={s.origine === 'entreprise' ? '#f97316' : '#2db84b'}
                       strokeWidth="2" viewBox="0 0 24 24">
                    {s.origine === 'entreprise'
                      ? <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>
                      : <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>
                    }
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{s.titre}</span>
                    <Badge statut={s.statut} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-0.5">{s.description}</p>
                  <p className="text-xs text-gray-400">
                    {s.filiere} · {s.annee}
                    {s.etudiant && ` · ${s.etudiant.prenom} ${s.etudiant.nom}`}
                  </p>
                  {s.motif_refus && (
                    <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>
                      {t('sujet_form.motif')} : {s.motif_refus}
                    </p>
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
