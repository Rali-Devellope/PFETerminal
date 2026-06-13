import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import { createUser } from '../../api/auth'
import { useFilieres } from '../../hooks/useFilieres'
import { SCOLARITE_NAV_ITEMS } from './_nav'

function NavIcon({ d }) {
  return <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={d} /></svg>
}

export default function ScolariteEtudiants() {
  const { t } = useTranslation()

  const NAV_ITEMS = SCOLARITE_NAV_ITEMS.map((item) => ({ ...item, icon: <NavIcon d={item.iconPath} /> }))

  const { filieres: filieresData } = useFilieres({ activeOnly: false })

  const [form, setForm]       = useState({ prenom: '', nom: '', email: '', password: '', filiere: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const mut = useMutation({
    mutationFn: (data) => createUser({ ...data, role: 'etudiant' }),
    onSuccess: () => {
      setSuccess('Compte étudiant créé. Les identifiants ont été envoyés par email.')
      setForm({ prenom: '', nom: '', email: '', password: '', filiere: '' })
      setError('')
      setTimeout(() => setSuccess(''), 5000)
    },
    onError: (e) => {
      const err = e.response?.data
      setError(err?.error?.message ?? err?.email?.[0] ?? 'Erreur lors de la création')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.email || !form.password) {
      setError('Remplissez tous les champs obligatoires'); return
    }
    setError('')
    mut.mutate(form)
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Inscrire un étudiant</h1>
        <p className="text-sm text-gray-500 mt-1">Créer un compte étudiant dans le système</p>
      </div>

      <Card title="Nouveau compte étudiant"
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}>

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          {[
            { key: 'prenom',   label: 'Prénom *',          ph: 'Prénom',                 type: 'text'     },
            { key: 'nom',      label: 'Nom *',             ph: 'Nom de famille',          type: 'text'     },
            { key: 'email',    label: 'Email @iscae.mr *', ph: 'etudiant@iscae.mr',       type: 'email'    },
            { key: 'password', label: 'Mot de passe *',    ph: 'Mot de passe temporaire', type: 'password' },
          ].map(({ key, label, ph, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
              <input type={type} value={form[key]} placeholder={ph}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-gray-600">Filière</label>
            <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}>
              <option value="">— Sélectionner une filière —</option>
              {filieresData.map((f) => (
                <option key={f.id} value={f.libelle}>{f.libelle}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={mut.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', opacity: mut.isPending ? 0.7 : 1 }}>
              {mut.isPending ? 'Création...' : 'Créer le compte étudiant'}
            </button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  )
}
