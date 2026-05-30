import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { changePassword } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'

export default function ChangePassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm) {
      setError(t('change_password.mismatch'))
      return
    }
    setLoading(true)
    try {
      await changePassword({ old_password: form.old_password, new_password: form.new_password })
      const updatedUser = { ...user, is_first_login: false }
      setAuth(updatedUser, accessToken, refreshToken)
      navigate(ROLE_DASHBOARDS[user?.role] ?? '/login', { replace: true })
    } catch (err) {
      const data = err.response?.data
      setError(data?.message ?? data?.old_password?.[0] ?? 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { name: 'old_password', label: t('change_password.old') },
    { name: 'new_password', label: t('change_password.new') },
    { name: 'confirm',      label: t('change_password.confirm_field') },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                 style={{ borderColor: '#2db84b' }}>
              <span className="text-sm font-extrabold" style={{ color: '#2db84b' }}>I</span>
            </div>
            <span className="text-xl font-extrabold" style={{ color: '#1e3a5f' }}>ISCAE</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                 style={{ backgroundColor: '#edfaf1' }}>
              <span className="text-xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#1a2744' }}>
              {t('change_password.title')}
            </h2>
            <p className="text-sm text-gray-500">{t('change_password.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm"
                 style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(({ name, label }) => (
              <div key={name}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  {label}
                </label>
                <input
                  type="password" name={name} value={form[name]}
                  onChange={handleChange} placeholder="••••••••" required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition"
                  style={{ border: '1.5px solid #d1d5db', color: '#1a2744' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition"
              style={{ backgroundColor: loading ? '#86c99a' : '#2db84b', cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#1e8c36' }}
              onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#2db84b' }}
            >
              {loading ? t('change_password.loading') : t('change_password.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
