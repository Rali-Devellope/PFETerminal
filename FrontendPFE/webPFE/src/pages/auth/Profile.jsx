import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { useFilieres } from '../../hooks/useFilieres'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const { filieres: filieresData } = useFilieres()
  const [form, setForm] = useState({
    prenom:    user?.prenom    ?? '',
    nom:       user?.nom       ?? '',
    telephone: user?.telephone ?? '',
    filiere:   user?.filiere   ?? '',
    matricule: user?.matricule ?? '',
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const updateMut = useMutation({
    mutationFn: async (data) => {
      const api = (await import('../../api/axios')).default
      return api.put('/auth/me/', data)
    },
    onSuccess: ({ data }) => {
      const updated = data?.data ?? data
      const updatedUser = { ...user, prenom: updated.prenom, nom: updated.nom, telephone: updated.telephone, filiere: updated.filiere, matricule: updated.matricule }
      setAuth(updatedUser, accessToken, refreshToken)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (e) => setError(e.response?.data?.error?.message ?? 'Erreur lors de la mise à jour'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom) { setError('Prénom et nom sont obligatoires'); return }
    setError('')
    updateMut.mutate(form)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f1f5f9' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(ROLE_DASHBOARDS[user?.role] ?? '/login')}
            className="p-2 rounded-xl hover:bg-gray-200 transition" style={{ color: '#6b7280' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>Mon profil</h1>
            <p className="text-xs text-gray-400">{t(`roles.${user?.role}`, { defaultValue: user?.role })}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-50">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                 style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)' }}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: '#1a2744' }}>{user?.prenom} {user?.nom}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
              ✓ Profil mis à jour avec succès
            </div>
          )}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'prenom', label: 'Prénom *' },
              { key: 'nom',    label: 'Nom *' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
                <input type="text" value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition"
                  style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">Email</label>
              <input type="email" value={user?.email ?? ''} readOnly
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb', color: '#9ca3af' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">Téléphone</label>
              <input type="text" value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="+222 XX XX XX XX"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition"
                style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>

            {user?.role === 'etudiant' && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">Filière</label>
                  <select value={form.filiere}
                    onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition bg-white"
                    style={{ borderColor: '#e5e7eb', color: form.filiere ? '#1a2744' : '#9ca3af' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}>
                    <option value="">Sélectionner une filière</option>
                    {filieresData.map((f) => (
                      <option key={f.id} value={f.libelle}>{f.libelle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">Matricule</label>
                  <input type="text" value={form.matricule}
                    onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                    placeholder="ex : 2024-INF-001"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition"
                    style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
              </>
            )}

            <button type="submit" disabled={updateMut.isPending}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition mt-2"
              style={{
                background: updateMut.isPending ? 'linear-gradient(135deg, #86c99a, #6dbf82)' : 'linear-gradient(135deg, #2db84b, #1e8c36)',
                boxShadow: updateMut.isPending ? 'none' : '0 4px 16px rgba(45,184,75,0.35)',
              }}>
              {updateMut.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-50">
            <button onClick={() => navigate('/change-password')}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition hover:bg-gray-50"
              style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}>
              Changer le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
