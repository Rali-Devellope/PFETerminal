import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      const msg = err.response?.data?.error?.message
        ?? err.response?.data?.message
        ?? err.response?.data?.detail
        ?? 'Email ou mot de passe incorrect'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f1f5f9' }}>
      {/* Panneau gauche — branding */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a2744 0%, #1e3a5f 50%, #14507a 100%)' }}
      >
        {/* Motif décoratif */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #2db84b, transparent)' }} />
          <div className="absolute bottom-16 -left-16 w-72 h-72 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #2db84b, transparent)' }} />
          <svg className="absolute top-0 left-0 w-full h-full opacity-5" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx={50 + i * 50} cy={300} r={80 + i * 30}
                      fill="none" stroke="white" strokeWidth="1" />
            ))}
          </svg>
        </div>

        <div className="relative flex flex-col justify-between h-full p-12 z-10">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black"
                style={{ backgroundColor: '#2db84b', color: '#fff' }}
              >
                I
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-wide">ISCAE</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#7fb3d3' }}>
              Institut Supérieur de Comptabilité<br />et d&apos;Administration des Entreprises
            </p>
          </div>

          {/* Message central */}
          <div>
            <div className="w-10 h-1 rounded-full mb-5" style={{ backgroundColor: '#2db84b' }} />
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Gestion des<br />
              <span style={{ color: '#4ade80' }}>Projets</span> de<br />
              Fin d&apos;Études
            </h1>
            <p style={{ color: '#7fb3d3' }} className="text-sm leading-relaxed max-w-xs">
              Plateforme de suivi des PFE — dépôt des livrables,
              planification des soutenances et notation.
            </p>

            {/* Features */}
            <div className="mt-8 space-y-3">
              {[
                'Suivi en temps réel de votre PFE',
                'Dépôt sécurisé des livrables',
                'Résultats et notes instantanés',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: 'rgba(45,184,75,0.2)' }}>
                    <svg width="10" height="10" fill="none" stroke="#4ade80" strokeWidth="3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-sm" style={{ color: '#a0c4d8' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: '#4a6a7a' }}>
            © {new Date().getFullYear()} ISCAE Mauritanie
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="inline-flex w-12 h-12 rounded-xl items-center justify-center text-lg font-black text-white mb-3"
              style={{ backgroundColor: '#2db84b' }}
            >
              I
            </div>
            <p className="text-xl font-black" style={{ color: '#1a2744' }}>ISCAE</p>
            <p className="text-xs text-gray-500">Gestion des PFE</p>
          </div>

          {/* Card formulaire */}
          <div className="bg-white rounded-3xl p-8"
               style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-black" style={{ color: '#1a2744' }}>Connexion</h2>
              <p className="text-sm text-gray-400 mt-1">Connectez-vous à votre espace ISCAE</p>
            </div>

            {error && (
              <div
                className="flex items-start gap-3 mb-5 px-4 py-3.5 rounded-2xl text-sm"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <svg width="15" height="15" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ color: '#b91c1c' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold mb-2 tracking-wide uppercase" style={{ color: '#6b7280' }}>
                  Email
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" width="15" height="15"
                       fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@iscae.mr"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                    style={{ border: '1.5px solid #e5e7eb', color: '#1a2744', backgroundColor: '#fafafa' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2db84b'; e.target.style.backgroundColor = '#fff' }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#fafafa' }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-bold mb-2 tracking-wide uppercase" style={{ color: '#6b7280' }}>
                  Mot de passe
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" width="15" height="15"
                       fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition"
                    style={{ border: '1.5px solid #e5e7eb', color: '#1a2744', backgroundColor: '#fafafa' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2db84b'; e.target.style.backgroundColor = '#fff' }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#fafafa' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPwd ? (
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all duration-200 mt-2"
                style={{
                  background: loading
                    ? 'linear-gradient(135deg, #86c99a, #6dbf82)'
                    : 'linear-gradient(135deg, #2db84b, #1e8c36)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(45,184,75,0.35)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Problème de connexion ?{' '}
            <a href="mailto:contact@iscae.mr" className="font-medium" style={{ color: '#2db84b' }}>
              contact@iscae.mr
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
