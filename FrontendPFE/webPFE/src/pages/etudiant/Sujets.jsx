import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSujets, choisirSujet, createSujet } from '../../api/sujets'
import { useFilieres } from '../../hooks/useFilieres'

const INIT_FORM = { titre: '', description: '', origine: 'academique', filiere: '', annee: new Date().getFullYear(), confidentiel: false }

export default function EtudiantSujets() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { filieres: filieresData } = useFilieres()

  const [search, setSearch] = useState('')
  const [filiere, setFiliere] = useState('')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INIT_FORM)
  const [formError, setFormError] = useState('')

  const NAV_ITEMS = [
    { to: '/etudiant', end: true, label: t('nav.mon_pfe'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { to: '/etudiant/sujets', label: t('nav.sujets_dispo'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/etudiant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { to: '/etudiant/soutenance', label: t('nav.ma_soutenance'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['sujets-etudiant'],
    queryFn: () => getSujets(),
  })

  const sujets = data?.data?.results ?? data?.data?.data ?? []
  const sujetsArr = Array.isArray(sujets) ? sujets : []

  const filtered = sujetsArr.filter((s) => {
    const matchSearch = !search || s.titre?.toLowerCase().includes(search.toLowerCase())
      || s.description?.toLowerCase().includes(search.toLowerCase())
    const matchFiliere = !filiere || s.filiere === filiere
    return matchSearch && matchFiliere
  })

  const proposerMut = useMutation({
    mutationFn: (data) => createSujet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sujets-etudiant'] })
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
    if (!form.titre || !form.description || !form.filiere || !form.annee) {
      setFormError('Remplissez tous les champs obligatoires')
      return
    }
    setFormError('')
    proposerMut.mutate({ ...form, annee: parseInt(form.annee) })
  }

  const choisirMut = useMutation({
    mutationFn: (id) => choisirSujet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sujets-etudiant'] })
      qc.invalidateQueries({ queryKey: ['mon-pfe'] })
      setConfirmTarget(null)
      setErrorMsg('')
    },
    onError: (e) => {
      setErrorMsg(e.response?.data?.error?.message ?? e.response?.data?.detail ?? 'Erreur')
    },
  })

  const getSujetTag = (s) => {
    if (s.propose_par?.id === user?.id) return { label: t('etudiant.sujets_my_proposal'), color: '#3b82f6' }
    if (s.etudiant_cible?.id === user?.id) return { label: t('etudiant.sujets_proposed_for_me'), color: '#8b5cf6' }
    return { label: t('etudiant.sujets_available'), color: '#2db84b' }
  }

  const canChoose = (s) =>
    s.statut === 'VALIDE' &&
    s.propose_par?.id !== user?.id &&
    (!s.etudiant_cible || s.etudiant_cible?.id === user?.id)

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('etudiant.sujets_page_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('etudiant.sujets_page_sub')}</p>
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

      {/* Formulaire proposition */}
      {showForm && (
        <Card title={t('sujet_form.title_etudiant')} className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
          <form onSubmit={handleProposer} className="grid sm:grid-cols-2 gap-4">
            {formError && (
              <div className="sm:col-span-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                {formError}
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.titre')}</label>
              <input type="text" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder={t('sujet_form.titre_ph')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('sujet_form.description_ph')} rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.origine')}</label>
              <select value={form.origine} onChange={(e) => setForm({ ...form, origine: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
                <option value="academique">{t('sujet_form.academique')}</option>
                <option value="entreprise">{t('sujet_form.entreprise')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.filiere')}</label>
              <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white"
                style={{ borderColor: '#e5e7eb', color: form.filiere ? '#1a2744' : '#9ca3af' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}>
                <option value="">{t('sujet_form.filiere_ph') || 'Sélectionner une filière'}</option>
                {filieresData.map((f) => (
                  <option key={f.id} value={f.libelle}>{f.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('sujet_form.annee')}</label>
              <input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })}
                min="2020" max="2100"
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.confidentiel}
                  onChange={(e) => setForm({ ...form, confidentiel: e.target.checked })}
                  className="w-4 h-4 rounded accent-orange-500" />
                <span className="text-xs font-semibold" style={{ color: '#c2410c' }}>
                  🔒 Sujet confidentiel (entreprise)
                </span>
              </label>
              <button type="submit" disabled={proposerMut.isPending}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: proposerMut.isPending ? 0.7 : 1 }}>
                {proposerMut.isPending ? t('sujet_form.submitting') : t('sujet_form.submit')}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14"
               fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('etudiant.sujets_search')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}
            onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
        <select
          value={filiere} onChange={(e) => setFiliere(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border outline-none bg-white"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">{t('etudiant.sujets_all_filieres')}</option>
          {filieresData.map((f) => <option key={f.id} value={f.libelle}>{f.libelle}</option>)}
        </select>
      </div>

      <Card
        title={t('etudiant.sujets_count', { count: filtered.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
      >
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">{t('etudiant.sujets_none')}</p>
        )}

        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {filtered.map((s) => {
              const tag = getSujetTag(s)
              return (
                <div key={s.id} className="py-4 flex items-start gap-4 flex-wrap">
                  {/* Icône origine */}
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
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{s.titre}</span>
                      <Badge statut={s.statut} />
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: tag.color + '18', color: tag.color }}>
                        {tag.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">{s.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400">{s.filiere} · {s.annee}</span>
                      {s.propose_par && (
                        <span className="text-xs text-gray-400">
                          {t('etudiant.sujets_proposer')} : {s.propose_par.prenom} {s.propose_par.nom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {canChoose(s) && (
                    <button
                      onClick={() => { setConfirmTarget(s); setErrorMsg('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)' }}
                    >
                      {t('etudiant.sujets_choisir')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modal confirmation */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                 style={{ backgroundColor: '#f0fdf4' }}>
              <svg width="22" height="22" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>
              {t('etudiant.sujets_confirm_title')}
            </h3>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a2744' }}>{confirmTarget.titre}</p>
            <p className="text-sm text-gray-500 mb-4">{t('etudiant.sujets_confirm_msg')}</p>

            {errorMsg && (
              <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmTarget(null); setErrorMsg('') }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => choisirMut.mutate(confirmTarget.id)}
                disabled={choisirMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #2db84b, #1e8c36)',
                  opacity: choisirMut.isPending ? 0.7 : 1,
                }}
              >
                {choisirMut.isPending ? t('etudiant.sujets_confirming') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
