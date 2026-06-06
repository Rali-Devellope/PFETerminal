import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ROLE_DASHBOARDS = {
  etudiant:       '/etudiant',
  encadrant_acad: '/encadrant',
  encadrant_entr: '/encadrant',
  coordinateur:   '/coordinateur',
  jury:           '/jury',
  scolarite:      '/scolarite',
  admin:          '/admin',
}

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.is_first_login) {
    return <Navigate to="/change-password" replace />
  }

  if (roles && !roles.includes(user?.role)) {
    const home = ROLE_DASHBOARDS[user?.role] ?? '/login'
    return <Navigate to={home} replace />
  }

  return children
}

export { ROLE_DASHBOARDS }
