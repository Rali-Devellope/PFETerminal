import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import { ROLE_DASHBOARDS } from '../components/ProtectedRoute'
import queryClient from '../queryClient'

export function useAuth() {
  const navigate = useNavigate()
  const { setAuth, logout: clearAuth, user, refreshToken } = useAuthStore()

  const login = async (email, password) => {
    queryClient.clear()
    const { data } = await apiLogin(email, password)
    const { user, access, refresh } = data.data
    setAuth(user, access, refresh)

    if (user.is_first_login) {
      navigate('/change-password', { replace: true })
    } else {
      const dest = ROLE_DASHBOARDS[user.role] ?? '/login'
      navigate(dest, { replace: true })
    }
  }

  const logout = async () => {
    try {
      if (refreshToken) await apiLogout(refreshToken)
    } finally {
      queryClient.clear()
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  return { login, logout, user }
}
