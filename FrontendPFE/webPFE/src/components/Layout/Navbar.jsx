import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useNotifStore } from '../../store/notifStore'
import { useAuth } from '../../hooks/useAuth'

function Avatar({ prenom, nom }) {
  const initials = `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)' }}
    >
      {initials || 'U'}
    </div>
  )
}

export default function Navbar({ onToggleSidebar }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { unreadCount } = useNotifStore()
  const { logout } = useAuth()
  const [showUser, setShowUser] = useState(false)

  const isAr = i18n.language === 'ar'

  const toggleLang = () => i18n.changeLanguage(isAr ? 'fr' : 'ar')

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
      style={{
        backgroundColor: '#1e3a5f',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-white/70 p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition lg:hidden"
          aria-label="Menu"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: '#fff', padding: '2px' }}>
            <img
              src="/logo-iscae.png"
              alt="ISCAE"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold text-sm tracking-wide">GestionPFE</span>
            <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(45,184,75,0.2)', color: '#6ee87a' }}>
              ISCAE
            </span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition hover:bg-white/10"
          style={{ color: isAr ? '#fbbf24' : '#93c5fd' }}
          title={isAr ? 'Passer au français' : 'التبديل إلى العربية'}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
          {isAr ? 'FR' : 'ع'}
        </button>

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

        {/* Bell */}
        <button
          className="relative text-white/70 p-2 rounded-lg hover:bg-white/10 hover:text-white transition"
          aria-label={t('nav.notifications')}
        >
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center"
              style={{ backgroundColor: '#ef4444', boxShadow: '0 0 0 2px #1e3a5f' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

        {/* User */}
        <div className="relative">
          <button
            onClick={() => setShowUser((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/10 transition"
          >
            <Avatar prenom={user?.prenom} nom={user?.nom} />
            <div className="hidden sm:block text-left">
              <p className="text-white text-xs font-semibold leading-tight">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: '#7fb3d3' }}>
                {t(`roles.${user?.role}`, { defaultValue: user?.role })}
              </p>
            </div>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"
                 viewBox="0 0 24 24" className="text-white/40 hidden sm:block">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showUser && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
              <div
                className="absolute end-0 top-full mt-2 z-50 w-44 rounded-xl border border-white/10 overflow-hidden"
                style={{ backgroundColor: '#152c4a', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-white text-xs font-semibold">{user?.prenom} {user?.nom}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: '#7fb3d3' }}>{user?.email}</p>
                </div>
                <button
                  onClick={() => { setShowUser(false); logout() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition hover:bg-white/5"
                  style={{ color: '#f87171' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
                    <polyline points="16 17 21 12 16 7" strokeLinecap="round" />
                    <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
                  </svg>
                  {t('common.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
