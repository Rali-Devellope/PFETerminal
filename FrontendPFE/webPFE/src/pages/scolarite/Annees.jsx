import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import { getAnnees, creerAnnee, ouvrirAnnee, fermerAnnee } from '../../api/pfe'
import { SCOLARITE_NAV_ITEMS } from './_nav'

function NavIcon({ d }) {
  return <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={d} /></svg>
}

export default function ScolariteAnnees() {
  const { t }  = useTranslation()
  const qc     = useQueryClient()

  const NAV_ITEMS = SCOLARITE_NAV_ITEMS.map((item) => ({ ...item, icon: <NavIcon d={item.iconPath} /> }))

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ libelle: '', date_debut: '', date_fin: '' })
  const [error, setError]       = useState('')

  const { data: anneesRes, isLoading } = useQuery({ queryKey: ['annees-list'], queryFn: getAnnees })
  const anneesArr = (() => { const r = anneesRes?.data?.results ?? anneesRes?.data?.data ?? anneesRes?.data ?? []; return Array.isArray(r) ? r : [] })()

  const creerMut = useMutation({
    mutationFn: creerAnnee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annees-list'] })
      qc.invalidateQueries({ queryKey: ['annee-active'] })
      setShowForm(false)
      setForm({ libelle: '', date_debut: '', date_fin: '' })
      setError('')
    },
    onError: (e) => setError(e.response?.data?.error?.message ?? 'Erreur lors de la création'),
  })

  const ouvrirMut = useMutation({
    mutationFn: ouvrirAnnee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['annees-list'] }); qc.invalidateQueries({ queryKey: ['annee-active'] }) },
  })

  const fermerMut = useMutation({
    mutationFn: fermerAnnee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['annees-list'] }); qc.invalidateQueries({ queryKey: ['annee-active'] }) },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.libelle || !form.date_debut || !form.date_fin) { setError('Remplissez tous les champs'); return }
    setError('')
    creerMut.mutate(form)
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Années académiques</h1>
          <p className="text-sm text-gray-500 mt-1">Création et gestion du calendrier universitaire</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: showForm ? '#6b7280' : 'linear-gradient(135deg, #1a2744, #2d4a8a)', boxShadow: '0 4px 12px rgba(26,39,68,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showForm ? <line x1="18" y1="6" x2="6" y2="18"/> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {showForm ? 'Annuler' : 'Nouvelle année'}
        </button>
      </div>

      {showForm && (
        <Card className="mb-5" title="Créer une nouvelle année académique"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-4">
            {[
              { key: 'libelle',    label: 'Libellé *',       ph: 'ex : 2025-2026', type: 'text' },
              { key: 'date_debut', label: 'Date de début *', ph: '',                type: 'date' },
              { key: 'date_fin',   label: 'Date de fin *',   ph: '',                type: 'date' },
            ].map(({ key, label, ph, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
                <input type={type} value={form[key]} placeholder={ph}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.target.style.borderColor = '#1a2744')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" disabled={creerMut.isPending}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: creerMut.isPending ? 0.7 : 1 }}>
                {creerMut.isPending ? 'Création...' : 'Créer l\'année'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Années académiques (${anneesArr.length})`}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
        {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}</div>}
        {!isLoading && anneesArr.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">Aucune année académique. Créez-en une ci-dessus.</p>
        )}
        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {anneesArr.map((a) => (
              <div key={a.id} className="py-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: a.active ? '#dcfce7' : '#f1f5f9' }}>
                  <svg width="18" height="18" fill="none" stroke={a.active ? '#15803d' : '#94a3b8'} strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold" style={{ color: '#1a2744' }}>{a.libelle}</span>
                    {a.active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>● ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(a.date_debut).toLocaleDateString('fr-FR')} — {new Date(a.date_fin).toLocaleDateString('fr-FR')}
                    {a.date_limite_soutenance && (
                      <span className="ml-2" style={{ color: '#7e22ce' }}>
                        · Limite soutenance : {new Date(a.date_limite_soutenance).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!a.active && (
                    <button onClick={() => ouvrirMut.mutate(a.id)} disabled={ouvrirMut.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      Activer
                    </button>
                  )}
                  {a.active && (
                    <button
                      onClick={() => { if (window.confirm('Fermer l\'année académique active ?')) fermerMut.mutate() }}
                      disabled={fermerMut.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                      Fermer l'année
                    </button>
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
